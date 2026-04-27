import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Supplier } from "./Supplier";
import { Warehouse } from "./Inventory";
import { Product } from "./Product";
import { User } from "./User";

export enum PurchaseOrderStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  PENDING_RECEIPT = "pending_receipt",
  PARTIALLY_RECEIVED = "partially_received",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Entity()
export class PurchaseOrder {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  orderNo: string;

  @ManyToOne(() => Supplier)
  @JoinColumn()
  supplier: Supplier;

  @ManyToOne(() => Warehouse)
  @JoinColumn()
  warehouse: Warehouse;

  @Column({
    type: "enum",
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT,
  })
  status: PurchaseOrderStatus;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ nullable: true })
  remark: string;

  @ManyToOne(() => User)
  @JoinColumn()
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  approvedBy: User;

  @Column({ type: "timestamp", nullable: true })
  approvedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  receivedBy: User;

  @Column({ type: "timestamp", nullable: true })
  receivedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, {
    cascade: true,
  })
  items: PurchaseOrderItem[];
}

@Entity()
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => PurchaseOrder, (order) => order.items)
  @JoinColumn()
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column({ type: "integer" })
  quantity: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: "integer", default: 0 })
  receivedQuantity: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;
}
