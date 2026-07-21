import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, resultsTable, studentsTable, subjectsTable } from "@workspace/db";
import {
  CreateResultBody,
  UpdateResultBody,
  ListResultsQueryParams,
  GetResultsReportQueryParams,
  CreateResultResponse,
  UpdateResultResponse,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function computeGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

async function formatResult(result: any) {
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, result.studentId));
  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, result.subjectId));
  return {
    id: result.id,
    studentId: result.studentId,
    studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
    subjectId: result.subjectId,
    subjectName: subject?.name ?? "Unknown",
    classId: result.classId,
    score: parseFloat(result.score),
    grade: result.grade,
    comment: result.comment,
    term: result.term,
    academicYear: result.academicYear,
    schoolId: result.schoolId,
  };
}

router.get("/schools/:schoolId/results", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const queryParams = ListResultsQueryParams.safeParse(req.query);

  let results = await db.select().from(resultsTable).where(eq(resultsTable.schoolId, schoolId));

  if (queryParams.success) {
    if (queryParams.data.classId) results = results.filter((r) => r.classId === queryParams.data.classId);
    if (queryParams.data.subjectId) results = results.filter((r) => r.subjectId === queryParams.data.subjectId);
    if (queryParams.data.studentId) results = results.filter((r) => r.studentId === queryParams.data.studentId);
    if (queryParams.data.term) results = results.filter((r) => r.term === queryParams.data.term);
  }

  const formatted = await Promise.all(results.map(formatResult));
  res.json(formatted);
});

router.post("/schools/:schoolId/results", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const parsed = CreateResultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const grade = computeGrade(parsed.data.score);

  const [result] = await db
    .insert(resultsTable)
    .values({
      studentId: parsed.data.studentId,
      subjectId: parsed.data.subjectId,
      classId: parsed.data.classId,
      score: parsed.data.score.toString(),
      grade,
      comment: parsed.data.comment,
      term: parsed.data.term,
      academicYear: parsed.data.academicYear ?? "2025/2026",
      schoolId,
    })
    .returning();

  res.status(201).json(CreateResultResponse.parse(await formatResult(result)));
});

router.patch("/schools/:schoolId/results/:resultId", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const resultId = parseId(req.params.resultId);

  const parsed = UpdateResultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: any = { ...parsed.data };
  if (parsed.data.score !== undefined) {
    updateData.grade = computeGrade(parsed.data.score);
    updateData.score = parsed.data.score.toString();
  }

  const [result] = await db
    .update(resultsTable)
    .set(updateData)
    .where(and(eq(resultsTable.id, resultId), eq(resultsTable.schoolId, schoolId)))
    .returning();

  if (!result) {
    res.status(404).json({ error: "Result not found" });
    return;
  }

  res.json(UpdateResultResponse.parse(await formatResult(result)));
});

router.get("/schools/:schoolId/results/report", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const queryParams = GetResultsReportQueryParams.safeParse(req.query);

  let results = await db.select().from(resultsTable).where(eq(resultsTable.schoolId, schoolId));

  if (queryParams.success) {
    if (queryParams.data.classId) results = results.filter((r) => r.classId === queryParams.data.classId);
    if (queryParams.data.term) results = results.filter((r) => r.term === queryParams.data.term);
  }

  // Group by student
  const byStudent = new Map<number, any[]>();
  for (const r of results) {
    if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, []);
    byStudent.get(r.studentId)!.push(r);
  }

  const report = await Promise.all(
    Array.from(byStudent.entries()).map(async ([studentId, studentResults], idx) => {
      const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
      const formatted = await Promise.all(studentResults.map(formatResult));
      const avg = studentResults.reduce((s, r) => s + parseFloat(r.score), 0) / studentResults.length;
      return {
        studentId,
        studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
        results: formatted,
        average: Math.round(avg),
        rank: idx + 1,
      };
    }),
  );

  // Sort by average desc and re-rank
  report.sort((a, b) => b.average - a.average);
  report.forEach((r, i) => { r.rank = i + 1; });

  res.json(report);
});

export default router;
