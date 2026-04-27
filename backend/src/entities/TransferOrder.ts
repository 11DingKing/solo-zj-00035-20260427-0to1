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

export enum TransferOrderStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  PENDING_TRANSFER = "pending_transfer",
  IN_TRANSIT = "in_transit",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Entity()
export class TransferOrder {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  orderNo: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn()
  sourceWarehouse: Warehouse;

  @ManyToOne(() => Warehouse)
  @JoinColumn()
  targetWarehouse: Warehouse;

  @Column({
    type: "enum",
    enum: TransferOrderStatus,
    default: TransferOrderStatus.DRAFT,
  })
  status: TransferOrderStatus;

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
  transferredBy: User;

  @Column({ type: "timestamp", nullable: true })
  transferredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TransferOrderItem, (item) => item.transferOrder, {
    cascade: true,
  })
  items: TransferOrderItem[];
}

@Entity()
export class TransferOrderItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => TransferOrder, (order) => order.items)
  @JoinColumn()
  transferOrder: TransferOrder;

  @ManyToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column({ type: "integer" })
  quantity: number;

  @Column({ type: "integer", default: 0 })
  transferredQuantity: number;
}
