import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, studentsTable, classesTable, attendanceTable, resultsTable, feesTable, schoolsTable, subjectsTable } from "@workspace/db";
import { requireAuth } from "./auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

// Get parent's children (students whose parentPhone matches parent's phone)
router.get("/parent/children", requireAuth, async (req: any, res): Promise<void> => {
  const children = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.parentPhone, req.user.phone));

  const formatted = await Promise.all(
    children.map(async (student) => {
      const [cls] = student.classId
        ? await db.select().from(classesTable).where(eq(classesTable.id, student.classId))
        : [null];
      const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, student.schoolId));

      const attendance = await db.select().from(attendanceTable).where(eq(attendanceTable.studentId, student.id));
      const present = attendance.filter((a) => a.status === "present").length;
      const attendanceRate = attendance.length > 0 ? (present / attendance.length) * 100 : 0;

      const results = await db.select().from(resultsTable).where(eq(resultsTable.studentId, student.id));
      const averageScore = results.length > 0
        ? results.reduce((s, r) => s + parseFloat(r.score), 0) / results.length
        : 0;

      const fees = await db.select().from(feesTable).where(eq(feesTable.studentId, student.id));
      const feesBalance = fees.reduce((s, f) => s + (parseFloat(f.amount) - parseFloat(f.amountPaid)), 0);

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        className: cls?.name ?? "",
        schoolName: school?.name ?? "",
        photoUrl: student.photoUrl,
        attendanceRate: Math.round(attendanceRate),
        averageScore: Math.round(averageScore),
        feesBalance,
      };
    }),
  );

  res.json(formatted);
});

router.get("/parent/children/:studentId/results", requireAuth, async (req: any, res): Promise<void> => {
  const studentId = parseId(req.params.studentId);

  // Verify this student belongs to this parent
  const [student] = await db.select().from(studentsTable).where(and(eq(studentsTable.id, studentId), eq(studentsTable.parentPhone, req.user.phone)));
  if (!student) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  let results = await db.select().from(resultsTable).where(eq(resultsTable.studentId, studentId));

  // Filter by term if provided
  const term = req.query.term as string | undefined;
  if (term) results = results.filter((r) => r.term === term);

  const formatted = await Promise.all(
    results.map(async (r) => {
      const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, r.subjectId));
      return {
        id: r.id,
        studentId: r.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        subjectId: r.subjectId,
        subjectName: subject?.name ?? "Unknown",
        classId: r.classId,
        score: parseFloat(r.score),
        grade: r.grade,
        comment: r.comment,
        term: r.term,
        academicYear: r.academicYear,
        schoolId: r.schoolId,
      };
    }),
  );

  res.json(formatted);
});

router.get("/parent/children/:studentId/attendance", requireAuth, async (req: any, res): Promise<void> => {
  const studentId = parseId(req.params.studentId);

  const [student] = await db.select().from(studentsTable).where(and(eq(studentsTable.id, studentId), eq(studentsTable.parentPhone, req.user.phone)));
  if (!student) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const records = await db.select().from(attendanceTable).where(eq(attendanceTable.studentId, studentId));

  const [cls] = student.classId
    ? await db.select().from(classesTable).where(eq(classesTable.id, student.classId))
    : [null];

  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const percentage = records.length > 0 ? (present / records.length) * 100 : 0;

  const formatted = records.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentName: `${student.firstName} ${student.lastName}`,
    classId: r.classId,
    className: cls?.name ?? "",
    date: r.date,
    status: r.status,
    schoolId: r.schoolId,
  }));

  res.json({
    percentage: Math.round(percentage),
    presentCount: present,
    absentCount: absent,
    records: formatted,
  });
});

router.get("/parent/children/:studentId/fees", requireAuth, async (req: any, res): Promise<void> => {
  const studentId = parseId(req.params.studentId);

  const [student] = await db.select().from(studentsTable).where(and(eq(studentsTable.id, studentId), eq(studentsTable.parentPhone, req.user.phone)));
  if (!student) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const fees = await db.select().from(feesTable).where(eq(feesTable.studentId, studentId));

  const formatted = fees.map((f) => ({
    id: f.id,
    studentId: f.studentId,
    studentName: `${student.firstName} ${student.lastName}`,
    amount: parseFloat(f.amount),
    amountPaid: parseFloat(f.amountPaid),
    balance: parseFloat(f.amount) - parseFloat(f.amountPaid),
    status: f.status,
    term: f.term,
    description: f.description,
    schoolId: f.schoolId,
    createdAt: f.createdAt.toISOString(),
  }));

  res.json(formatted);
});

export default router;
