import { Router, Request, Response } from "express";
import { z } from "zod";
import argon2 from "argon2";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { prisma } from "../lib/prisma";
import { signAccess, signRefresh, verifyRefresh } from "../lib/jwt";
import { isAvailableLocation } from "../lib/locations";
import { verifyGoogleIdToken } from "../lib/googleToken";
import { authenticate, AuthRequest } from "../middlewares/auth";
import { emailVerificationService } from "../services/emailVerificationService";

const router = Router();
const phoneSchema = z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Gunakan format internasional, contoh +6281234567890");

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, "Harus ada huruf kapital").regex(/[0-9]/, "Harus ada angka"),
  phone: phoneSchema.optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  birthDate: z.string().datetime(),
  city: z.string().min(2).max(120),
  interestIds: z.array(z.string()).min(3, "Pilih minimal 3 minat"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Kode harus 6 digit"),
});

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

const googleAuthSchema = z.object({
  idToken: z.string().min(20),
});

const googleStartSchema = z.object({
  redirectTo: z.string().url().optional(),
});

async function createSession(user: { id: string; role: string }) {
  const accessToken = signAccess(user.id, user.role);
  const refreshToken = signRefresh(user.id, user.role);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt } });

  return { accessToken, refreshToken };
}

function googleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || `http://localhost:${process.env.PORT || "3200"}/auth/google/callback`;
}

function frontendUrl() {
  return process.env.FRONTEND_URL || "http://localhost:3201";
}

function allowedFrontendRedirect(value?: string): string {
  const fallback = `${frontendUrl()}/auth/google/callback`;
  if (!value) return fallback;

  try {
    const target = new URL(value);
    const frontend = new URL(frontendUrl());
    const localOrigins = new Set(["http://localhost:3201", "http://127.0.0.1:3201"]);
    if (target.origin === frontend.origin || localOrigins.has(target.origin)) return target.toString();
  } catch {
    return fallback;
  }

  return fallback;
}

function hmac(value: string): string {
  return createHmac("sha256", process.env.JWT_SECRET || "dev-secret").update(value).digest("base64url");
}

