import { Router, Response } from "express";
import { AppDataSource } from "../db/data-source";
import { Supplier } from "../entities/Supplier";
import { authenticateJWT, AuthRequest } from "../middleware/auth";
import { body, param, validationResult } from "express-validator";

const router = Router();

router.get("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, isActive } = req.query;
    
    const supplierRepository = AppDataSource.getRepository(Supplier);
    const queryBuilder = supplierRepository.createQueryBuilder("supplier");

    if (keyword) {
      queryBuilder.andWhere(
        "(supplier.name LIKE :keyword OR supplier.contactPerson LIKE :keyword OR supplier.phone LIKE :keyword)",
        { keyword: `%${keyword}%` }
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere("supplier.isActive = :isActive", { isActive: isActive === "true" });
    }

    const suppliers = await queryBuilder.orderBy("supplier.createdAt", "DESC").getMany();
    res.json(suppliers);
  } catch (error) {
    console.error("Get suppliers error:", error);
    res.status(500).json({ error: "获取供应商列表失败" });
  }
});

router.get("/:id", authenticateJWT, [
  param("id").isUUID().withMessage("无效的供应商ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const supplierRepository = AppDataSource.getRepository(Supplier);
    const supplier = await supplierRepository.findOneBy({ id: req.params.id });

    if (!supplier) {
      return res.status(404).json({ error: "供应商不存在" });
    }

    res.json(supplier);
  } catch (error) {
    console.error("Get supplier error:", error);
    res.status(500).json({ error: "获取供应商信息失败" });
  }
});

router.post("/", authenticateJWT, [
  body("name").notEmpty().withMessage("供应商名称不能为空"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      contactPerson,
      phone,
      address,
      bankName,
      bankAccount,
      taxId,
    } = req.body;

    const supplierRepository = AppDataSource.getRepository(Supplier);

    const existingSupplier = await supplierRepository.findOneBy({ name });
    if (existingSupplier) {
      return res.status(400).json({ error: "供应商名称已存在" });
    }

    const supplier = supplierRepository.create({
      name,
      contactPerson,
      phone,
      address,
      bankName,
      bankAccount,
      taxId,
      isActive: true,
    });

    await supplierRepository.save(supplier);

    res.json({
      message: "供应商创建成功",
      supplier,
    });
  } catch (error) {
    console.error("Create supplier error:", error);
    res.status(500).json({ error: "创建供应商失败" });
  }
});

router.put("/:id", authenticateJWT, [
  param("id").isUUID().withMessage("无效的供应商ID"),
  body("name").notEmpty().withMessage("供应商名称不能为空"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const supplierRepository = AppDataSource.getRepository(Supplier);
    const supplier = await supplierRepository.findOneBy({ id: req.params.id });

    if (!supplier) {
      return res.status(404).json({ error: "供应商不存在" });
    }

    const {
      name,
      contactPerson,
      phone,
      address,
      bankName,
      bankAccount,
      taxId,
      isActive,
    } = req.body;

    if (name && name !== supplier.name) {
      const existingSupplier = await supplierRepository.findOneBy({ name });
      if (existingSupplier && existingSupplier.id !== supplier.id) {
        return res.status(400).json({ error: "供应商名称已存在" });
      }
    }

    supplier.name = name;
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
    if (phone !== undefined) supplier.phone = phone;
    if (address !== undefined) supplier.address = address;
    if (bankName !== undefined) supplier.bankName = bankName;
    if (bankAccount !== undefined) supplier.bankAccount = bankAccount;
    if (taxId !== undefined) supplier.taxId = taxId;
    if (isActive !== undefined) supplier.isActive = isActive;

    await supplierRepository.save(supplier);

    res.json({
      message: "供应商更新成功",
      supplier,
    });
  } catch (error) {
    console.error("Update supplier error:", error);
    res.status(500).json({ error: "更新供应商失败" });
  }
});

router.delete("/:id", authenticateJWT, [
  param("id").isUUID().withMessage("无效的供应商ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const supplierRepository = AppDataSource.getRepository(Supplier);
    const supplier = await supplierRepository.findOneBy({ id: req.params.id });

    if (!supplier) {
      return res.status(404).json({ error: "供应商不存在" });
    }

    supplier.isActive = false;
    await supplierRepository.save(supplier);

    res.json({
      message: "供应商已禁用成功",
    });
  } catch (error) {
    console.error("Delete supplier error:", error);
    res.status(500).json({ error: "禁用供应商失败" });
  }
});

export default router;
