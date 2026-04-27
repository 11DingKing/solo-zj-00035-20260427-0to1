import { Router, Response } from "express";
import { AppDataSource } from "../db/data-source";
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from "../entities/PurchaseOrder";
import { Supplier } from "../entities/Supplier";
import { Warehouse } from "../entities/Inventory";
import { Product } from "../entities/Product";
import { AccountsPayable, PaymentStatus } from "../entities/Finance";
import { authenticateJWT, AuthRequest, requirePurchaser, requireWarehouseManager, requireAdmin } from "../middleware/auth";
import { generatePurchaseOrderNo, generateAccountsPayableVoucherNo } from "../utils/order-number";
import { updateInventory } from "./inventory";
import { InventoryTransactionType } from "../entities/Inventory";
import { body, param, validationResult } from "express-validator";
import { Between, In } from "typeorm";

const router = Router();

router.get("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { status, supplierId, warehouseId, startDate, endDate, keyword, page = 1, pageSize = 20 } = req.query;
    
    const purchaseOrderRepository = AppDataSource.getRepository(PurchaseOrder);
    const queryBuilder = purchaseOrderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.supplier", "supplier")
      .leftJoinAndSelect("order.warehouse", "warehouse")
      .leftJoinAndSelect("order.createdBy", "createdBy")
      .leftJoinAndSelect("order.items", "items")
      .leftJoinAndSelect("items.product", "product");

    if (status) {
      queryBuilder.andWhere("order.status = :status", { status });
    }

    if (supplierId) {
      queryBuilder.andWhere("order.supplierId = :supplierId", { supplierId });
    }

    if (warehouseId) {
      queryBuilder.andWhere("order.warehouseId = :warehouseId", { warehouseId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere("order.createdAt BETWEEN :startDate AND :endDate", {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      });
    }

    if (keyword) {
      queryBuilder.andWhere(
        "order.orderNo LIKE :keyword OR supplier.name LIKE :keyword",
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
    console.error("Get purchase orders error:", error);
    res.status(500).json({ error: "获取采购订单列表失败" });
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

    const purchaseOrderRepository = AppDataSource.getRepository(PurchaseOrder);
    const order = await purchaseOrderRepository.findOne({
      where: { id: req.params.id },
      relations: [
        "supplier", 
        "warehouse", 
        "createdBy", 
        "approvedBy", 
        "receivedBy",
        "items",
        "items.product"
      ],
    });

    if (!order) {
      return res.status(404).json({ error: "采购订单不存在" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get purchase order error:", error);
    res.status(500).json({ error: "获取采购订单信息失败" });
  }
});

router.post("/", authenticateJWT, requirePurchaser, [
  body("supplierId").isUUID().withMessage("无效的供应商ID"),
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

    const { supplierId, warehouseId, items, remark } = req.body;

    const purchaseOrderRepository = AppDataSource.getRepository(PurchaseOrder);
    const purchaseOrderItemRepository = AppDataSource.getRepository(PurchaseOrderItem);
    const supplierRepository = AppDataSource.getRepository(Supplier);
    const warehouseRepository = AppDataSource.getRepository(Warehouse);
    const productRepository = AppDataSource.getRepository(Product);

    const supplier = await supplierRepository.findOneBy({ id: supplierId });
    if (!supplier) {
      return res.status(404).json({ error: "供应商不存在" });
    }

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
    }

    const orderNo = await generatePurchaseOrderNo();

    let totalAmount = 0;
    const orderItems: PurchaseOrderItem[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId)!;
      const amount = item.quantity * item.unitPrice;
      totalAmount += amount;

      const orderItem = purchaseOrderItemRepository.create({
        product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        receivedQuantity: 0,
        amount,
      });
      orderItems.push(orderItem);
    }

    const order = purchaseOrderRepository.create({
      orderNo,
      supplier,
      warehouse,
      status: PurchaseOrderStatus.DRAFT,
      totalAmount,
      remark,
      createdBy: req.user,
      items: orderItems,
    });

    await purchaseOrderRepository.save(order);

    res.json({
      message: "采购订单创建成功",
      order,
    });
  } catch (error) {
    console.error("Create purchase order error:", error);
    res.status(500).json({ error: "创建采购订单失败" });
  }
});

router.post("/:id/submit", authenticateJWT, requirePurchaser, [
  param("id").isUUID().withMessage("无效的订单ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const purchaseOrderRepository = AppDataSource.getRepository(PurchaseOrder);
    const order = await purchaseOrderRepository.findOne({
      where: { id: req.params.id },
      relations: ["items"],
    });

    if (!order) {
      return res.status(404).json({ error: "采购订单不存在" });
    }

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      return res.status(400).json({ error: "只有草稿状态的订单可以提交" });
    }

    order.status = PurchaseOrderStatus.PENDING_APPROVAL;
    await purchaseOrderRepository.save(order);

    res.json({
      message: "采购订单提交成功，等待审批",
      order,
    });
  } catch (error) {
    console.error("Submit purchase order error:", error);
    res.status(500).json({ error: "提交采购订单失败" });
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

    const purchaseOrderRepository = AppDataSource.getRepository(PurchaseOrder);
    const order = await purchaseOrderRepository.findOneBy({ id: req.params.id });

    if (!order) {
      return res.status(404).json({ error: "采购订单不存在" });
    }

    if (order.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      return res.status(400).json({ error: "只有待审批状态的订单可以审批" });
    }

    order.status = PurchaseOrderStatus.PENDING_RECEIPT;
    order.approvedBy = req.user;
    order.approvedAt = new Date();

    await purchaseOrderRepository.save(order);

    res.json({
      message: "采购订单审批通过",
      order,
    });
  } catch (error) {
    console.error("Approve purchase order error:", error);
    res.status(500).json({ error: "审批采购订单失败" });
  }
});

router.post("/:id/receive", authenticateJWT, requireWarehouseManager, [
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

    const purchaseOrderRepository = AppDataSource.getRepository(PurchaseOrder);
    const purchaseOrderItemRepository = AppDataSource.getRepository(PurchaseOrderItem);
    const accountsPayableRepository = AppDataSource.getRepository(AccountsPayable);

    const order = await purchaseOrderRepository.findOne({
      where: { id: req.params.id },
      relations: ["supplier", "warehouse", "items", "items.product"],
    });

    if (!order) {
      return res.status(404).json({ error: "采购订单不存在" });
    }

    if (order.status !== PurchaseOrderStatus.PENDING_RECEIPT && order.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED) {
      return res.status(400).json({ error: "当前订单状态不支持收货" });
    }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "请提供收货明细" });
    }

    const receivedMap = new Map(items.map((item: any) => [item.itemId, item.receivedQuantity]));
    let totalReceivedAmount = 0;

    for (const item of order.items) {
      const receivedQuantity = receivedMap.get(item.id) || 0;
      if (receivedQuantity <= 0) continue;

      const remainingToReceive = item.quantity - item.receivedQuantity;
      if (receivedQuantity > remainingToReceive) {
        return res.status(400).json({ error: `商品 ${item.product.name} 收货数量不能超过未收货数量` });
      }

      await updateInventory(
        order.warehouse.id,
        item.product.id,
        receivedQuantity,
        InventoryTransactionType.PURCHASE_IN,
        req.user.id,
        order.id,
        "purchase_order",
        `采购单 ${order.orderNo} 收货`
      );

      item.receivedQuantity += receivedQuantity;
      totalReceivedAmount += receivedQuantity * item.unitPrice;
      await purchaseOrderItemRepository.save(item);
    }

    const allItemsCompleted = order.items.every(item => item.receivedQuantity >= item.quantity);

    if (allItemsCompleted) {
      order.status = PurchaseOrderStatus.COMPLETED;
    } else {
      order.status = PurchaseOrderStatus.PARTIALLY_RECEIVED;
    }

    order.receivedBy = req.user;
    order.receivedAt = new Date();
    await purchaseOrderRepository.save(order);

    const existingAP = await accountsPayableRepository.findOne({
      where: { purchaseOrder: { id: order.id } }
    });

    if (existingAP) {
      existingAP.paidAmount += totalReceivedAmount;
      existingAP.remainingAmount = existingAP.totalAmount - existingAP.paidAmount;
      
      if (existingAP.remainingAmount <= 0) {
        existingAP.status = PaymentStatus.FULLY_PAID;
      } else if (existingAP.paidAmount > 0) {
        existingAP.status = PaymentStatus.PARTIALLY_PAID;
      }
      
      await accountsPayableRepository.save(existingAP);
    } else {
      const voucherNo = await generateAccountsPayableVoucherNo();
      const accountsPayable = accountsPayableRepository.create({
        voucherNo,
        supplier: order.supplier,
        purchaseOrder: order,
        status: PaymentStatus.PENDING,
        totalAmount: order.totalAmount,
        paidAmount: totalReceivedAmount,
        remainingAmount: order.totalAmount - totalReceivedAmount,
        createdBy: req.user,
      });

      await accountsPayableRepository.save(accountsPayable);
    }

    res.json({
      message: "收货确认成功",
      order,
    });
  } catch (error: any) {
    console.error("Receive purchase order error:", error);
    res.status(500).json({ error: error.message || "收货确认失败" });
  }
});

router.post("/:id/cancel", authenticateJWT, requirePurchaser, [
  param("id").isUUID().withMessage("无效的订单ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const purchaseOrderRepository = AppDataSource.getRepository(PurchaseOrder);
    const order = await purchaseOrderRepository.findOneBy({ id: req.params.id });

    if (!order) {
      return res.status(404).json({ error: "采购订单不存在" });
    }

    if (order.status === PurchaseOrderStatus.COMPLETED || order.status === PurchaseOrderStatus.PARTIALLY_RECEIVED) {
      return res.status(400).json({ error: "已收货的订单不能取消" });
    }

    order.status = PurchaseOrderStatus.CANCELLED;
    await purchaseOrderRepository.save(order);

    res.json({
      message: "采购订单已取消",
      order,
    });
  } catch (error) {
    console.error("Cancel purchase order error:", error);
    res.status(500).json({ error: "取消采购订单失败" });
  }
});

export default router;
