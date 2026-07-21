import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, schoolsTable, usersTable, studentsTable, teachersTable } from "@workspace/db";
import {
  CreateSchoolBody,
  UpdateSchoolBody,
  UpdateSchoolStatusBody,
  UpdateSchoolStatusParams,
  GetSchoolByIdParams,
  UpdateSchoolParams,
  ListAllSchoolsQueryParams,
  CreateSchoolResponse,
  UpdateSchoolResponse,
  UpdateSchoolStatusResponse,
  GetSchoolByIdResponse,
  GetSuperAdminDashboardResponse,
  GetPlatformAnalyticsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

function formatSchool(school: any, studentCount = 0, teacherCount = 0) {
  return {
    id: school.id,
    name: school.name,
    location: school.location,
    schoolType: school.schoolType,
    logoUrl: school.logoUrl,
    plan: school.plan,
    status: school.status,
    adminPhone: school.adminPhone,
    studentCount,
    teacherCount,
    createdAt: school.createdAt.toISOString(),
  };
}

router.get("/admin/dashboard", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [schoolCount] = await db.select({ count: count() }).from(schoolsTable).where(eq(schoolsTable.status, "active"));
  const [studentCount] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.status, "active"));
  const [teacherCount] = await db.select({ count: count() }).from(teachersTable).where(eq(teachersTable.status, "active"));

  const recentSchools = await db.select().from(schoolsTable).orderBy(sql`${schoolsTable.createdAt} desc`).limit(5);

  const studentCounts = await db
    .select({ schoolId: studentsTable.schoolId, count: count() })
    .from(studentsTable)
    .groupBy(studentsTable.schoolId);
  const teacherCounts = await db
    .select({ schoolId: teachersTable.schoolId, count: count() })
    .from(teachersTable)
    .groupBy(teachersTable.schoolId);

  const studentMap = new Map(studentCounts.map((r) => [r.schoolId, r.count]));
  const teacherMap = new Map(teacherCounts.map((r) => [r.schoolId, r.count]));

  const [starterCount] = await db.select({ count: count() }).from(schoolsTable).where(eq(schoolsTable.plan, "starter"));
  const [proCount] = await db.select({ count: count() }).from(schoolsTable).where(eq(schoolsTable.plan, "professional"));
  const [entCount] = await db.select({ count: count() }).from(schoolsTable).where(eq(schoolsTable.plan, "enterprise"));

  res.json(
    GetSuperAdminDashboardResponse.parse({
      totalSchools: schoolCount.count,
      activeStudents: studentCount.count,
      totalTeachers: teacherCount.count,
      monthlyRevenue: proCount.count * 500 + entCount.count * 1500 + starterCount.count * 150,
      recentSchools: recentSchools.map((s) =>
        formatSchool(s, studentMap.get(s.id) ?? 0, teacherMap.get(s.id) ?? 0),
      ),
      schoolsByPlan: {
        starter: starterCount.count,
        professional: proCount.count,
        enterprise: entCount.count,
      },
    }),
  );
});

router.get("/admin/schools", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const params = ListAllSchoolsQueryParams.safeParse(req.query);
  let query = db.select().from(schoolsTable);

  const schools = await query.orderBy(sql`${schoolsTable.createdAt} desc`);

  const studentCounts = await db
    .select({ schoolId: studentsTable.schoolId, count: count() })
    .from(studentsTable)
    .groupBy(studentsTable.schoolId);
  const teacherCounts = await db
    .select({ schoolId: teachersTable.schoolId, count: count() })
    .from(teachersTable)
    .groupBy(teachersTable.schoolId);

  const studentMap = new Map(studentCounts.map((r) => [r.schoolId, r.count]));
  const teacherMap = new Map(teacherCounts.map((r) => [r.schoolId, r.count]));

  let result = schools.map((s) => formatSchool(s, studentMap.get(s.id) ?? 0, teacherMap.get(s.id) ?? 0));

  if (params.success && params.data.status) {
    result = result.filter((s) => s.status === params.data.status);
  }
  if (params.success && params.data.search) {
    const q = params.data.search.toLowerCase();
    result = result.filter((s) => s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q));
  }

  res.json(result);
});