function signState(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${hmac(encoded)}`;
}

function verifyState<T>(state: string): T {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) throw new Error("State OAuth tidak valid");

  const expected = hmac(encoded);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw new Error("State OAuth tidak valid");
  }

  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
}

function verificationResponse(email: string, issued: { expiresAt: Date; devCode?: string }) {
  return {
    message: "Kode verifikasi sudah dikirim ke email",
    requiresVerification: true,
    email,
    expiresAt: issued.expiresAt,
    ...(issued.devCode ? { devVerificationCode: issued.devCode } : {}),
  };
}

async function upsertGoogleUserSession(googleUser: { googleId: string; email: string; name: string; picture?: string }) {
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { googleId: googleUser.googleId },
        { email: googleUser.email },
      ],
    },
  });

  if (user?.isSuspended) {
    throw Object.assign(new Error("Akun disuspend. Hubungi admin."), { status: 403 });
  }

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: user.googleId ?? googleUser.googleId,
        avatarUrl: user.avatarUrl ?? googleUser.picture,
        isVerified: true,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: googleUser.email,
        name: googleUser.name,
        passwordHash: await argon2.hash(randomUUID()),
        googleId: googleUser.googleId,
        authProvider: "GOOGLE",
        avatarUrl: googleUser.picture,
        isVerified: true,
      },
    });
  }

  await prisma.emailVerificationCode.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const session = await createSession(user);
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl },
    ...session,
  };
}

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);
  const email = data.email.toLowerCase();

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    if (!exists.isVerified) {
      const issued = await emailVerificationService.issue(exists);
      res.status(409).json({
        ...verificationResponse(exists.email, issued),
        message: "Email sudah terdaftar tetapi belum diverifikasi. Kode baru sudah dikirim.",
      });
      return;
    }
    res.status(409).json({ message: "Email sudah terdaftar" });
    return;
  }

  if (data.phone) {
    const phoneExists = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (phoneExists) {
      res.status(409).json({ message: "No. HP sudah terdaftar" });
      return;
    }
  }

  if (!(await isAvailableLocation(data.city))) {
    res.status(400).json({ message: "Wilayah domisili belum tersedia" });
    return;
  }

  const validInterestCount = await prisma.interest.count({
    where: { id: { in: data.interestIds } },
  });
  if (validInterestCount !== new Set(data.interestIds).size) {
    res.status(400).json({ message: "Minat tidak valid" });
    return;
  }

  const passwordHash = await argon2.hash(data.password);
  const user = await prisma.user.create({
    data: {
      email,
      name: data.name,
      passwordHash,
      phone: data.phone,
      gender: data.gender as any,
      birthDate: new Date(data.birthDate),
      city: data.city,
      isVerified: false,
      interests: {
        create: [...new Set(data.interestIds)].map((interestId) => ({ interestId })),
      },
    },
    select: { id: true, email: true, name: true, role: true },
  });

  const issued = await emailVerificationService.issue(user);

  res.status(201).json(verificationResponse(user.email, issued));
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    res.status(401).json({ message: "Email atau password salah" });
    return;
  }

  if (user.isSuspended) {
    res.status(403).json({ message: "Akun disuspend. Hubungi admin." });
    return;
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    res.status(401).json({ message: "Email atau password salah" });
    return;
  }

  if (!user.isVerified) {
    const issued = await emailVerificationService.issue(user);
    res.status(403).json({
      ...verificationResponse(user.email, issued),
      message: "Email belum diverifikasi. Masukkan kode yang kami kirim ke email kamu.",
    });
    return;
  }

  const { accessToken, refreshToken } = await createSession(user);

  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl },
    accessToken,
    refreshToken,
  });
});

// POST /api/auth/verify-email
router.post("/verify-email", async (req: Request, res: Response) => {
  const { email, code } = verifyEmailSchema.parse(req.body);
  const user = await emailVerificationService.verify(email, code);
  const { accessToken, refreshToken } = await createSession(user);

  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl },
    accessToken,
    refreshToken,
  });
});

// POST /api/auth/resend-verification
router.post("/resend-verification", async (req: Request, res: Response) => {
  const { email } = resendVerificationSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true, isVerified: true },
  });

  if (!user) {
    res.status(404).json({ message: "User tidak ditemukan" });
    return;
  }

  if (user.isVerified) {
    res.json({ message: "Email sudah diverifikasi", email: user.email, requiresVerification: false });
    return;
  }

  const issued = await emailVerificationService.issue(user);
  res.json(verificationResponse(user.email, issued));
});

// GET /api/auth/google/start
router.get("/google/start", async (req: Request, res: Response) => {
  const { redirectTo } = googleStartSchema.parse(req.query);
  const safeRedirectTo = allowedFrontendRedirect(redirectTo);
  const state = signState({
    redirectTo: safeRedirectTo,
    nonce: randomUUID(),
    createdAt: Date.now(),
  });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state,
  });

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    res.status(500).json({ message: "Google OAuth belum dikonfigurasi" });
    return;
  }

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /api/auth/google/callback
router.get("/google/callback", async (req: Request, res: Response) => {
  const { code, state, error } = z.object({
    code: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
  }).parse(req.query);

  let redirectTo = `${frontendUrl()}/auth/google/callback`;

  try {
    if (state) {
      const parsed = verifyState<{ redirectTo: string; createdAt: number }>(state);
      redirectTo = allowedFrontendRedirect(parsed.redirectTo);
      if (!parsed.createdAt || Date.now() - parsed.createdAt > 10 * 60 * 1000) {
        throw new Error("Sesi login Google sudah kedaluwarsa");
      }
    }

    if (error) throw new Error(`Google login dibatalkan: ${error}`);
    if (!code) throw new Error("Kode Google OAuth tidak ditemukan");
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error("Google OAuth belum dikonfigurasi");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: googleRedirectUri(),
        grant_type: "authorization_code",
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as { id_token?: string; error_description?: string };
    if (!tokenResponse.ok || !tokenData.id_token) {
      throw new Error(tokenData.error_description || "Gagal menukar kode Google");
    }

    const googleUser = await verifyGoogleIdToken(tokenData.id_token);
    const authResult = await upsertGoogleUserSession(googleUser);
    const authHash = new URLSearchParams({
      accessToken: authResult.accessToken,
      refreshToken: authResult.refreshToken,
      user: JSON.stringify(authResult.user),
    });

    res.redirect(`${redirectTo}#${authHash.toString()}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login Google gagal";
    const errorParams = new URLSearchParams({ error: message });
    res.redirect(`${redirectTo}?${errorParams.toString()}`);
  }
});

// POST /api/auth/google
router.post("/google", async (req: Request, res: Response) => {
  const { idToken } = googleAuthSchema.parse(req.body);
  const googleUser = await verifyGoogleIdToken(idToken);
  res.json(await upsertGoogleUserSession(googleUser));
});

// POST /api/auth/refresh
router.post("/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) {
    res.status(401).json({ message: "Refresh token tidak valid" });
    return;
  }

  const payload = verifyRefresh(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true } });
  if (!user) {
    res.status(401).json({ message: "User tidak ditemukan" });
    return;
  }

  // Rotate refresh token
  await prisma.refreshToken.delete({ where: { token: refreshToken } });
  const newAccessToken = signAccess(user.id, user.role);
  const newRefreshToken = signRefresh(user.id, user.role);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.refreshToken.create({ data: { userId: user.id, token: newRefreshToken, expiresAt } });

  res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
});

// POST /api/auth/logout
router.post("/logout", authenticate, async (req: AuthRequest, res: Response) => {
  const { refreshToken } = z.object({ refreshToken: z.string().optional() }).parse(req.body);
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  res.json({ message: "Logout berhasil" });
});

// GET /api/auth/me
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, name: true, phone: true,
      gender: true, birthDate: true, city: true, bio: true,
      avatarUrl: true, role: true, isVerified: true,
      interests: { include: { interest: true } },
    },
  });
  res.json(user);
});

export default router;
