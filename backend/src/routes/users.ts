import { Router, Response } from "express";
import { AppDataSource } from "../db/data-source";
import { User, UserRole } from "../entities/User";
import { authenticateJWT, requireAdmin, AuthRequest } from "../middleware/auth";
import { body, param, validationResult } from "express-validator";
import * as bcrypt from "bcryptjs";

const router = Router();

router.get("/", authenticateJWT, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const users = await userRepository.find({
      select: ["id", "username", "name", "role", "phone", "isActive", "createdAt"],
      order: { createdAt: "DESC" },
    });
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "获取用户列表失败" });
  }
});

router.get("/me", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "未授权" });
    }
    res.json({
      id: req.user.id,
      username: req.user.username,
      name: req.user.name,
      role: req.user.role,
      phone: req.user.phone,
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "获取用户信息失败" });
  }
});

router.get("/:id", authenticateJWT, requireAdmin, [
  param("id").isUUID().withMessage("无效的用户ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.params.id },
      select: ["id", "username", "name", "role", "phone", "isActive", "createdAt"],
    });

    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "获取用户信息失败" });
  }
});

router.post("/", authenticateJWT, requireAdmin, [
  body("username").notEmpty().withMessage("用户名不能为空"),
  body("password").notEmpty().withMessage("密码不能为空").isLength({ min: 6 }).withMessage("密码至少6位"),
  body("name").notEmpty().withMessage("姓名不能为空"),
  body("role").isIn(Object.values(UserRole)).withMessage("无效的角色"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, name, role, phone } = req.body;

    const userRepository = AppDataSource.getRepository(User);

    const existingUser = await userRepository.findOneBy({ username });
    if (existingUser) {
      return res.status(400).json({ error: "用户名已存在" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = userRepository.create({
      username,
      password: hashedPassword,
      name,
      role,
      phone,
      isActive: true,
    });

    await userRepository.save(user);

    res.json({
      message: "用户创建成功",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "创建用户失败" });
  }
});

router.put("/:id", authenticateJWT, requireAdmin, [
  param("id").isUUID().withMessage("无效的用户ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: req.params.id });

    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }

    const { name, role, phone, isActive, password } = req.body;

    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await userRepository.save(user);

    res.json({
      message: "用户更新成功",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "更新用户失败" });
  }
});

export default router;
