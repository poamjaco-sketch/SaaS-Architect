import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, teachersTable, classesTable, subjectsTable } from "@workspace/db";
import {
  CreateTeacherBody,
  UpdateTeacherBody,
  ListTeachersQueryParams,
  CreateTeacherResponse,
  GetTeacherResponse,
  UpdateTeacherResponse,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

async function formatTeacher(teacher: any) {
  // Find classes assigned to this teacher
  const classes = await db.select().from(classesTable).where(eq(classesTable.teacherId, teacher.id));
  return {
    id: teacher.id,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    phone: teacher.phone,
    email: teacher.email,
    subjects: [] as string[], // Would be populated from a teacher_subjects join table
    classes: classes.map((c) => c.name),
    schoolId: teacher.schoolId,
    status: teacher.status,
    createdAt: teacher.createdAt.toISOString(),
  };
}

router.get("/schools/:schoolId/teachers", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const queryParams = ListTeachersQueryParams.safeParse(req.query);

  let teachers = await db.select().from(teachersTable).where(eq(teachersTable.schoolId, schoolId)).orderBy(teachersTable.firstName);

  if (queryParams.success && queryParams.data.search) {
    const q = queryParams.data.search.toLowerCase();
    teachers = teachers.filter(
      (t) => t.firstName.toLowerCase().includes(q) || t.lastName.toLowerCase().includes(q) || t.phone.includes(q),
    );
  }

  const formatted = await Promise.all(teachers.map(formatTeacher));
  res.json(formatted);
});

router.post("/schools/:schoolId/teachers", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const parsed = CreateTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [teacher] = await db
    .insert(teachersTable)
    .values({ ...parsed.data as any, schoolId })
    .returning();

  res.status(201).json(CreateTeacherResponse.parse(await formatTeacher(teacher)));
});

router.get("/schools/:schoolId/teachers/:teacherId", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const teacherId = parseId(req.params.teacherId);

  const [teacher] = await db.select().from(teachersTable).where(and(eq(teachersTable.id, teacherId), eq(teachersTable.schoolId, schoolId)));
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }

  res.json(GetTeacherResponse.parse(await formatTeacher(teacher)));
});

router.patch("/schools/:schoolId/teachers/:teacherId", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const teacherId = parseId(req.params.teacherId);

  const parsed = UpdateTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [teacher] = await db
    .update(teachersTable)
    .set(parsed.data as any)
    .where(and(eq(teachersTable.id, teacherId), eq(teachersTable.schoolId, schoolId)))
    .returning();

  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }

  res.json(UpdateTeacherResponse.parse(await formatTeacher(teacher)));
});

// Teacher dashboard
router.get("/teacher/dashboard", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role !== "teacher") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Find teacher record for this user
  let teacherRecord = null;
  if (req.user.schoolId) {
    const teachers = await db.select().from(teachersTable).where(eq(teachersTable.schoolId, req.user.schoolId));
    teacherRecord = teachers.find((t) => t.phone === req.user.phone) ?? teachers[0] ?? null;
  }

  if (!teacherRecord) {
    res.status(404).json({ error: "Teacher profile not found" });
    return;
  }

  const classes = await db.select().from(classesTable).where(eq(classesTable.teacherId, teacherRecord.id));

  res.json({
    teacher: await formatTeacher(teacherRecord),
    todaysClasses: classes.map((c) => ({
      id: c.id,
      name: c.name,
      level: c.level,
      teacherId: c.teacherId,
      teacherName: `${teacherRecord!.firstName} ${teacherRecord!.lastName}`,
      studentCount: 0,
      schoolId: c.schoolId,
    })),
    recentAttendance: [],
  });
});

export default router;
