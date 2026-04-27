import { Router, Response } from "express";
import { AppDataSource } from "../db/data-source";
import { AccountsPayable, AccountsReceivable, PaymentRecord, PaymentStatus, PaymentType } from "../entities/Finance";
import { authenticateJWT, AuthRequest, requireFinance } from "../middleware/auth";
import { generatePaymentRecordNo } from "../utils/order-number";
import { body, param, validationResult } from "express-validator";

const router = Router();

router.get("/payables", authenticateJWT, requireFinance, async (req: AuthRequest, res: Response) => {
  try {
    const { status, supplierId, startDate, endDate, page = 1, pageSize = 20 } = req.query;
    
    const accountsPayableRepository = AppDataSource.getRepository(AccountsPayable);
    const queryBuilder = accountsPayableRepository
      .createQueryBuilder("ap")
      .leftJoinAndSelect("ap.supplier", "supplier")
      .leftJoinAndSelect("ap.purchaseOrder", "purchaseOrder")
      .leftJoinAndSelect("ap.createdBy", "createdBy")
      .leftJoinAndSelect("ap.paymentRecords", "paymentRecords")
      .leftJoinAndSelect("paymentRecords.operator", "operator");

    if (status) {
      queryBuilder.andWhere("ap.status = :status", { status });
    }

    if (supplierId) {
      queryBuilder.andWhere("ap.supplierId = :supplierId", { supplierId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere("ap.createdAt BETWEEN :startDate AND :endDate", {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      });
    }

    const total = await queryBuilder.getCount();
    const payables = await queryBuilder
      .orderBy("ap.createdAt", "DESC")
      .skip((parseInt(page as string) - 1) * parseInt(pageSize as string))
      .take(parseInt(pageSize as string))
      .getMany();

    res.json({
      data: payables,
      total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    });
  } catch (error) {
    console.error("Get accounts payable error:", error);
    res.status(500).json({ error: "获取应付账款列表失败" });
  }
});

router.get("/payables/:id", authenticateJWT, requireFinance, [
  param("id").isUUID().withMessage("无效的应付账款ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const accountsPayableRepository = AppDataSource.getRepository(AccountsPayable);
    const payable = await accountsPayableRepository.findOne({
      where: { id: req.params.id },
      relations: [
        "supplier", 
        "purchaseOrder", 
        "createdBy",
        "paymentRecords",
        "paymentRecords.operator"
      ],
    });

    if (!payable) {
      return res.status(404).json({ error: "应付账款不存在" });
    }

    res.json(payable);
  } catch (error) {
    console.error("Get accounts payable error:", error);
    res.status(500).json({ error: "获取应付账款信息失败" });
  }
});

router.post("/payables/:id/pay", authenticateJWT, requireFinance, [
  param("id").isUUID().withMessage("无效的应付账款ID"),
  body("amount").isFloat({ min: 0.01 }).withMessage("付款金额必须大于0"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user) {
      return res.status(401).json({ error: "未授权" });
    }

    const { amount, paymentMethod, paymentReference, remark } = req.body;

    const accountsPayableRepository = AppDataSource.getRepository(AccountsPayable);
    const paymentRecordRepository = AppDataSource.getRepository(PaymentRecord);

    const payable = await accountsPayableRepository.findOne({
      where: { id: req.params.id },
      relations: ["supplier"],
    });

    if (!payable) {
      return res.status(404).json({ error: "应付账款不存在" });
    }

    if (payable.status === PaymentStatus.FULLY_PAID) {
      return res.status(400).json({ error: "该应付账款已全部付清" });
    }

    if (amount > payable.remainingAmount) {
      return res.status(400).json({ 
        error: `付款金额不能超过剩余应付金额: ${payable.remainingAmount}` 
      });
    }

    const recordNo = await generatePaymentRecordNo();

    const paymentRecord = paymentRecordRepository.create({
      recordNo,
      type: PaymentType.PAYMENT,
      accountsPayable: payable,
      amount,
      paymentMethod,
      paymentReference,
      paymentDate: new Date(),
      remark,
      operator: req.user,
    });

    await paymentRecordRepository.save(paymentRecord);

    payable.paidAmount += amount;
    payable.remainingAmount = payable.totalAmount - payable.paidAmount;

    if (payable.remainingAmount <= 0) {
      payable.status = PaymentStatus.FULLY_PAID;
    } else {
      payable.status = PaymentStatus.PARTIALLY_PAID;
    }

    await accountsPayableRepository.save(payable);

    res.json({
      message: "付款成功",
      payable,
      paymentRecord,
    });
  } catch (error) {
    console.error("Pay accounts payable error:", error);
    res.status(500).json({ error: "付款失败" });
  }
});

router.get("/receivables", authenticateJWT, requireFinance, async (req: AuthRequest, res: Response) => {
  try {
    const { status, customerName, startDate, endDate, page = 1, pageSize = 20 } = req.query;
    
    const accountsReceivableRepository = AppDataSource.getRepository(AccountsReceivable);
    const queryBuilder = accountsReceivableRepository
      .createQueryBuilder("ar")
      .leftJoinAndSelect("ar.salesOrder", "salesOrder")
      .leftJoinAndSelect("ar.createdBy", "createdBy")
      .leftJoinAndSelect("ar.paymentRecords", "paymentRecords")
      .leftJoinAndSelect("paymentRecords.operator", "operator");

    if (status) {
      queryBuilder.andWhere("ar.status = :status", { status });
    }

    if (customerName) {
      queryBuilder.andWhere("ar.customerName LIKE :customerName", { customerName: `%${customerName}%` });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere("ar.createdAt BETWEEN :startDate AND :endDate", {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      });
    }

    const total = await queryBuilder.getCount();
    const receivables = await queryBuilder
      .orderBy("ar.createdAt", "DESC")
      .skip((parseInt(page as string) - 1) * parseInt(pageSize as string))
      .take(parseInt(pageSize as string))
      .getMany();

    res.json({
      data: receivables,
      total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    });
  } catch (error) {
    console.error("Get accounts receivable error:", error);
    res.status(500).json({ error: "获取应收账款列表失败" });
  }
});

router.get("/receivables/:id", authenticateJWT, requireFinance, [
  param("id").isUUID().withMessage("无效的应收账款ID"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const accountsReceivableRepository = AppDataSource.getRepository(AccountsReceivable);
    const receivable = await accountsReceivableRepository.findOne({
      where: { id: req.params.id },
      relations: [
        "salesOrder", 
        "createdBy",
        "paymentRecords",
        "paymentRecords.operator"
      ],
    });

    if (!receivable) {
      return res.status(404).json({ error: "应收账款不存在" });
    }

    res.json(receivable);
  } catch (error) {
    console.error("Get accounts receivable error:", error);
    res.status(500).json({ error: "获取应收账款信息失败" });
  }
});

router.post("/receivables/:id/receive", authenticateJWT, requireFinance, [
  param("id").isUUID().withMessage("无效的应收账款ID"),
  body("amount").isFloat({ min: 0.01 }).withMessage("收款金额必须大于0"),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user) {
      return res.status(401).json({ error: "未授权" });
    }

    const { amount, paymentMethod, paymentReference, remark } = req.body;

    const accountsReceivableRepository = AppDataSource.getRepository(AccountsReceivable);
    const paymentRecordRepository = AppDataSource.getRepository(PaymentRecord);

    const receivable = await accountsReceivableRepository.findOneBy({ id: req.params.id });

    if (!receivable) {
      return res.status(404).json({ error: "应收账款不存在" });
    }

    if (receivable.status === PaymentStatus.FULLY_PAID) {
      return res.status(400).json({ error: "该应收账款已全部收讫" });
    }

    if (amount > receivable.remainingAmount) {
      return res.status(400).json({ 
        error: `收款金额不能超过剩余应收金额: ${receivable.remainingAmount}` 
      });
    }

    const recordNo = await generatePaymentRecordNo();

    const paymentRecord = paymentRecordRepository.create({
      recordNo,
      type: PaymentType.RECEIPT,
      accountsReceivable: receivable,
      amount,
      paymentMethod,
      paymentReference,
      paymentDate: new Date(),
      remark,
      operator: req.user,
    });

    await paymentRecordRepository.save(paymentRecord);

    receivable.receivedAmount += amount;
    receivable.remainingAmount = receivable.totalAmount - receivable.receivedAmount;

    if (receivable.remainingAmount <= 0) {
      receivable.status = PaymentStatus.FULLY_PAID;
    } else {
      receivable.status = PaymentStatus.PARTIALLY_PAID;
    }

    await accountsReceivableRepository.save(receivable);

    res.json({
      message: "收款成功",
      receivable,
      paymentRecord,
    });
  } catch (error) {
    console.error("Receive accounts receivable error:", error);
    res.status(500).json({ error: "收款失败" });
  }
});

export default router;
