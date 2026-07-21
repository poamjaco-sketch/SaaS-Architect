import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schoolPlanEnum = pgEnum("school_plan", ["starter", "professional", "enterprise"]);
export const schoolStatusEnum = pgEnum("school_status", ["active", "inactive", "pending"]);

export const schoolsTable = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  schoolType: text("school_type"),
  logoUrl: text("logo_url"),
  plan: schoolPlanEnum("plan").notNull().default("starter"),
  status: schoolStatusEnum("status").notNull().default("pending"),
  adminPhone: text("admin_phone").notNull(),
  // Feature flags
  featureAttendance: text("feature_attendance").notNull().default("true"),
  featureResults: text("feature_results").notNull().default("true"),
  featureFees: text("feature_fees").notNull().default("true"),
  featureSms: text("feature_sms").notNull().default("true"),
  featureLibrary: text("feature_library").notNull().default("false"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSchoolSchema = createInsertSchema(schoolsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schoolsTable.$inferSelect;
