import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { AppDataSource } from "../db/data-source";
import { User, UserRole } from "../entities/User";

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: User;
}

export const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET || "your_jwt_secret_key_here_please_change_in_production";
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: decoded.userId });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Unauthorized - User not found or inactive" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Forbidden - Invalid token" });
  }
};

export const requireRoles = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }

    next();
  };
};

export const requireAdmin = requireRoles([UserRole.ADMIN]);
export const requirePurchaser = requireRoles([UserRole.PURCHASER, UserRole.ADMIN]);
export const requireWarehouseManager = requireRoles([UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN]);
export const requireFinance = requireRoles([UserRole.FINANCE, UserRole.ADMIN]);
