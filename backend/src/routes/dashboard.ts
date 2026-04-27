import { Router, Response } from "express";
import { AppDataSource } from "../db/data-source";
import { PurchaseOrder, PurchaseOrderStatus } from "../entities/PurchaseOrder";
import { SalesOrder, SalesOrderStatus } from "../entities/SalesOrder";
import { AccountsPayable, AccountsReceivable, PaymentStatus } from "../entities/Finance";
import { Inventory, InventoryTransactionType } from "../entities/Inventory";
import { Product } from "../entities/Product";
import { authenticateJWT, AuthRequest } from "../middleware/auth";
import { Between, MoreThanOrEqual, LessThan } from "typeorm";

const router = Router();

router.get("/summary", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const purchaseOrderRepository = AppDataSource.getRepository(PurchaseOrder);
    const salesOrderRepository = AppDataSource.getRepository(SalesOrder);
    const accountsPayableRepository = AppDataSource.getRepository(AccountsPayable);
    const accountsReceivableRepository = AppDataSource.getRepository(AccountsReceivable);

    const monthlyPurchases = await purchaseOrderRepository
      .createQueryBuilder("po")
      .select("SUM(po.totalAmount)", "total")
      .where("po.status IN (:...statuses)", { 
        statuses: [PurchaseOrderStatus.COMPLETED, PurchaseOrderStatus.PARTIALLY_RECEIVED] 
      })
      .andWhere("po.createdAt BETWEEN :start AND :end", {
        start: startOfMonth,
        end: endOfMonth,
      })
      .getRawOne();

    const monthlySales = await salesOrderRepository
      .createQueryBuilder("so")
      .select("SUM(so.totalAmount)", "total")
      .where("so.status IN (:...statuses)", { 
        statuses: [SalesOrderStatus.COMPLETED, SalesOrderStatus.PARTIALLY_SHIPPED] 
      })
      .andWhere("so.createdAt BETWEEN :start AND :end", {
        start: startOfMonth,
        end: endOfMonth,
      })
      .getRawOne();

    const totalPayables = await accountsPayableRepository
      .createQueryBuilder("ap")
      .select("SUM(ap.remainingAmount)", "total")
      .where("ap.status != :status", { status: PaymentStatus.FULLY_PAID })
      .getRawOne();

    const totalReceivables = await accountsReceivableRepository
      .createQueryBuilder("ar")
      .select("SUM(ar.remainingAmount)", "total")
      .where("ar.status != :status", { status: PaymentStatus.FULLY_PAID })
      .getRawOne();

    const inventoryRepository = AppDataSource.getRepository(Inventory);
    const lowStockItems = await inventoryRepository
      .createQueryBuilder("inv")
      .leftJoinAndSelect("inv.product", "product")
      .leftJoinAndSelect("inv.warehouse", "warehouse")
      .where("inv.quantity <= product.safetyStock")
      .andWhere("product.safetyStock > 0")
      .andWhere("product.isActive = true")
      .getMany();

    const grossProfit = parseFloat(monthlySales?.total || '0') - parseFloat(monthlyPurchases?.total || '0');

    res.json({
      monthlyPurchaseAmount: parseFloat(monthlyPurchases?.total || '0'),
      monthlySalesAmount: parseFloat(monthlySales?.total || '0'),
      grossProfit,
      totalPayables: parseFloat(totalPayables?.total || '0'),
      totalReceivables: parseFloat(totalReceivables?.total || '0'),
      lowStockItemsCount: lowStockItems.length,
      lowStockItems: lowStockItems.slice(0, 10),
    });
  } catch (error) {
    console.error("Get dashboard summary error:", error);
    res.status(500).json({ error: "获取仪表盘汇总失败" });
  }
});

router.get("/trends", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const months: { month: string; year: number; monthNum: number }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        year: date.getFullYear(),
        monthNum: date.getMonth() + 1,
      });
    }

    const purchaseOrderRepository = AppDataSource.getRepository(PurchaseOrder);
    const salesOrderRepository = AppDataSource.getRepository(SalesOrder);

    const purchaseTrends: { month: string; amount: number }[] = [];
    const salesTrends: { month: string; amount: number }[] = [];
    const profitTrends: { month: string; amount: number }[] = [];

    for (const m of months) {
      const startOfMonth = new Date(m.year, m.monthNum - 1, 1);
      const endOfMonth = new Date(m.year, m.monthNum, 0);

      const monthlyPurchases = await purchaseOrderRepository
        .createQueryBuilder("po")
        .select("SUM(po.totalAmount)", "total")
        .where("po.status IN (:...statuses)", { 
          statuses: [PurchaseOrderStatus.COMPLETED, PurchaseOrderStatus.PARTIALLY_RECEIVED] 
        })
        .andWhere("po.createdAt BETWEEN :start AND :end", {
          start: startOfMonth,
          end: endOfMonth,
        })
        .getRawOne();

      const monthlySales = await salesOrderRepository
        .createQueryBuilder("so")
        .select("SUM(so.totalAmount)", "total")
        .where("so.status IN (:...statuses)", { 
          statuses: [SalesOrderStatus.COMPLETED, SalesOrderStatus.PARTIALLY_SHIPPED] 
        })
        .andWhere("so.createdAt BETWEEN :start AND :end", {
          start: startOfMonth,
          end: endOfMonth,
        })
        .getRawOne();

      const purchaseAmount = parseFloat(monthlyPurchases?.total || '0');
      const salesAmount = parseFloat(monthlySales?.total || '0');
      const profit = salesAmount - purchaseAmount;

      purchaseTrends.push({ month: m.month, amount: purchaseAmount });
      salesTrends.push({ month: m.month, amount: salesAmount });
      profitTrends.push({ month: m.month, amount: profit });
    }

    res.json({
      purchaseTrends,
      salesTrends,
      profitTrends,
    });
  } catch (error) {
    console.error("Get dashboard trends error:", error);
    res.status(500).json({ error: "获取趋势数据失败" });
  }
});

router.get("/low-stock", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const inventoryRepository = AppDataSource.getRepository(Inventory);
    
    const lowStockItems = await inventoryRepository
      .createQueryBuilder("inv")
      .leftJoinAndSelect("inv.product", "product")
      .leftJoinAndSelect("inv.warehouse", "warehouse")
      .where("inv.quantity <= product.safetyStock")
      .andWhere("product.safetyStock > 0")
      .andWhere("product.isActive = true")
      .orderBy("inv.quantity", "ASC")
      .getMany();

    res.json(lowStockItems);
  } catch (error) {
    console.error("Get low stock items error:", error);
    res.status(500).json({ error: "获取低库存商品失败" });
  }
});

router.get("/recent-transactions", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    
    const transactionRepository = AppDataSource.getRepository("InventoryTransaction");
    
    const transactions = await transactionRepository
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.warehouse", "warehouse")
      .leftJoinAndSelect("t.product", "product")
      .leftJoinAndSelect("t.operator", "operator")
      .orderBy("t.createdAt", "DESC")
      .take(parseInt(limit as string))
      .getMany();

    res.json(transactions);
  } catch (error) {
    console.error("Get recent transactions error:", error);
    res.status(500).json({ error: "获取最近交易记录失败" });
  }
});

export default router;
