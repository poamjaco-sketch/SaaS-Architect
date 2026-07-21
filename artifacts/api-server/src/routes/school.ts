import { Router, type IRouter } from "express";
import { eq, count, sql, and } from "drizzle-orm";
import {
  db,
  schoolsTable,
  studentsTable,
  teachersTable,
  classesTable,
  attendanceTable,
  feesTable,
  announcementsTable,
} from "@workspace/db";
import { GetSchoolDashboardResponse } from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

function parseSchoolId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/schools/:schoolId/dashboard", requireAuth, async (req: any, res): Promise<void> => {
  const schoolId = parseSchoolId(req.params.schoolId);

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId));
  if (!school) {
    res.status(404).json({ error: "School not found" });
    return;
  }

  const [studentCount] = await db.select({ count: count() }).from(studentsTable).where(and(eq(studentsTable.schoolId, schoolId), eq(studentsTable.status, "active")));
  const [teacherCount] = await db.select({ count: count() }).from(teachersTable).where(and(eq(teachersTable.schoolId, schoolId), eq(teachersTable.status, "active")));
  const [classCount] = await db.select({ count: count() }).from(classesTable).where(eq(classesTable.schoolId, schoolId));

  // Today's attendance
  const today = new Date().toISOString().split("T")[0];
  const todayAttendance = await db.select().from(attendanceTable).where(and(eq(attendanceTable.schoolId, schoolId), eq(attendanceTable.date, today)));
  const presentToday = todayAttendance.filter((a) => a.status === "present").length;
  const attendanceRate = todayAttendance.length > 0 ? (presentToday / todayAttendance.length) * 100 : 0;

  // Fees collected
  const allFees = await db.select().from(feesTable).where(eq(feesTable.schoolId, schoolId));
  const feesCollected = allFees.reduce((sum, f) => sum + parseFloat(f.amountPaid), 0);

  // Recent 7 days attendance trend
  const recentAttendance = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayAttendance = await db.select().from(attendanceTable).where(and(eq(attendanceTable.schoolId, schoolId), eq(attendanceTable.date, dateStr)));
    const dayPresent = dayAttendance.filter((a) => a.status === "present").length;
    const pct = dayAttendance.length > 0 ? (dayPresent / dayAttendance.length) * 100 : 0;
    recentAttendance.push({ date: dateStr, percentage: Math.round(pct) });
  }

  // Latest announcements
  const announcements = await db.select().from(announcementsTable).where(eq(announcementsTable.schoolId, schoolId)).orderBy(sql`${announcementsTable.createdAt} desc`).limit(3);

  res.json(
    GetSchoolDashboardResponse.parse({
      studentCount: studentCount.count,
      teacherCount: teacherCount.count,
      classCount: classCount.count,
      attendanceToday: Math.round(attendanceRate),
      feesCollected,
      recentAttendance,
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        audience: a.audience,
        schoolId: a.schoolId,
        createdAt: a.createdAt.toISOString(),
      })),
    }),
  );
});

export default router;