router.post("/admin/schools", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = CreateSchoolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [school] = await db
    .insert(schoolsTable)
    .values({
      name: parsed.data.name,
      location: parsed.data.location,
      schoolType: parsed.data.schoolType,
      adminPhone: parsed.data.adminPhone,
      logoUrl: parsed.data.logoUrl,
      plan: (parsed.data.plan as any) ?? "starter",
      status: "active",
    })
    .returning();

  const [studentCount] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.schoolId, school.id));
  const [teacherCount] = await db.select({ count: count() }).from(teachersTable).where(eq(teachersTable.schoolId, school.id));

  res.status(201).json(CreateSchoolResponse.parse(formatSchool(school, studentCount.count, teacherCount.count)));
});

router.get("/admin/schools/:schoolId", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.schoolId) ? req.params.schoolId[0] : req.params.schoolId;
  const schoolId = parseInt(rawId, 10);

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId));
  if (!school) {
    res.status(404).json({ error: "School not found" });
    return;
  }

  const [studentCount] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.schoolId, schoolId));
  const [teacherCount] = await db.select({ count: count() }).from(teachersTable).where(eq(teachersTable.schoolId, schoolId));

  res.json(
    GetSchoolByIdResponse.parse({
      ...formatSchool(school, studentCount.count, teacherCount.count),
      features: {
        attendance: school.featureAttendance === "true",
        results: school.featureResults === "true",
        fees: school.featureFees === "true",
        sms: school.featureSms === "true",
        library: school.featureLibrary === "true",
      },
    }),
  );
});

router.patch("/admin/schools/:schoolId", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.schoolId) ? req.params.schoolId[0] : req.params.schoolId;
  const schoolId = parseInt(rawId, 10);

  const parsed = UpdateSchoolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [school] = await db
    .update(schoolsTable)
    .set(parsed.data as any)
    .where(eq(schoolsTable.id, schoolId))
    .returning();

  if (!school) {
    res.status(404).json({ error: "School not found" });
    return;
  }

  const [studentCount] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.schoolId, schoolId));
  const [teacherCount] = await db.select({ count: count() }).from(teachersTable).where(eq(teachersTable.schoolId, schoolId));

  res.json(UpdateSchoolResponse.parse(formatSchool(school, studentCount.count, teacherCount.count)));
});

router.patch("/admin/schools/:schoolId/status", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.schoolId) ? req.params.schoolId[0] : req.params.schoolId;
  const schoolId = parseInt(rawId, 10);

  const parsed = UpdateSchoolStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [school] = await db
    .update(schoolsTable)
    .set({ status: parsed.data.status as any })
    .where(eq(schoolsTable.id, schoolId))
    .returning();

  if (!school) {
    res.status(404).json({ error: "School not found" });
    return;
  }

  const [studentCount] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.schoolId, schoolId));
  const [teacherCount] = await db.select({ count: count() }).from(teachersTable).where(eq(teachersTable.schoolId, schoolId));

  res.json(UpdateSchoolStatusResponse.parse(formatSchool(school, studentCount.count, teacherCount.count)));
});

router.get("/admin/analytics", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const schools = await db.select().from(schoolsTable).orderBy(sql`${schoolsTable.createdAt} desc`).limit(5);

  const studentCounts = await db
    .select({ schoolId: studentsTable.schoolId, count: count() })
    .from(studentsTable)
    .groupBy(studentsTable.schoolId);
  const teacherCounts = await db
    .select({ schoolId: teachersTable.schoolId, count: count() })
    .from(teachersTable)
    .groupBy(teachersTable.schoolId);

  const studentMap = new Map(studentCounts.map((r) => [r.schoolId, r.count]));
  const teacherMap = new Map(teacherCounts.map((r) => [r.schoolId, r.count]));

  // Monthly growth — mock a 6-month trend based on DB counts
  const totalSchools = (await db.select({ count: count() }).from(schoolsTable))[0].count;
  const totalStudents = (await db.select({ count: count() }).from(studentsTable))[0].count;
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const monthlyGrowth = months.map((month, i) => ({
    month,
    schools: Math.max(0, totalSchools - (5 - i) * 3),
    students: Math.max(0, totalStudents - (5 - i) * 120),
  }));

  res.json(
    GetPlatformAnalyticsResponse.parse({
      monthlyGrowth,
      topSchools: schools.map((s) => formatSchool(s, studentMap.get(s.id) ?? 0, teacherMap.get(s.id) ?? 0)),
    }),
  );
});

export default router;
