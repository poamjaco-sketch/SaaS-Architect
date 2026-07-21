import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, classesTable, subjectsTable, studentsTable, teachersTable } from "@workspace/db";
import {
  CreateClassBody,
  UpdateClassBody,
  CreateClassResponse,
  UpdateClassResponse,
  ListClassesResponse,
  CreateSubjectBody,
  CreateSubjectResponse,
  ListSubjectsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

async function formatClass(cls: any) {
  const [studentCount] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.classId, cls.id));
  let teacherName: string | null = null;
  if (cls.teacherId) {
    const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, cls.teacherId));
    if (teacher) teacherName = `${teacher.firstName} ${teacher.lastName}`;
  }
  return {
    id: cls.id,
    name: cls.name,
    level: cls.level,
    teacherId: cls.teacherId,
    teacherName,
    studentCount: studentCount.count,
    schoolId: cls.schoolId,
  };
}

// Classes
router.get("/schools/:schoolId/classes", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const classes = await db.select().from(classesTable).where(eq(classesTable.schoolId, schoolId)).orderBy(classesTable.name);
  const formatted = await Promise.all(classes.map(formatClass));
  res.json(formatted);
});

router.post("/schools/:schoolId/classes", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cls] = await db
    .insert(classesTable)
    .values({ ...parsed.data as any, schoolId })
    .returning();

  res.status(201).json(CreateClassResponse.parse(await formatClass(cls)));
});

router.patch("/schools/:schoolId/classes/:classId", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const classId = parseId(req.params.classId);

  const parsed = UpdateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cls] = await db
    .update(classesTable)
    .set(parsed.data as any)
    .where(and(eq(classesTable.id, classId), eq(classesTable.schoolId, schoolId)))
    .returning();

  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  res.json(UpdateClassResponse.parse(await formatClass(cls)));
});

// Subjects
router.get("/schools/:schoolId/subjects", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.schoolId, schoolId)).orderBy(subjectsTable.name);
  res.json(
    subjects.map((s) => ({ id: s.id, name: s.name, code: s.code, schoolId: s.schoolId })),
  );
});

router.post("/schools/:schoolId/subjects", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [subject] = await db
    .insert(subjectsTable)
    .values({ ...parsed.data as any, schoolId })
    .returning();

  res.status(201).json(CreateSubjectResponse.parse({ id: subject.id, name: subject.name, code: subject.code, schoolId: subject.schoolId }));
});

export default router;
