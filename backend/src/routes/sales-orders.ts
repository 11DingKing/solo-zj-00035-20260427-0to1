import { Router, Response } from "express";
import { AppDataSource } from "../db/data-source";
import { SalesOrder, SalesOrderItem, SalesOrderStatus } from "../entities/SalesOrder";
import { Warehouse, Inventory, InventoryTransactionType } from "../entities/Inventory";
import { Product } from "../entities/Product";
import { AccountsReceivable, PaymentStatus } from "../entities/Finance";
import { authenticateJWT, AuthRequest, requireWarehouseManager, requireAdmin } from "../middleware/auth";
import { generateSalesOrderNo, generateAccountsReceivableVoucherNo } from "../utils/order-number";
import { updateInventory } from "./inventory";
import { body, param, validationResult } from "express-validator";
import { In } from "typeorm";

const router = Router();

router.get("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { status, warehouseId, customerName, startDate, endDate, keyword, page = 1, pageSize = 20 } = req.query;
    
    const salesOrderRepository = AppDataSource.getRepository(SalesOrder);
    const queryBuilder = salesOrderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.warehouse", "warehouse")
      .leftJoinAndSelect("order.createdBy", "createdBy")
      .leftJoinAndSelect("order.items", "items")
      .leftJoinAndSelect("items.product", "product");

    if (status) {
      queryBuilder.andWhere("order.status = :status", { status });
    }

    if (warehouseId) {
      queryBuilder.andWhere("order.warehouseId = :warehouseId", { warehouseId });
    }

    if (customerName) {
      queryBuilder.andWhere("order.customerName LIKE :customerName", { customerName: `%${customerName}%` });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere("order.createdAt BETWEEN :startDate AND :endDate", {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      });
    }

    if (keyword) {
      queryBuilder.andWhere(
        "order.orderNo LIKE :keyword OR order.customerName LIKE :keyword",
        { keyword: `%${keyword}%` }
      );
    }

    const total = await queryBuilder.getCount();
    const orders = await queryBuilder
      .orderBy("order.createdAt", "DESC")
      .skip((parseInt(page as string) - 1) * parseInt(pageSize as string))
      .take(parseInt(pageSize as string))
      .getMany();

    res.json({
      data: orders,
      total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    });
  } catch (error) {
    console.error("Get sales orders error:", error);
    res.status(500).json({ error: "获取销售订单列表失败" });
  }
});

