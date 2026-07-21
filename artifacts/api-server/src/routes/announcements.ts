import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, announcementsTable, notificationsTable } from "@workspace/db";
import {
  CreateAnnouncementBody,
  CreateAnnouncementResponse,
  GetParentNotificationsResponseItem,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/schools/:schoolId/announcements", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const announcements = await db
    .select()
    .from(announcementsTable)
    .where(eq(announcementsTable.schoolId, schoolId))
    .orderBy(sql`${announcementsTable.createdAt} desc`);

  res.json(
    announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      audience: a.audience,
      schoolId: a.schoolId,
      createdAt: a.createdAt.toISOString(),
    })),
  );
});

router.post("/schools/:schoolId/announcements", requireAuth, async (req, res): Promise<void> => {
  const schoolId = parseId(req.params.schoolId);
  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [announcement] = await db
    .insert(announcementsTable)
    .values({
      title: parsed.data.title,
      content: parsed.data.content,
      audience: (parsed.data.audience as any) ?? "all",
      schoolId,
    })
    .returning();

  res.status(201).json(
    CreateAnnouncementResponse.parse({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      audience: announcement.audience,
      schoolId: announcement.schoolId,
      createdAt: announcement.createdAt.toISOString(),
    }),
  );
});

router.get("/parent/notifications", requireAuth, async (req: any, res): Promise<void> => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.user.id))
    .orderBy(sql`${notificationsTable.createdAt} desc`)
    .limit(50);

  res.json(
    notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read === "true",
      createdAt: n.createdAt.toISOString(),
    })),
  );
});

export default router;
