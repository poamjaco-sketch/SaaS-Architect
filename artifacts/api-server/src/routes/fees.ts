import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, feesTable, studentsTable } from "@workspace/db";
import {
  CreateFeeRecordBody,
  ListFeesQueryParams,
  CreateFeeRecordResponse,
  GetFeesSummaryResponse,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

async function formatFee(fee: any) {
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, fee.studentId));
  const amount = parseFloat(fee.amount);
  const amountPaid = parseFloat(fee.amountPaid);
  return {
    id: fee.id,
    studentId: fee.studentId,
    studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
    amount,
    amountPaid,
    balance: amount - amountPaid,
    status: fee.status,
    term: fee.term,
    description: fee.description,
    schoolId: fee.schoolId,
    createdAt: fee.createdAt.toISOString(),
  };
}

function computeStatus(amount: number, amountPaid: number): "paid" | "pending" | "partial" {
  if (amountPaid >= amount) return "paid";
  if (amountPaid <= 0) return "pending";
  return "partial";
}

router.get("/schools/:schoolId/fees", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const queryParams = ListFeesQueryParams.safeParse(req.query);

  let fees = await db.select().from(feesTable).where(eq(feesTable.schoolId, schoolId)).orderBy(feesTable.createdAt);

  if (queryParams.success) {
    if (queryParams.data.studentId) fees = fees.filter((f) => f.studentId === queryParams.data.studentId);
    if (queryParams.data.status) fees = fees.filter((f) => f.status === queryParams.data.status);
  }

  const formatted = await Promise.all(fees.map(formatFee));
  res.json(formatted);
});

router.post("/schools/:schoolId/fees", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const parsed = CreateFeeRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const amount = parsed.data.amount;
  const amountPaid = parsed.data.amountPaid ?? 0;
  const status = computeStatus(amount, amountPaid);

  const [fee] = await db
    .insert(feesTable)
    .values({
      studentId: parsed.data.studentId,
      amount: amount.toString(),
      amountPaid: amountPaid.toString(),
      status,
      term: parsed.data.term,
      description: parsed.data.description,
      schoolId,
    })
    .returning();

  res.status(201).json(CreateFeeRecordResponse.parse(await formatFee(fee)));
});

router.get("/schools/:schoolId/fees/summary", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const fees = await db.select().from(feesTable).where(eq(feesTable.schoolId, schoolId));

  const totalBilled = fees.reduce((s, f) => s + parseFloat(f.amount), 0);
  const totalCollected = fees.reduce((s, f) => s + parseFloat(f.amountPaid), 0);
  const outstanding = totalBilled - totalCollected;
  const paidCount = fees.filter((f) => f.status === "paid").length;
  const pendingCount = fees.filter((f) => f.status === "pending").length;
  const partialCount = fees.filter((f) => f.status === "partial").length;

  res.json(
    GetFeesSummaryResponse.parse({
      totalBilled,
      totalCollected,
      outstanding,
      paidCount,
      pendingCount,
      partialCount,
    }),
  );
});

export default router;