router.get("/:id", authenticateJWT, [
  param("id").isUUID().withMessage("无效的订单ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const salesOrderRepository = AppDataSource.getRepository(SalesOrder);
    const order = await salesOrderRepository.findOne({
      where: { id: req.params.id },
      relations: [
        "warehouse", 
        "createdBy", 
        "approvedBy", 
        "shippedBy",
        "items",
        "items.product"
      ],
    });

    if (!order) {
      return res.status(404).json({ error: "销售订单不存在" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get sales order error:", error);
    res.status(500).json({ error: "获取销售订单信息失败" });
  }
});

router.post("/", authenticateJWT, [
  body("customerName").notEmpty().withMessage("客户名称不能为空"),
  body("warehouseId").isUUID().withMessage("无效的仓库ID"),
  body("items").isArray().withMessage("商品列表不能为空"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user) {
      return res.status(401).json({ error: "未授权" });
    }

    const { customerName, customerPhone, customerAddress, warehouseId, items, remark } = req.body;

    const salesOrderRepository = AppDataSource.getRepository(SalesOrder);
    const salesOrderItemRepository = AppDataSource.getRepository(SalesOrderItem);
    const warehouseRepository = AppDataSource.getRepository(Warehouse);
    const productRepository = AppDataSource.getRepository(Product);
    const inventoryRepository = AppDataSource.getRepository(Inventory);

    const warehouse = await warehouseRepository.findOneBy({ id: warehouseId });
    if (!warehouse) {
      return res.status(404).json({ error: "仓库不存在" });
    }

    const productIds = items.map((item: any) => item.productId);
    const products = await productRepository.findBy({ id: In(productIds) });
    const productMap = new Map(products.map(p => [p.id, p]));

    for (const item of items) {
      if (!productMap.has(item.productId)) {
        return res.status(404).json({ error: `商品不存在: ${item.productId}` });
      }

      const inventory = await inventoryRepository.findOne({
        where: {
          warehouse: { id: warehouseId },
          product: { id: item.productId }
        }
      });

      if (!inventory || inventory.quantity < item.quantity) {
        const product = productMap.get(item.productId)!;
        const currentQty = inventory ? inventory.quantity : 0;
        return res.status(400).json({ 
          error: `商品 ${product.name} 库存不足，当前库存: ${currentQty}, 需要: ${item.quantity}` 
        });
      }
    }

    const orderNo = await generateSalesOrderNo();

    let totalAmount = 0;
    const orderItems: SalesOrderItem[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId)!;
      const amount = item.quantity * item.unitPrice;
      totalAmount += amount;

      const orderItem = salesOrderItemRepository.create({
        product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        shippedQuantity: 0,
        amount,
      });
      orderItems.push(orderItem);
    }

    const order = salesOrderRepository.create({
      orderNo,
      customerName,
      customerPhone,
      customerAddress,
      warehouse,
      status: SalesOrderStatus.DRAFT,
      totalAmount,
      remark,
      createdBy: req.user,
      items: orderItems,
    });

    await salesOrderRepository.save(order);

    res.json({
      message: "销售订单创建成功",
      order,
    });
  } catch (error) {
    console.error("Create sales order error:", error);
    res.status(500).json({ error: "创建销售订单失败" });
  }
});

router.post("/:id/submit", authenticateJWT, [
  param("id").isUUID().withMessage("无效的订单ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const salesOrderRepository = AppDataSource.getRepository(SalesOrder);
    const order = await salesOrderRepository.findOne({
      where: { id: req.params.id },
      relations: ["items"],
    });

    if (!order) {
      return res.status(404).json({ error: "销售订单不存在" });
    }

    if (order.status !== SalesOrderStatus.DRAFT) {
      return res.status(400).json({ error: "只有草稿状态的订单可以提交" });
    }

    order.status = SalesOrderStatus.PENDING_APPROVAL;
    await salesOrderRepository.save(order);

    res.json({
      message: "销售订单提交成功，等待审批",
      order,
    });
  } catch (error) {
    console.error("Submit sales order error:", error);
    res.status(500).json({ error: "提交销售订单失败" });
  }
});

router.post("/:id/approve", authenticateJWT, requireAdmin, [
  param("id").isUUID().withMessage("无效的订单ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user) {
      return res.status(401).json({ error: "未授权" });
    }

    const salesOrderRepository = AppDataSource.getRepository(SalesOrder);
    const order = await salesOrderRepository.findOneBy({ id: req.params.id });

    if (!order) {
      return res.status(404).json({ error: "销售订单不存在" });
    }

    if (order.status !== SalesOrderStatus.PENDING_APPROVAL) {
      return res.status(400).json({ error: "只有待审批状态的订单可以审批" });
    }

    order.status = SalesOrderStatus.PENDING_SHIPMENT;
    order.approvedBy = req.user;
    order.approvedAt = new Date();

    await salesOrderRepository.save(order);

    res.json({
      message: "销售订单审批通过",
      order,
    });
  } catch (error) {
    console.error("Approve sales order error:", error);
    res.status(500).json({ error: "审批销售订单失败" });
  }
});

