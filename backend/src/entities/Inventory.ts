import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { Product } from "./Product";
import { User } from "./User";

@Entity()
export class Warehouse {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity()
@Unique(["warehouse", "product"])
export class Inventory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn()
  warehouse: Warehouse;

  @ManyToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column({ type: "integer", default: 0 })
  quantity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export enum InventoryTransactionType {
  PURCHASE_IN = "purchase_in",
  SALES_OUT = "sales_out",
  TRANSFER_OUT = "transfer_out",
  TRANSFER_IN = "transfer_in",
  ADJUSTMENT = "adjustment",
}

@Entity()
export class InventoryTransaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn()
  warehouse: Warehouse;

  @ManyToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column({
    type: "enum",
    enum: InventoryTransactionType,
  })
  type: InventoryTransactionType;

  @Column({ type: "integer" })
  quantity: number;

  @Column({ type: "integer" })
  beforeQuantity: number;

  @Column({ type: "integer" })
  afterQuantity: number;

  @Column({ type: "uuid", nullable: true })
  referenceId: string;

  @Column({ nullable: true })
  referenceType: string;

  @Column({ nullable: true })
  remark: string;

  @ManyToOne(() => User)
  @JoinColumn()
  operator: User;

  @CreateDateColumn()
  createdAt: Date;
}
