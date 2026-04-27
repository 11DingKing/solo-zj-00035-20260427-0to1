import { Router, Response } from "express";
import { AppDataSource } from "../db/data-source";
import { TransferOrder, TransferOrderItem, TransferOrderStatus } from "../entities/TransferOrder";
import { Warehouse, Inventory, InventoryTransactionType } from "../entities/Inventory";
import { Product } from "../entities/Product";
import { authenticateJWT, AuthRequest, requireAdmin } from "../middleware/auth";
import { generateTransferOrderNo } from "../utils/order-number";
import { updateInventory } from "./inventory";
import { body, param, validationResult } from "express-validator";
import { In } from "typeorm";

const router = Router();

router.get("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { status, sourceWarehouseId, targetWarehouseId, startDate, endDate, keyword, page = 1, pageSize = 20 } = req.query;
    
    const transferOrderRepository = AppDataSource.getRepository(TransferOrder);
    const queryBuilder = transferOrderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.sourceWarehouse", "sourceWarehouse")
      .leftJoinAndSelect("order.targetWarehouse", "targetWarehouse")
      .leftJoinAndSelect("order.createdBy", "createdBy")
      .leftJoinAndSelect("order.items", "items")
      .leftJoinAndSelect("items.product", "product");

    if (status) {
      queryBuilder.andWhere("order.status = :status", { status });
    }

    if (sourceWarehouseId) {
      queryBuilder.andWhere("order.sourceWarehouseId = :sourceWarehouseId", { sourceWarehouseId });
    }

    if (targetWarehouseId) {
      queryBuilder.andWhere("order.targetWarehouseId = :targetWarehouseId", { targetWarehouseId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere("order.createdAt BETWEEN :startDate AND :endDate", {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      });
    }

    if (keyword) {
      queryBuilder.andWhere(
        "order.orderNo LIKE :keyword",
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
    console.error("Get transfer orders error:", error);
    res.status(500).json({ error: "获取调拨订单列表失败" });
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

    const transferOrderRepository = AppDataSource.getRepository(TransferOrder);
    const order = await transferOrderRepository.findOne({
      where: { id: req.params.id },
      relations: [
        "sourceWarehouse", 
        "targetWarehouse", 
        "createdBy", 
        "approvedBy", 
        "transferredBy",
        "items",
        "items.product"
      ],
    });

    if (!order) {
      return res.status(404).json({ error: "调拨订单不存在" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get transfer order error:", error);
    res.status(500).json({ error: "获取调拨订单信息失败" });
  }
});

router.post("/", authenticateJWT, [
  body("sourceWarehouseId").isUUID().withMessage("无效的源仓库ID"),
  body("targetWarehouseId").isUUID().withMessage("无效的目标仓库ID"),
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

    const { sourceWarehouseId, targetWarehouseId, items, remark } = req.body;

    if (sourceWarehouseId === targetWarehouseId) {
      return res.status(400).json({ error: "源仓库和目标仓库不能相同" });
    }

    const transferOrderRepository = AppDataSource.getRepository(TransferOrder);
    const transferOrderItemRepository = AppDataSource.getRepository(TransferOrderItem);
    const warehouseRepository = AppDataSource.getRepository(Warehouse);
    const productRepository = AppDataSource.getRepository(Product);
    const inventoryRepository = AppDataSource.getRepository(Inventory);

    const sourceWarehouse = await warehouseRepository.findOneBy({ id: sourceWarehouseId });
    if (!sourceWarehouse) {
      return res.status(404).json({ error: "源仓库不存在" });
    }

    const targetWarehouse = await warehouseRepository.findOneBy({ id: targetWarehouseId });
    if (!targetWarehouse) {
      return res.status(404).json({ error: "目标仓库不存在" });
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
          warehouse: { id: sourceWarehouseId },
          product: { id: item.productId }
        }
      });

      if (!inventory || inventory.quantity < item.quantity) {
        const product = productMap.get(item.productId)!;
        const currentQty = inventory ? inventory.quantity : 0;
        return res.status(400).json({ 
          error: `商品 ${product.name} 源仓库库存不足，当前库存: ${currentQty}, 需要: ${item.quantity}` 
        });
      }
    }

    const orderNo = await generateTransferOrderNo();

    const orderItems: TransferOrderItem[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId)!;

      const orderItem = transferOrderItemRepository.create({
        product,
        quantity: item.quantity,
        transferredQuantity: 0,
      });
      orderItems.push(orderItem);
    }

    const order = transferOrderRepository.create({
      orderNo,
      sourceWarehouse,
      targetWarehouse,
      status: TransferOrderStatus.DRAFT,
      remark,
      createdBy: req.user,
      items: orderItems,
    });

    await transferOrderRepository.save(order);

    res.json({
      message: "调拨订单创建成功",
      order,
    });
  } catch (error) {
    console.error("Create transfer order error:", error);
    res.status(500).json({ error: "创建调拨订单失败" });
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

    const transferOrderRepository = AppDataSource.getRepository(TransferOrder);
    const order = await transferOrderRepository.findOne({
      where: { id: req.params.id },
      relations: ["items"],
    });

    if (!order) {
      return res.status(404).json({ error: "调拨订单不存在" });
    }

    if (order.status !== TransferOrderStatus.DRAFT) {
      return res.status(400).json({ error: "只有草稿状态的订单可以提交" });
    }

    order.status = TransferOrderStatus.PENDING_APPROVAL;
    await transferOrderRepository.save(order);

    res.json({
      message: "调拨订单提交成功，等待审批",
      order,
    });
  } catch (error) {
    console.error("Submit transfer order error:", error);
    res.status(500).json({ error: "提交调拨订单失败" });
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

    const transferOrderRepository = AppDataSource.getRepository(TransferOrder);
    const order = await transferOrderRepository.findOneBy({ id: req.params.id });

    if (!order) {
      return res.status(404).json({ error: "调拨订单不存在" });
    }

    if (order.status !== TransferOrderStatus.PENDING_APPROVAL) {
      return res.status(400).json({ error: "只有待审批状态的订单可以审批" });
    }

    order.status = TransferOrderStatus.PENDING_TRANSFER;
    order.approvedBy = req.user;
    order.approvedAt = new Date();

    await transferOrderRepository.save(order);

    res.json({
      message: "调拨订单审批通过",
      order,
    });
  } catch (error) {
    console.error("Approve transfer order error:", error);
    res.status(500).json({ error: "审批调拨订单失败" });
  }
});

