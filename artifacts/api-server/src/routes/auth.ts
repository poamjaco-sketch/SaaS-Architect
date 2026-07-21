import { Router, type IRouter } from "express";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { db, usersTable, otpCodesTable, sessionsTable } from "@workspace/db";
import {
  RequestOtpBody,
  VerifyOtpBody,
  GetMeResponse,
  RequestOtpResponse,
  VerifyOtpResponse,
  LogoutResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function getUserFromToken(token: string) {
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())));
  if (!session) return null;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  return user ?? null;
}

// Middleware to get authenticated user
async function requireAuth(req: any, res: any, next: any): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const user = await getUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.user = user;
  next();
}

export { requireAuth, getUserFromToken };

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = RequestOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone } = parsed.data;

  // For demo: always use OTP "123456"
  const otp = process.env.NODE_ENV === "production" ? generateOtp() : "123456";
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await db.insert(otpCodesTable).values({ phone, code: otp, expiresAt });

  // In production, send via SMS. In dev, log it.
  req.log.info({ phone, otp }, "OTP generated");

  res.json(RequestOtpResponse.parse({ success: true, message: `OTP sent to ${phone}` }));
});

router.post("/auth/verify", async (req, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone, otp } = parsed.data;

  // Find valid OTP
  const [otpRecord] = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.phone, phone),
        eq(otpCodesTable.code, otp),
        eq(otpCodesTable.used, "false"),
        gt(otpCodesTable.expiresAt, new Date()),
      ),
    )
    .orderBy(otpCodesTable.createdAt)
    .limit(1);

  if (!otpRecord) {
    res.status(401).json({ error: "Invalid or expired OTP" });
    return;
  }

  // Mark OTP as used
  await db.update(otpCodesTable).set({ used: "true" }).where(eq(otpCodesTable.id, otpRecord.id));

  // Get or create user
  let [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (!user) {
    const [newUser] = await db
      .insert(usersTable)
      .values({ phone, role: "parent" })
      .returning();
    user = newUser;
  }

  // Create session
  const token = generateToken();
  const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt: sessionExpiry });

  res.json(
    VerifyOtpResponse.parse({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    }),
  );
});

router.get("/auth/me", requireAuth, async (req: any, res): Promise<void> => {
  const user = req.user;
  res.json(
    GetMeResponse.parse({
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    }),
  );
});

router.post("/auth/logout", requireAuth, async (req: any, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.slice(7);
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.json(LogoutResponse.parse({ success: true }));
});

export default router;
