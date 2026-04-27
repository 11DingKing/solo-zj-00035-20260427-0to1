import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

export enum Unit {
  PIECE = "piece",
  BOX = "box",
  KILOGRAM = "kilogram",
  METER = "meter",
  SET = "set",
  PACK = "pack",
}

@Entity()
export class Category {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity()
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @ManyToOne(() => Category)
  @JoinColumn()
  category: Category;

  @Column({ nullable: true })
  specification: string;

  @Column({
    type: "enum",
    enum: Unit,
    default: Unit.PIECE,
  })
  unit: Unit;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  costPrice: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  sellingPrice: number;

  @Column({ type: "integer", default: 0 })
  safetyStock: number;

  @Column({ nullable: true, unique: true })
  barcode: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