router.post("/:id/transfer", authenticateJWT, [
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

    const transferOrderRepository = AppDataSource.getRepository(TransferOrder);
    const transferOrderItemRepository = AppDataSource.getRepository(TransferOrderItem);

    const order = await transferOrderRepository.findOne({
      where: { id: req.params.id },
      relations: ["sourceWarehouse", "targetWarehouse", "items", "items.product"],
    });

    if (!order) {
      return res.status(404).json({ error: "调拨订单不存在" });
    }

    if (order.status !== TransferOrderStatus.PENDING_TRANSFER) {
      return res.status(400).json({ error: "当前订单状态不支持调拨" });
    }

    for (const item of order.items) {
      const remainingToTransfer = item.quantity - item.transferredQuantity;
      
      await updateInventory(
        order.sourceWarehouse.id,
        item.product.id,
        remainingToTransfer,
        InventoryTransactionType.TRANSFER_OUT,
        req.user.id,
        order.id,
        "transfer_order",
        `调拨单 ${order.orderNo} 调出`
      );

      await updateInventory(
        order.targetWarehouse.id,
        item.product.id,
        remainingToTransfer,
        InventoryTransactionType.TRANSFER_IN,
        req.user.id,
        order.id,
        "transfer_order",
        `调拨单 ${order.orderNo} 调入`
      );

      item.transferredQuantity = item.quantity;
      await transferOrderItemRepository.save(item);
    }

    order.status = TransferOrderStatus.COMPLETED;
    order.transferredBy = req.user;
    order.transferredAt = new Date();
    await transferOrderRepository.save(order);

    res.json({
      message: "调拨确认成功",
      order,
    });
  } catch (error: any) {
    console.error("Transfer order error:", error);
    res.status(500).json({ error: error.message || "调拨确认失败" });
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

    const transferOrderRepository = AppDataSource.getRepository(TransferOrder);
    const order = await transferOrderRepository.findOneBy({ id: req.params.id });

    if (!order) {
      return res.status(404).json({ error: "调拨订单不存在" });
    }

    if (order.status === TransferOrderStatus.COMPLETED) {
      return res.status(400).json({ error: "已完成的订单不能取消" });
    }

    order.status = TransferOrderStatus.CANCELLED;
    await transferOrderRepository.save(order);

    res.json({
      message: "调拨订单已取消",
      order,
    });
  } catch (error) {
    console.error("Cancel transfer order error:", error);
    res.status(500).json({ error: "取消调拨订单失败" });
  }
});

export default router;
