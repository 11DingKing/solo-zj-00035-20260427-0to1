import { Router, Response } from "express";
import { AppDataSource } from "../db/data-source";
import {
  Inventory,
  InventoryTransaction,
  InventoryTransactionType,
  Warehouse,
} from "../entities/Inventory";
import { Product } from "../entities/Product";
import { User } from "../entities/User";
import { authenticateJWT, AuthRequest } from "../middleware/auth";
import { param, validationResult } from "express-validator";
import { Between } from "typeorm";

const router = Router();

router.get("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { warehouseId, productId, keyword } = req.query;

    const inventoryRepository = AppDataSource.getRepository(Inventory);
    const queryBuilder = inventoryRepository
      .createQueryBuilder("inventory")
      .leftJoinAndSelect("inventory.warehouse", "warehouse")
      .leftJoinAndSelect("inventory.product", "product");

    if (warehouseId) {
      queryBuilder.andWhere("inventory.warehouseId = :warehouseId", {
        warehouseId,
      });
    }

    if (productId) {
      queryBuilder.andWhere("inventory.productId = :productId", { productId });
    }

    const inventories = await queryBuilder
      .orderBy("inventory.updatedAt", "DESC")
      .getMany();

    if (keyword) {
      const lowerKeyword = (keyword as string).toLowerCase();
      return res.json(
        inventories.filter(
          (inv) =>
            inv.product.code.toLowerCase().includes(lowerKeyword) ||
            inv.product.name.toLowerCase().includes(lowerKeyword),
        ),
      );
    }

    res.json(inventories);
  } catch (error) {
    console.error("Get inventory error:", error);
    res.status(500).json({ error: "获取库存列表失败" });
  }
});

router.get(
  "/transactions",
  authenticateJWT,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        warehouseId,
        productId,
        type,
        startDate,
        endDate,
        page = 1,
        pageSize = 20,
      } = req.query;

      const transactionRepository =
        AppDataSource.getRepository(InventoryTransaction);
      const queryBuilder = transactionRepository
        .createQueryBuilder("transaction")
        .leftJoinAndSelect("transaction.warehouse", "warehouse")
        .leftJoinAndSelect("transaction.product", "product")
        .leftJoinAndSelect("transaction.operator", "operator");

      if (warehouseId) {
        queryBuilder.andWhere("transaction.warehouseId = :warehouseId", {
          warehouseId,
        });
      }

      if (productId) {
        queryBuilder.andWhere("transaction.productId = :productId", {
          productId,
        });
      }

      if (type) {
        queryBuilder.andWhere("transaction.type = :type", { type });
      }

      if (startDate && endDate) {
        queryBuilder.andWhere(
          "transaction.createdAt BETWEEN :startDate AND :endDate",
          {
            startDate: new Date(startDate as string),
            endDate: new Date(endDate as string),
          },
        );
      }

      const total = await queryBuilder.getCount();
      const transactions = await queryBuilder
        .orderBy("transaction.createdAt", "DESC")
        .skip((parseInt(page as string) - 1) * parseInt(pageSize as string))
        .take(parseInt(pageSize as string))
        .getMany();

      res.json({
        data: transactions,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      });
    } catch (error) {
      console.error("Get inventory transactions error:", error);
      res.status(500).json({ error: "获取库存流水失败" });
    }
  },
);

router.get(
  "/:warehouseId/:productId",
  authenticateJWT,
  [
    param("warehouseId").isUUID().withMessage("无效的仓库ID"),
    param("productId").isUUID().withMessage("无效的商品ID"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { warehouseId, productId } = req.params;

      const inventoryRepository = AppDataSource.getRepository(Inventory);
      const inventory = await inventoryRepository.findOne({
        where: {
          warehouse: { id: warehouseId },
          product: { id: productId },
        },
        relations: ["warehouse", "product"],
      });

      if (!inventory) {
        return res.json({
          quantity: 0,
          warehouse: { id: warehouseId },
          product: { id: productId },
        });
      }

      res.json(inventory);
    } catch (error) {
      console.error("Get inventory error:", error);
      res.status(500).json({ error: "获取库存信息失败" });
    }
  },
);

export const updateInventory = async (
  warehouseId: string,
  productId: string,
  quantity: number,
  transactionType: InventoryTransactionType,
  operatorId: string,
  referenceId?: string,
  referenceType?: string,
  remark?: string,
): Promise<number> => {
  const inventoryRepository = AppDataSource.getRepository(Inventory);
  const transactionRepository =
    AppDataSource.getRepository(InventoryTransaction);
  const warehouseRepository = AppDataSource.getRepository(Warehouse);
  const productRepository = AppDataSource.getRepository(Product);

  const warehouse = await warehouseRepository.findOneBy({ id: warehouseId });
  if (!warehouse) {
    throw new Error("仓库不存在");
  }

  const product = await productRepository.findOneBy({ id: productId });
  if (!product) {
    throw new Error("商品不存在");
  }

  let inventory = await inventoryRepository.findOne({
    where: {
      warehouse: { id: warehouseId },
      product: { id: productId },
    },
  });

  const beforeQuantity = inventory ? inventory.quantity : 0;
  let afterQuantity: number;

  if (
    transactionType === InventoryTransactionType.PURCHASE_IN ||
    transactionType === InventoryTransactionType.TRANSFER_IN
  ) {
    afterQuantity = beforeQuantity + quantity;
  } else {
    afterQuantity = beforeQuantity - quantity;
    if (afterQuantity < 0) {
      throw new Error(
        `库存不足，当前库存: ${beforeQuantity}, 需要: ${quantity}`,
      );
    }
  }

  if (!inventory) {
    inventory = inventoryRepository.create({
      warehouse,
      product,
      quantity: afterQuantity,
    });
  } else {
    inventory.quantity = afterQuantity;
  }

  await inventoryRepository.save(inventory);

  const userRepository = AppDataSource.getRepository(User);
  const operator = await userRepository.findOneBy({ id: operatorId });

  if (!operator) {
    throw new Error("操作员不存在");
  }

  const transaction = transactionRepository.create({
    warehouse,
    product,
    type: transactionType,
    quantity,
    beforeQuantity,
    afterQuantity,
    referenceId,
    referenceType,
    remark,
    operator,
  });

  await transactionRepository.save(transaction);

  return afterQuantity;
};

export default router;
