import { Router, Request, Response } from "express";
import { AppDataSource } from "../db/data-source";
import { User } from "../entities/User";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";

const router = Router();

router.post(
  "/login",
  [
    body("username").notEmpty().withMessage("用户名不能为空"),
    body("password").notEmpty().withMessage("密码不能为空"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOneBy({ username });

      if (!user) {
        return res.status(401).json({ error: "用户名或密码错误" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "用户名或密码错误" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "账户已被禁用" });
      }

      const secret = process.env.JWT_SECRET || "your_jwt_secret_key_here_please_change_in_production";
      const expiresIn = process.env.JWT_EXPIRES_IN || "24h";

      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role,
        },
        secret,
        { expiresIn }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          phone: user.phone,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "登录失败" });
    }
  }
);

router.post(
  "/register",
  [
    body("username").notEmpty().withMessage("用户名不能为空"),
    body("password").notEmpty().withMessage("密码不能为空").isLength({ min: 6 }).withMessage("密码至少6位"),
    body("name").notEmpty().withMessage("姓名不能为空"),
  ],
  async (req: Request, res: Response) => {
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
        role: role || "warehouse_manager",
        phone,
        isActive: true,
      });

      await userRepository.save(user);

      res.json({
        message: "注册成功",
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "注册失败" });
    }
  }
);

export default router;
