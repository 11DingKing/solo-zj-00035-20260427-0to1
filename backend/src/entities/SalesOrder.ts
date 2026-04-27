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
import { Warehouse } from "./Inventory";
import { Product } from "./Product";
import { User } from "./User";

export enum SalesOrderStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  PENDING_SHIPMENT = "pending_shipment",
  PARTIALLY_SHIPPED = "partially_shipped",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Entity()
export class SalesOrder {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  orderNo: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ nullable: true })
  customerAddress: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn()
  warehouse: Warehouse;

  @Column({
    type: "enum",
    enum: SalesOrderStatus,
    default: SalesOrderStatus.DRAFT,
  })
  status: SalesOrderStatus;

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
  shippedBy: User;

  @Column({ type: "timestamp", nullable: true })
  shippedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SalesOrderItem, (item) => item.salesOrder, {
    cascade: true,
  })
  items: SalesOrderItem[];
}

@Entity()
export class SalesOrderItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => SalesOrder, (order) => order.items)
  @JoinColumn()
  salesOrder: SalesOrder;

  @ManyToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column({ type: "integer" })
  quantity: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: "integer", default: 0 })
  shippedQuantity: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;
}
