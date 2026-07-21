import { Router, type IRouter } from "express";
import { eq, and, count, avg, sql } from "drizzle-orm";
import { db, studentsTable, classesTable, attendanceTable, resultsTable, feesTable } from "@workspace/db";
import {
  CreateStudentBody,
  UpdateStudentBody,
  ListStudentsQueryParams,
  CreateStudentResponse,
  UpdateStudentResponse,
  DeleteStudentResponse,
  GetStudentResponse,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

async function formatStudent(student: any, includeStats = false) {
  let className: string | null = null;
  if (student.classId) {
    const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, student.classId));
    className = cls?.name ?? null;
  }

  const base = {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    dateOfBirth: student.dateOfBirth,
    photoUrl: student.photoUrl,
    classId: student.classId,
    className,
    parentPhone: student.parentPhone,
    parentRelationship: student.parentRelationship,
    schoolId: student.schoolId,
    status: student.status,
    createdAt: student.createdAt.toISOString(),
  };

  if (!includeStats) return base;

  const attendance = await db.select().from(attendanceTable).where(eq(attendanceTable.studentId, student.id));
  const present = attendance.filter((a) => a.status === "present").length;
  const attendanceRate = attendance.length > 0 ? (present / attendance.length) * 100 : 0;

  const results = await db.select().from(resultsTable).where(eq(resultsTable.studentId, student.id));
  const averageScore = results.length > 0 ? results.reduce((s, r) => s + parseFloat(r.score), 0) / results.length : 0;

  const fees = await db.select().from(feesTable).where(eq(feesTable.studentId, student.id));
  const feesBalance = fees.reduce((s, f) => s + (parseFloat(f.amount) - parseFloat(f.amountPaid)), 0);

  return { ...base, attendanceRate: Math.round(attendanceRate), averageScore: Math.round(averageScore), feesBalance };
}

router.get("/schools/:schoolId/students", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const queryParams = ListStudentsQueryParams.safeParse(req.query);

  let students = await db.select().from(studentsTable).where(eq(studentsTable.schoolId, schoolId)).orderBy(studentsTable.firstName);

  if (queryParams.success) {
    if (queryParams.data.status) {
      students = students.filter((s) => s.status === queryParams.data.status);
    }
    if (queryParams.data.classId) {
      students = students.filter((s) => s.classId === queryParams.data.classId);
    }
    if (queryParams.data.search) {
      const q = queryParams.data.search.toLowerCase();
      students = students.filter(
        (s) => s.firstName.toLowerCase().includes(q) || s.lastName.toLowerCase().includes(q),
      );
    }
  }

  const formatted = await Promise.all(students.map((s) => formatStudent(s, false)));
  res.json(formatted);
});

router.post("/schools/:schoolId/students", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [student] = await db
    .insert(studentsTable)
    .values({ ...parsed.data as any, schoolId })
    .returning();

  res.status(201).json(CreateStudentResponse.parse(await formatStudent(student)));
});

router.get("/schools/:schoolId/students/:studentId", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const studentId = parseId(req.params.studentId);

  const [student] = await db.select().from(studentsTable).where(and(eq(studentsTable.id, studentId), eq(studentsTable.schoolId, schoolId)));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json(GetStudentResponse.parse(await formatStudent(student, true)));
});

router.patch("/schools/:schoolId/students/:studentId", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const studentId = parseId(req.params.studentId);

  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [student] = await db
    .update(studentsTable)
    .set(parsed.data as any)
    .where(and(eq(studentsTable.id, studentId), eq(studentsTable.schoolId, schoolId)))
    .returning();

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json(UpdateStudentResponse.parse(await formatStudent(student)));
});

router.delete("/schools/:schoolId/students/:studentId", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const studentId = parseId(req.params.studentId);

  const [student] = await db
    .delete(studentsTable)
    .where(and(eq(studentsTable.id, studentId), eq(studentsTable.schoolId, schoolId)))
    .returning();

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json(DeleteStudentResponse.parse({ success: true }));
});

export default router;
