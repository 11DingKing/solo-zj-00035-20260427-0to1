import { Router, Response } from "express";
import { AppDataSource } from "../db/data-source";
import { Category } from "../entities/Product";
import { authenticateJWT, AuthRequest } from "../middleware/auth";
import { body, param, validationResult } from "express-validator";

const router = Router();

router.get("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const categoryRepository = AppDataSource.getRepository(Category);
    const categories = await categoryRepository.find({
      order: { name: "ASC" },
    });
    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "获取分类列表失败" });
  }
});

router.get("/:id", authenticateJWT, [
  param("id").isUUID().withMessage("无效的分类ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const categoryRepository = AppDataSource.getRepository(Category);
    const category = await categoryRepository.findOneBy({ id: req.params.id });

    if (!category) {
      return res.status(404).json({ error: "分类不存在" });
    }

    res.json(category);
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ error: "获取分类信息失败" });
  }
});

router.post("/", authenticateJWT, [
  body("name").notEmpty().withMessage("分类名称不能为空"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    const categoryRepository = AppDataSource.getRepository(Category);

    const existingCategory = await categoryRepository.findOneBy({ name });
    if (existingCategory) {
      return res.status(400).json({ error: "分类名称已存在" });
    }

    const category = categoryRepository.create({
      name,
      description,
    });

    await categoryRepository.save(category);

    res.json({
      message: "分类创建成功",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ error: "创建分类失败" });
  }
});

router.put("/:id", authenticateJWT, [
  param("id").isUUID().withMessage("无效的分类ID"),
  body("name").notEmpty().withMessage("分类名称不能为空"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const categoryRepository = AppDataSource.getRepository(Category);
    const category = await categoryRepository.findOneBy({ id: req.params.id });

    if (!category) {
      return res.status(404).json({ error: "分类不存在" });
    }

    const { name, description } = req.body;

    if (name && name !== category.name) {
      const existingCategory = await categoryRepository.findOneBy({ name });
      if (existingCategory) {
        return res.status(400).json({ error: "分类名称已存在" });
      }
    }

    category.name = name;
    category.description = description;

    await categoryRepository.save(category);

    res.json({
      message: "分类更新成功",
      category,
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ error: "更新分类失败" });
  }
});

router.delete("/:id", authenticateJWT, [
  param("id").isUUID().withMessage("无效的分类ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const categoryRepository = AppDataSource.getRepository(Category);
    const category = await categoryRepository.findOneBy({ id: req.params.id });

    if (!category) {
      return res.status(404).json({ error: "分类不存在" });
    }

    await categoryRepository.remove(category);

    res.json({
      message: "分类删除成功",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ error: "删除分类失败，可能存在关联商品" });
  }
});

export default router;
