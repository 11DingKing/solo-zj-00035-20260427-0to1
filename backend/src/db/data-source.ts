import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER || "inventory",
  password: process.env.DB_PASSWORD || "inventory123",
  database: process.env.DB_NAME || "inventory_db",
  synchronize: true,
  logging: process.env.NODE_ENV === "development",
  entities: [__dirname + "/../entities/**/*.{ts,js}"],
  migrations: [__dirname + "/../migrations/**/*.{ts,js}"],
  subscribers: [],
});
