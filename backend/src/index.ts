import "reflect-metadata";
import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { AppDataSource } from "./db/data-source";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Inventory API is running" });
});

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import categoryRoutes from "./routes/categories";
import productRoutes from "./routes/products";
import supplierRoutes from "./routes/suppliers";
import warehouseRoutes from "./routes/warehouses";
import inventoryRoutes from "./routes/inventory";
import purchaseOrderRoutes from "./routes/purchase-orders";
import salesOrderRoutes from "./routes/sales-orders";
import transferOrderRoutes from "./routes/transfer-orders";
import financeRoutes from "./routes/finance";
import dashboardRoutes from "./routes/dashboard";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/sales-orders", salesOrderRoutes);
app.use("/api/transfer-orders", transferOrderRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  }
);

import { seedDatabase } from "./db/seed";

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log("Database connected successfully");

    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
