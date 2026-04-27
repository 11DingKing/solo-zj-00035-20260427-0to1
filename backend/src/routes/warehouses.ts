import { Router, Response } from "express";
import { AppDataSource } from "../db/data-source";
import { Warehouse } from "../entities/Inventory";
import { authenticateJWT, AuthRequest } from "../middleware/auth";
import { body, param, validationResult } from "express-validator";

const router = Router();

router.get("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { isActive } = req.query;
    
    const warehouseRepository = AppDataSource.getRepository(Warehouse);
    const queryBuilder = warehouseRepository.createQueryBuilder("warehouse");

    if (isActive !== undefined) {
      queryBuilder.andWhere("warehouse.isActive = :isActive", { isActive: isActive === "true" });
    }

    const warehouses = await queryBuilder.orderBy("warehouse.name", "ASC").getMany();
    res.json(warehouses);
  } catch (error) {
    console.error("Get warehouses error:", error);
    res.status(500).json({ error: "获取仓库列表失败" });
  }
});

router.get("/:id", authenticateJWT, [
  param("id").isUUID().withMessage("无效的仓库ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const warehouseRepository = AppDataSource.getRepository(Warehouse);
    const warehouse = await warehouseRepository.findOneBy({ id: req.params.id });

    if (!warehouse) {
      return res.status(404).json({ error: "仓库不存在" });
    }

    res.json(warehouse);
  } catch (error) {
    console.error("Get warehouse error:", error);
    res.status(500).json({ error: "获取仓库信息失败" });
  }
});

router.post("/", authenticateJWT, [
  body("name").notEmpty().withMessage("仓库名称不能为空"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address } = req.body;

    const warehouseRepository = AppDataSource.getRepository(Warehouse);

    const existingWarehouse = await warehouseRepository.findOneBy({ name });
    if (existingWarehouse) {
      return res.status(400).json({ error: "仓库名称已存在" });
    }

    const warehouse = warehouseRepository.create({
      name,
      address,
      isActive: true,
    });

    await warehouseRepository.save(warehouse);

    res.json({
      message: "仓库创建成功",
      warehouse,
    });
  } catch (error) {
    console.error("Create warehouse error:", error);
    res.status(500).json({ error: "创建仓库失败" });
  }
});

router.put("/:id", authenticateJWT, [
  param("id").isUUID().withMessage("无效的仓库ID"),
  body("name").notEmpty().withMessage("仓库名称不能为空"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const warehouseRepository = AppDataSource.getRepository(Warehouse);
    const warehouse = await warehouseRepository.findOneBy({ id: req.params.id });

    if (!warehouse) {
      return res.status(404).json({ error: "仓库不存在" });
    }

    const { name, address, isActive } = req.body;

    if (name && name !== warehouse.name) {
      const existingWarehouse = await warehouseRepository.findOneBy({ name });
      if (existingWarehouse && existingWarehouse.id !== warehouse.id) {
        return res.status(400).json({ error: "仓库名称已存在" });
      }
    }

    warehouse.name = name;
    if (address !== undefined) warehouse.address = address;
    if (isActive !== undefined) warehouse.isActive = isActive;

    await warehouseRepository.save(warehouse);

    res.json({
      message: "仓库更新成功",
      warehouse,
    });
  } catch (error) {
    console.error("Update warehouse error:", error);
    res.status(500).json({ error: "更新仓库失败" });
  }
});

router.delete("/:id", authenticateJWT, [
  param("id").isUUID().withMessage("无效的仓库ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const warehouseRepository = AppDataSource.getRepository(Warehouse);
    const warehouse = await warehouseRepository.findOneBy({ id: req.params.id });

    if (!warehouse) {
      return res.status(404).json({ error: "仓库不存在" });
    }

    warehouse.isActive = false;
    await warehouseRepository.save(warehouse);

    res.json({
      message: "仓库已禁用成功",
    });
  } catch (error) {
    console.error("Delete warehouse error:", error);
    res.status(500).json({ error: "禁用仓库失败" });
  }
});

export default router;