router.post("/:id/ship", authenticateJWT, requireWarehouseManager, [
  param("id").isUUID().withMessage("无效的订单ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user) {
      return res.status(401).json({ error: "未授权" });
    }

    const { items } = req.body;

    const salesOrderRepository = AppDataSource.getRepository(SalesOrder);
    const salesOrderItemRepository = AppDataSource.getRepository(SalesOrderItem);
    const accountsReceivableRepository = AppDataSource.getRepository(AccountsReceivable);

    const order = await salesOrderRepository.findOne({
      where: { id: req.params.id },
      relations: ["warehouse", "items", "items.product"],
    });

    if (!order) {
      return res.status(404).json({ error: "销售订单不存在" });
    }

    if (order.status !== SalesOrderStatus.PENDING_SHIPMENT && order.status !== SalesOrderStatus.PARTIALLY_SHIPPED) {
      return res.status(400).json({ error: "当前订单状态不支持出库" });
    }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "请提供出库明细" });
    }

    const shippedMap = new Map(items.map((item: any) => [item.itemId, item.shippedQuantity]));
    let totalShippedAmount = 0;

    for (const item of order.items) {
      const shippedQuantity = shippedMap.get(item.id) || 0;
      if (shippedQuantity <= 0) continue;

      const remainingToShip = item.quantity - item.shippedQuantity;
      if (shippedQuantity > remainingToShip) {
        return res.status(400).json({ error: `商品 ${item.product.name} 出库数量不能超过未出库数量` });
      }

      await updateInventory(
        order.warehouse.id,
        item.product.id,
        shippedQuantity,
        InventoryTransactionType.SALES_OUT,
        req.user.id,
        order.id,
        "sales_order",
        `销售单 ${order.orderNo} 出库`
      );

      item.shippedQuantity += shippedQuantity;
      totalShippedAmount += shippedQuantity * item.unitPrice;
      await salesOrderItemRepository.save(item);
    }

    const allItemsCompleted = order.items.every(item => item.shippedQuantity >= item.quantity);

    if (allItemsCompleted) {
      order.status = SalesOrderStatus.COMPLETED;
    } else {
      order.status = SalesOrderStatus.PARTIALLY_SHIPPED;
    }

    order.shippedBy = req.user;
    order.shippedAt = new Date();
    await salesOrderRepository.save(order);

    const existingAR = await accountsReceivableRepository.findOne({
      where: { salesOrder: { id: order.id } }
    });

    if (existingAR) {
      existingAR.receivedAmount += totalShippedAmount;
      existingAR.remainingAmount = existingAR.totalAmount - existingAR.receivedAmount;
      
      if (existingAR.remainingAmount <= 0) {
        existingAR.status = PaymentStatus.FULLY_PAID;
      } else if (existingAR.receivedAmount > 0) {
        existingAR.status = PaymentStatus.PARTIALLY_PAID;
      }
      
      await accountsReceivableRepository.save(existingAR);
    } else {
      const voucherNo = await generateAccountsReceivableVoucherNo();
      const accountsReceivable = accountsReceivableRepository.create({
        voucherNo,
        customerName: order.customerName,
        salesOrder: order,
        status: PaymentStatus.PENDING,
        totalAmount: order.totalAmount,
        receivedAmount: totalShippedAmount,
        remainingAmount: order.totalAmount - totalShippedAmount,
        createdBy: req.user,
      });

      await accountsReceivableRepository.save(accountsReceivable);
    }

    res.json({
      message: "出库确认成功",
      order,
    });
  } catch (error: any) {
    console.error("Ship sales order error:", error);
    res.status(500).json({ error: error.message || "出库确认失败" });
  }
});

router.post("/:id/cancel", authenticateJWT, [
  param("id").isUUID().withMessage("无效的订单ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const salesOrderRepository = AppDataSource.getRepository(SalesOrder);
    const order = await salesOrderRepository.findOneBy({ id: req.params.id });

    if (!order) {
      return res.status(404).json({ error: "销售订单不存在" });
    }

    if (order.status === SalesOrderStatus.COMPLETED || order.status === SalesOrderStatus.PARTIALLY_SHIPPED) {
      return res.status(400).json({ error: "已出库的订单不能取消" });
    }

    order.status = SalesOrderStatus.CANCELLED;
    await salesOrderRepository.save(order);

    res.json({
      message: "销售订单已取消",
      order,
    });
  } catch (error) {
    console.error("Cancel sales order error:", error);
    res.status(500).json({ error: "取消销售订单失败" });
  }
});

export default router;
