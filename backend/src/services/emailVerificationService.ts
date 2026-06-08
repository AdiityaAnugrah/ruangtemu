import argon2 from "argon2";
import { randomInt } from "crypto";
import { prisma } from "../lib/prisma";
import { getNumberSetting } from "../lib/settings";
import { notificationService } from "./notificationService";

type UserForVerification = {
  id: string;
  email: string;
  name: string;
  role?: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  isSuspended?: boolean;
};

type ServiceError = Error & { status?: number };

function serviceError(message: string, status = 400): ServiceError {
  const error = new Error(message) as ServiceError;
  error.status = status;
  return error;
}

function createCode(): string {
  return randomInt(100000, 1000000).toString();
}

export const emailVerificationService = {
  async issue(user: UserForVerification): Promise<{ expiresAt: Date; devCode?: string }> {
    const expiresMinutes = await getNumberSetting("email_verification_code_expires_minutes", "EMAIL_VERIFICATION_CODE_EXPIRES_MINUTES", 15);
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
    const code = createCode();
    const codeHash = await argon2.hash(code);

    await prisma.$transaction([
      prisma.emailVerificationCode.deleteMany({
        where: { userId: user.id, consumedAt: null },
      }),
      prisma.emailVerificationCode.create({
        data: {
          userId: user.id,
          codeHash,
          expiresAt,
        },
      }),
    ]);

    await notificationService.sendEmailVerificationCode(user, code, expiresAt);

    return {
      expiresAt,
      devCode: process.env.NODE_ENV === "production" ? undefined : code,
    };
  },

  async verify(email: string, code: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isVerified: true,
        isSuspended: true,
      },
    });

    if (!user) throw serviceError("User tidak ditemukan", 404);
    if (user.isSuspended) throw serviceError("Akun disuspend. Hubungi admin.", 403);
    if (user.isVerified) throw serviceError("Email sudah diverifikasi. Silakan login.", 400);

    const verification = await prisma.emailVerificationCode.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification || verification.expiresAt < new Date()) {
      throw serviceError("Kode verifikasi sudah kedaluwarsa. Minta kode baru.", 400);
    }

    if (verification.attempts >= 5) {
      throw serviceError("Percobaan verifikasi terlalu banyak. Minta kode baru.", 429);
    }

    const valid = await argon2.verify(verification.codeHash, code);
    if (!valid) {
      await prisma.emailVerificationCode.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      throw serviceError("Kode verifikasi tidak valid", 400);
    }

    const verifiedAt = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      }),
      prisma.emailVerificationCode.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: verifiedAt },
      }),
    ]);

    return {
      ...user,
      isVerified: true,
    };
  },
};
