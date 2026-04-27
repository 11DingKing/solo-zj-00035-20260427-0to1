import { AppDataSource } from "../db/data-source";
import { Product } from "../entities/Product";
import { PurchaseOrder } from "../entities/PurchaseOrder";
import { SalesOrder } from "../entities/SalesOrder";
import { TransferOrder } from "../entities/TransferOrder";
import { AccountsPayable, AccountsReceivable, PaymentRecord } from "../entities/Finance";

function padNumber(num: number, length: number): string {
  return num.toString().padStart(length, "0");
}

function getDateString(): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = padNumber(now.getMonth() + 1, 2);
  const day = padNumber(now.getDate(), 2);
  return `${year}${month}${day}`;
}

export async function generateProductCode(categoryId?: string): Promise<string> {
  const productRepository = AppDataSource.getRepository(Product);
  const dateStr = getDateString();
  
  let prefix = "PR";
  if (categoryId) {
    const categoryCode = categoryId.substring(0, 2).toUpperCase();
    prefix = `PR${categoryCode}`;
  }

  const existingCodes = await productRepository
    .createQueryBuilder("product")
    .where("product.code LIKE :pattern", { pattern: `${prefix}${dateStr}%` })
    .orderBy("product.code", "DESC")
    .getMany();

  let nextNum = 1;
  if (existingCodes.length > 0) {
    const lastCode = existingCodes[0].code;
    const numMatch = lastCode.match(/\d+$/);
    if (numMatch) {
      nextNum = parseInt(numMatch[0]) + 1;
    }
  }

  return `${prefix}${dateStr}${padNumber(nextNum, 4)}`;
}

export async function generatePurchaseOrderNo(): Promise<string> {
  const purchaseOrderRepository = AppDataSource.getRepository(PurchaseOrder);
  const dateStr = getDateString();
  const prefix = "PO";

  const existingOrders = await purchaseOrderRepository
    .createQueryBuilder("order")
    .where("order.orderNo LIKE :pattern", { pattern: `${prefix}${dateStr}%` })
    .orderBy("order.orderNo", "DESC")
    .getMany();

  let nextNum = 1;
  if (existingOrders.length > 0) {
    const lastNo = existingOrders[0].orderNo;
    const numMatch = lastNo.match(/\d+$/);
    if (numMatch) {
      nextNum = parseInt(numMatch[0]) + 1;
    }
  }

  return `${prefix}${dateStr}${padNumber(nextNum, 4)}`;
}

export async function generateSalesOrderNo(): Promise<string> {
  const salesOrderRepository = AppDataSource.getRepository(SalesOrder);
  const dateStr = getDateString();
  const prefix = "SO";

  const existingOrders = await salesOrderRepository
    .createQueryBuilder("order")
    .where("order.orderNo LIKE :pattern", { pattern: `${prefix}${dateStr}%` })
    .orderBy("order.orderNo", "DESC")
    .getMany();

  let nextNum = 1;
  if (existingOrders.length > 0) {
    const lastNo = existingOrders[0].orderNo;
    const numMatch = lastNo.match(/\d+$/);
    if (numMatch) {
      nextNum = parseInt(numMatch[0]) + 1;
    }
  }

  return `${prefix}${dateStr}${padNumber(nextNum, 4)}`;
}

export async function generateTransferOrderNo(): Promise<string> {
  const transferOrderRepository = AppDataSource.getRepository(TransferOrder);
  const dateStr = getDateString();
  const prefix = "TO";

  const existingOrders = await transferOrderRepository
    .createQueryBuilder("order")
    .where("order.orderNo LIKE :pattern", { pattern: `${prefix}${dateStr}%` })
    .orderBy("order.orderNo", "DESC")
    .getMany();

  let nextNum = 1;
  if (existingOrders.length > 0) {
    const lastNo = existingOrders[0].orderNo;
    const numMatch = lastNo.match(/\d+$/);
    if (numMatch) {
      nextNum = parseInt(numMatch[0]) + 1;
    }
  }

  return `${prefix}${dateStr}${padNumber(nextNum, 4)}`;
}

export async function generateAccountsPayableVoucherNo(): Promise<string> {
  const apRepository = AppDataSource.getRepository(AccountsPayable);
  const dateStr = getDateString();
  const prefix = "AP";

  const existingVouchers = await apRepository
    .createQueryBuilder("ap")
    .where("ap.voucherNo LIKE :pattern", { pattern: `${prefix}${dateStr}%` })
    .orderBy("ap.voucherNo", "DESC")
    .getMany();

  let nextNum = 1;
  if (existingVouchers.length > 0) {
    const lastNo = existingVouchers[0].voucherNo;
    const numMatch = lastNo.match(/\d+$/);
    if (numMatch) {
      nextNum = parseInt(numMatch[0]) + 1;
    }
  }

  return `${prefix}${dateStr}${padNumber(nextNum, 4)}`;
}

export async function generateAccountsReceivableVoucherNo(): Promise<string> {
  const arRepository = AppDataSource.getRepository(AccountsReceivable);
  const dateStr = getDateString();
  const prefix = "AR";

  const existingVouchers = await arRepository
    .createQueryBuilder("ar")
    .where("ar.voucherNo LIKE :pattern", { pattern: `${prefix}${dateStr}%` })
    .orderBy("ar.voucherNo", "DESC")
    .getMany();

  let nextNum = 1;
  if (existingVouchers.length > 0) {
    const lastNo = existingVouchers[0].voucherNo;
    const numMatch = lastNo.match(/\d+$/);
    if (numMatch) {
      nextNum = parseInt(numMatch[0]) + 1;
    }
  }

  return `${prefix}${dateStr}${padNumber(nextNum, 4)}`;
}

export async function generatePaymentRecordNo(): Promise<string> {
  const paymentRecordRepository = AppDataSource.getRepository(PaymentRecord);
  const dateStr = getDateString();
  const prefix = "PY";

  const existingRecords = await paymentRecordRepository
    .createQueryBuilder("pr")
    .where("pr.recordNo LIKE :pattern", { pattern: `${prefix}${dateStr}%` })
    .orderBy("pr.recordNo", "DESC")
    .getMany();

  let nextNum = 1;
  if (existingRecords.length > 0) {
    const lastNo = existingRecords[0].recordNo;
    const numMatch = lastNo.match(/\d+$/);
    if (numMatch) {
      nextNum = parseInt(numMatch[0]) + 1;
    }
  }

  return `${prefix}${dateStr}${padNumber(nextNum, 4)}`;
}
