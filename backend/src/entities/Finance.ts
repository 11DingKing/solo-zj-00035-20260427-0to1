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
import { PurchaseOrder } from "./PurchaseOrder";
import { SalesOrder } from "./SalesOrder";
import { User } from "./User";
import { Supplier } from "./Supplier";

export enum PaymentStatus {
  PENDING = "pending",
  PARTIALLY_PAID = "partially_paid",
  FULLY_PAID = "fully_paid",
}

@Entity()
export class AccountsPayable {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  voucherNo: string;

  @ManyToOne(() => Supplier)
  @JoinColumn()
  supplier: Supplier;

  @ManyToOne(() => PurchaseOrder)
  @JoinColumn()
  purchaseOrder: PurchaseOrder;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  remainingAmount: number;

  @Column({ nullable: true })
  remark: string;

  @ManyToOne(() => User)
  @JoinColumn()
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PaymentRecord, (record) => record.accountsPayable)
  paymentRecords: PaymentRecord[];
}

@Entity()
export class AccountsReceivable {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  voucherNo: string;

  @Column()
  customerName: string;

  @ManyToOne(() => SalesOrder)
  @JoinColumn()
  salesOrder: SalesOrder;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  receivedAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  remainingAmount: number;

  @Column({ nullable: true })
  remark: string;

  @ManyToOne(() => User)
  @JoinColumn()
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PaymentRecord, (record) => record.accountsReceivable)
  paymentRecords: PaymentRecord[];
}

export enum PaymentType {
  PAYMENT = "payment",
  RECEIPT = "receipt",
}

@Entity()
export class PaymentRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  recordNo: string;

  @Column({
    type: "enum",
    enum: PaymentType,
  })
  type: PaymentType;

  @ManyToOne(() => AccountsPayable, { nullable: true })
  @JoinColumn()
  accountsPayable: AccountsPayable;

  @ManyToOne(() => AccountsReceivable, { nullable: true })
  @JoinColumn()
  accountsReceivable: AccountsReceivable;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ nullable: true })
  paymentReference: string;

  @Column({ type: "timestamp" })
  paymentDate: Date;

  @Column({ nullable: true })
  remark: string;

  @ManyToOne(() => User)
  @JoinColumn()
  operator: User;

  @CreateDateColumn()
  createdAt: Date;
}
