import { Router, Response } from "express";
import { AppDataSource } from "../db/data-source";
import { Product, Category, Unit } from "../entities/Product";
import { Inventory } from "../entities/Inventory";
import { authenticateJWT, AuthRequest } from "../middleware/auth";
import { generateProductCode } from "../utils/order-number";
import { body, param, validationResult } from "express-validator";
import { In } from "typeorm";

const router = Router();

router.get("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, keyword, isActive } = req.query;
    
    const productRepository = AppDataSource.getRepository(Product);
    const queryBuilder = productRepository.createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category");

    if (categoryId) {
      queryBuilder.andWhere("product.categoryId = :categoryId", { categoryId });
    }

    if (keyword) {
      queryBuilder.andWhere(
        "(product.code LIKE :keyword OR product.name LIKE :keyword OR product.barcode LIKE :keyword)",
        { keyword: `%${keyword}%` }
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere("product.isActive = :isActive", { isActive: isActive === "true" });
    }

    const products = await queryBuilder.orderBy("product.createdAt", "DESC").getMany();
    res.json(products);
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ error: "获取商品列表失败" });
  }
});

router.get("/with-inventory", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { warehouseId, keyword } = req.query;
    
    const productRepository = AppDataSource.getRepository(Product);
    const inventoryRepository = AppDataSource.getRepository(Inventory);

    let products = await productRepository.find({
      relations: ["category"],
      where: { isActive: true },
      order: { name: "ASC" },
    });

    if (keyword) {
      const lowerKeyword = (keyword as string).toLowerCase();
      products = products.filter(p => 
        p.code.toLowerCase().includes(lowerKeyword) || 
        p.name.toLowerCase().includes(lowerKeyword) ||
        (p.barcode && p.barcode.toLowerCase().includes(lowerKeyword))
      );
    }

    const productIds = products.map(p => p.id);
    
    let inventoryMap = new Map<string, number>();
    
    if (warehouseId && productIds.length > 0) {
      const inventories = await inventoryRepository.find({
        where: { 
          warehouse: { id: warehouseId as string },
          product: { id: In(productIds) }
        },
        relations: ["product"],
      });

      inventories.forEach(inv => {
        inventoryMap.set(inv.product.id, inv.quantity);
      });
    }

    const productsWithInventory = products.map(product => ({
      ...product,
      quantity: inventoryMap.get(product.id) || 0,
    }));

    res.json(productsWithInventory);
  } catch (error) {
    console.error("Get products with inventory error:", error);
    res.status(500).json({ error: "获取商品库存列表失败" });
  }
});

router.get("/low-stock", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const inventoryRepository = AppDataSource.getRepository(Inventory);
    
    const lowStockItems = await inventoryRepository
      .createQueryBuilder("inventory")
      .leftJoinAndSelect("inventory.product", "product")
      .leftJoinAndSelect("inventory.warehouse", "warehouse")
      .where("inventory.quantity <= product.safetyStock")
      .andWhere("product.safetyStock > 0")
      .andWhere("product.isActive = true")
      .getMany();

    res.json(lowStockItems);
  } catch (error) {
    console.error("Get low stock products error:", error);
    res.status(500).json({ error: "获取低库存商品失败" });
  }
});

router.get("/:id", authenticateJWT, [
  param("id").isUUID().withMessage("无效的商品ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({
      where: { id: req.params.id },
      relations: ["category"],
    });

    if (!product) {
      return res.status(404).json({ error: "商品不存在" });
    }

    res.json(product);
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ error: "获取商品信息失败" });
  }
});

router.post("/", authenticateJWT, [
  body("name").notEmpty().withMessage("商品名称不能为空"),
  body("categoryId").isUUID().withMessage("无效的分类ID"),
  body("costPrice").isFloat({ min: 0 }).withMessage("成本价必须大于等于0"),
  body("sellingPrice").isFloat({ min: 0 }).withMessage("售价必须大于等于0"),
  body("safetyStock").isInt({ min: 0 }).withMessage("安全库存量必须大于等于0"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      categoryId,
      specification,
      unit,
      costPrice,
      sellingPrice,
      safetyStock,
      barcode,
    } = req.body;

    const productRepository = AppDataSource.getRepository(Product);
    const categoryRepository = AppDataSource.getRepository(Category);

    const category = await categoryRepository.findOneBy({ id: categoryId });
    if (!category) {
      return res.status(404).json({ error: "分类不存在" });
    }

    if (barcode) {
      const existingProduct = await productRepository.findOneBy({ barcode });
      if (existingProduct) {
        return res.status(400).json({ error: "条码已存在" });
      }
    }

    const code = await generateProductCode(categoryId);

    const product = productRepository.create({
      code,
      name,
      category,
      specification,
      unit: unit || Unit.PIECE,
      costPrice,
      sellingPrice,
      safetyStock: safetyStock || 0,
      barcode,
      isActive: true,
    });

    await productRepository.save(product);

    res.json({
      message: "商品创建成功",
      product: {
        ...product,
        category,
      },
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ error: "创建商品失败" });
  }
});

router.put("/:id", authenticateJWT, [
  param("id").isUUID().withMessage("无效的商品ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const productRepository = AppDataSource.getRepository(Product);
    const categoryRepository = AppDataSource.getRepository(Category);

    const product = await productRepository.findOne({
      where: { id: req.params.id },
      relations: ["category"],
    });

    if (!product) {
      return res.status(404).json({ error: "商品不存在" });
    }

    const {
      name,
      categoryId,
      specification,
      unit,
      costPrice,
      sellingPrice,
      safetyStock,
      barcode,
      isActive,
    } = req.body;

    if (categoryId && categoryId !== product.category?.id) {
      const category = await categoryRepository.findOneBy({ id: categoryId });
      if (!category) {
        return res.status(404).json({ error: "分类不存在" });
      }
      product.category = category;
    }

    if (barcode && barcode !== product.barcode) {
      const existingProduct = await productRepository.findOneBy({ barcode });
      if (existingProduct && existingProduct.id !== product.id) {
        return res.status(400).json({ error: "条码已存在" });
      }
    }

    if (name !== undefined) product.name = name;
    if (specification !== undefined) product.specification = specification;
    if (unit !== undefined) product.unit = unit;
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
    if (safetyStock !== undefined) product.safetyStock = safetyStock;
    if (barcode !== undefined) product.barcode = barcode;
    if (isActive !== undefined) product.isActive = isActive;

    await productRepository.save(product);

    res.json({
      message: "商品更新成功",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ error: "更新商品失败" });
  }
});

router.delete("/:id", authenticateJWT, [
  param("id").isUUID().withMessage("无效的商品ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const productRepository = AppDataSource.getRepository(Product);
    const product = await productRepository.findOneBy({ id: req.params.id });

    if (!product) {
      return res.status(404).json({ error: "商品不存在" });
    }

    product.isActive = false;
    await productRepository.save(product);

    res.json({
      message: "商品已禁用成功",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ error: "禁用商品失败" });
  }
});

export default router;
