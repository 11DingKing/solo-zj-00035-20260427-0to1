import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { User, UserRole } from "../entities/User";
import { Category } from "../entities/Product";
import { Supplier } from "../entities/Supplier";
import { Warehouse } from "../entities/Inventory";
import * as bcrypt from "bcryptjs";

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log("Database connected");

    const userRepository = AppDataSource.getRepository(User);
    const categoryRepository = AppDataSource.getRepository(Category);
    const supplierRepository = AppDataSource.getRepository(Supplier);
    const warehouseRepository = AppDataSource.getRepository(Warehouse);

    const existingUsers = await userRepository.count();
    if (existingUsers === 0) {
      const hashedPassword = await bcrypt.hash("123456", 10);

      const users: Partial<User>[] = [
        {
          username: "admin",
          password: hashedPassword,
          name: "系统管理员",
          role: UserRole.ADMIN,
          phone: "13800138000",
          isActive: true,
        },
        {
          username: "warehouse",
          password: hashedPassword,
          name: "仓库管理员",
          role: UserRole.WAREHOUSE_MANAGER,
          phone: "13800138001",
          isActive: true,
        },
        {
          username: "purchaser",
          password: hashedPassword,
          name: "采购员",
          role: UserRole.PURCHASER,
          phone: "13800138002",
          isActive: true,
        },
        {
          username: "finance",
          password: hashedPassword,
          name: "财务",
          role: UserRole.FINANCE,
          phone: "13800138003",
          isActive: true,
        },
      ];

      await userRepository.save(users);
      console.log("Users created");
    }

    const existingCategories = await categoryRepository.count();
    if (existingCategories === 0) {
      const categories: Partial<Category>[] = [
        { name: "电子产品", description: "各类电子产品" },
        { name: "办公用品", description: "办公所需用品" },
        { name: "五金工具", description: "五金配件和工具" },
        { name: "日用百货", description: "日常用品" },
      ];

      await categoryRepository.save(categories);
      console.log("Categories created");
    }

    const existingSuppliers = await supplierRepository.count();
    if (existingSuppliers === 0) {
      const suppliers: Partial<Supplier>[] = [
        {
          name: "深圳市科技电子有限公司",
          contactPerson: "张三",
          phone: "0755-12345678",
          address: "深圳市南山区科技园",
          bankName: "中国工商银行深圳分行",
          bankAccount: "6222021234567890123",
          taxId: "91440300MA5F123456",
          isActive: true,
        },
        {
          name: "广州市办公用品批发中心",
          contactPerson: "李四",
          phone: "020-87654321",
          address: "广州市天河区办公耗材市场",
          bankName: "中国建设银行广州分行",
          bankAccount: "6217003320001234567",
          taxId: "91440100MA5G654321",
          isActive: true,
        },
      ];

      await supplierRepository.save(suppliers);
      console.log("Suppliers created");
    }

    const existingWarehouses = await warehouseRepository.count();
    if (existingWarehouses === 0) {
      const warehouses: Partial<Warehouse>[] = [
        { name: "中心仓库", address: "深圳市龙岗区中心仓库", isActive: true },
        { name: "东莞分仓", address: "东莞市虎门镇分仓库", isActive: true },
        { name: "惠州分仓", address: "惠州市惠城区分仓库", isActive: true },
      ];

      await warehouseRepository.save(warehouses);
      console.log("Warehouses created");
    }

    console.log("Seed completed successfully");
  } catch (error) {
    console.error("Seed failed:", error);
  } finally {
    await AppDataSource.destroy();
  }
}

seed();
