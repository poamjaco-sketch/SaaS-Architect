import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, attendanceTable, studentsTable, classesTable } from "@workspace/db";
import {
  SubmitAttendanceBody,
  ListAttendanceQueryParams,
  GetAttendanceSummaryQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

async function formatAttendanceRecord(record: any) {
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, record.studentId));
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, record.classId));
  return {
    id: record.id,
    studentId: record.studentId,
    studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
    classId: record.classId,
    className: cls?.name ?? "Unknown",
    date: record.date,
    status: record.status,
    schoolId: record.schoolId,
  };
}

router.get("/schools/:schoolId/attendance", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const queryParams = ListAttendanceQueryParams.safeParse(req.query);

  let records = await db.select().from(attendanceTable).where(eq(attendanceTable.schoolId, schoolId));

  if (queryParams.success) {
    if (queryParams.data.classId) records = records.filter((r) => r.classId === queryParams.data.classId);
    if (queryParams.data.date) {
      const dateStr = queryParams.data.date instanceof Date
        ? queryParams.data.date.toISOString().split("T")[0]
        : String(queryParams.data.date);
      records = records.filter((r) => r.date === dateStr);
    }
    if (queryParams.data.studentId) records = records.filter((r) => r.studentId === queryParams.data.studentId);
  }

  records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const formatted = await Promise.all(records.slice(0, 100).map(formatAttendanceRecord));
  res.json(formatted);
});

router.post("/schools/:schoolId/attendance", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const parsed = SubmitAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { classId, date, records } = parsed.data;

  // Delete existing records for this class/date
  const dateStr = date instanceof Date ? date.toISOString().split("T")[0] : String(date);
  const existing = await db.select().from(attendanceTable).where(and(eq(attendanceTable.classId, classId), eq(attendanceTable.date, dateStr), eq(attendanceTable.schoolId, schoolId)));
  for (const rec of existing) {
    await db.delete(attendanceTable).where(eq(attendanceTable.id, rec.id));
  }

  const inserted = await db
    .insert(attendanceTable)
    .values(
      records.map((r) => ({
        studentId: r.studentId,
        classId,
        date: dateStr,
        status: r.status as any,
        schoolId,
      })),
    )
    .returning();

  const formatted = await Promise.all(inserted.map(formatAttendanceRecord));
  res.status(201).json(formatted);
});

router.get("/schools/:schoolId/attendance/summary", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const queryParams = GetAttendanceSummaryQueryParams.safeParse(req.query);

  let records = await db.select().from(attendanceTable).where(eq(attendanceTable.schoolId, schoolId));

  if (queryParams.success) {
    if (queryParams.data.classId) records = records.filter((r) => r.classId === queryParams.data.classId);
    if (queryParams.data.startDate) {
      const startStr = queryParams.data.startDate instanceof Date
        ? queryParams.data.startDate.toISOString().split("T")[0]
        : String(queryParams.data.startDate);
      records = records.filter((r) => r.date >= startStr);
    }
    if (queryParams.data.endDate) {
      const endStr = queryParams.data.endDate instanceof Date
        ? queryParams.data.endDate.toISOString().split("T")[0]
        : String(queryParams.data.endDate);
      records = records.filter((r) => r.date <= endStr);
    }
  }

  // Group by student
  const byStudent = new Map<number, { present: number; absent: number; late: number }>();
  for (const record of records) {
    if (!byStudent.has(record.studentId)) {
      byStudent.set(record.studentId, { present: 0, absent: 0, late: 0 });
    }
    const counts = byStudent.get(record.studentId)!;
    if (record.status === "present") counts.present++;
    else if (record.status === "absent") counts.absent++;
    else if (record.status === "late") counts.late++;
  }

  const summary = await Promise.all(
    Array.from(byStudent.entries()).map(async ([studentId, counts]) => {
      const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
      const [cls] = student?.classId ? await db.select().from(classesTable).where(eq(classesTable.id, student.classId)) : [null];
      const total = counts.present + counts.absent + counts.late;
      const percentage = total > 0 ? (counts.present / total) * 100 : 0;
      return {
        studentId,
        studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
        className: cls?.name ?? "",
        presentCount: counts.present,
        absentCount: counts.absent,
        lateCount: counts.late,
        percentage: Math.round(percentage),
      };
    }),
  );

  res.json(summary);
});

export default router;
