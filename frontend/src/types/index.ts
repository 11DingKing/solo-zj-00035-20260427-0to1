export enum UserRole {
  WAREHOUSE_MANAGER = "warehouse_manager",
  PURCHASER = "purchaser",
  FINANCE = "finance",
  ADMIN = "admin",
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export enum Unit {
  PIECE = "piece",
  BOX = "box",
  KILOGRAM = "kilogram",
  METER = "meter",
  SET = "set",
  PACK = "pack",
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: Category;
  specification?: string;
  unit: Unit;
  costPrice: number;
  sellingPrice: number;
  safetyStock: number;
  barcode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  quantity?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  bankName?: string;
  bankAccount?: string;
  taxId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Inventory {
  id: string;
  warehouse: Warehouse;
  product: Product;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export enum InventoryTransactionType {
  PURCHASE_IN = "purchase_in",
  SALES_OUT = "sales_out",
  TRANSFER_OUT = "transfer_out",
  TRANSFER_IN = "transfer_in",
  ADJUSTMENT = "adjustment",
}

export interface InventoryTransaction {
  id: string;
  warehouse: Warehouse;
  product: Product;
  type: InventoryTransactionType;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  referenceId?: string;
  referenceType?: string;
  remark?: string;
  operator: User;
  createdAt: string;
}

export enum PurchaseOrderStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  PENDING_RECEIPT = "pending_receipt",
  PARTIALLY_RECEIVED = "partially_received",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface PurchaseOrderItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
  amount: number;
}

export interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplier: Supplier;
  warehouse: Warehouse;
  status: PurchaseOrderStatus;
  totalAmount: number;
  remark?: string;
  createdBy: User;
  approvedBy?: User;
  approvedAt?: string;
  receivedBy?: User;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItem[];
}

export enum SalesOrderStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  PENDING_SHIPMENT = "pending_shipment",
  PARTIALLY_SHIPPED = "partially_shipped",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface SalesOrderItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  shippedQuantity: number;
  amount: number;
}

export interface SalesOrder {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  warehouse: Warehouse;
  status: SalesOrderStatus;
  totalAmount: number;
  remark?: string;
  createdBy: User;
  approvedBy?: User;
  approvedAt?: string;
  shippedBy?: User;
  shippedAt?: string;
  createdAt: string;
  updatedAt: string;
  items: SalesOrderItem[];
}

export enum TransferOrderStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  PENDING_TRANSFER = "pending_transfer",
  IN_TRANSIT = "in_transit",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface TransferOrderItem {
  id: string;
  product: Product;
  quantity: number;
  transferredQuantity: number;
}

export interface TransferOrder {
  id: string;
  orderNo: string;
  sourceWarehouse: Warehouse;
  targetWarehouse: Warehouse;
  status: TransferOrderStatus;
  remark?: string;
  createdBy: User;
  approvedBy?: User;
  approvedAt?: string;
  transferredBy?: User;
  transferredAt?: string;
  createdAt: string;
  updatedAt: string;
  items: TransferOrderItem[];
}

export enum PaymentStatus {
  PENDING = "pending",
  PARTIALLY_PAID = "partially_paid",
  FULLY_PAID = "fully_paid",
}

export enum PaymentType {
  PAYMENT = "payment",
  RECEIPT = "receipt",
}

export interface PaymentRecord {
  id: string;
  recordNo: string;
  type: PaymentType;
  amount: number;
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate: string;
  remark?: string;
  operator: User;
  createdAt: string;
}

export interface AccountsPayable {
  id: string;
  voucherNo: string;
  supplier: Supplier;
  purchaseOrder?: PurchaseOrder;
  status: PaymentStatus;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  remark?: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
  paymentRecords: PaymentRecord[];
}

export interface AccountsReceivable {
  id: string;
  voucherNo: string;
  customerName: string;
  salesOrder?: SalesOrder;
  status: PaymentStatus;
  totalAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  remark?: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
  paymentRecords: PaymentRecord[];
}

export interface DashboardSummary {
  monthlyPurchaseAmount: number;
  monthlySalesAmount: number;
  grossProfit: number;
  totalPayables: number;
  totalReceivables: number;
  lowStockItemsCount: number;
  lowStockItems: Inventory[];
}

export interface TrendData {
  month: string;
  amount: number;
}

export interface DashboardTrends {
  purchaseTrends: TrendData[];
  salesTrends: TrendData[];
  profitTrends: TrendData[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
