import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { isAvailableLocation } from "../lib/locations";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";

const router = Router();
const phoneSchema = z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Gunakan format internasional, contoh +6281234567890");

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: phoneSchema.optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  birthDate: z.string().datetime().optional().nullable(),
  city: z.string().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  activity: z.string().max(80).optional().nullable(),
  industry: z.string().max(120).optional().nullable(),
  socialComfort: z.number().int().min(1).max(5).optional().nullable(),
  leisureTopics: z.array(z.string().max(80)).max(3).optional().nullable(),
  conversationTopics: z.array(z.string().max(80)).max(3).optional().nullable(),
  smokes: z.boolean().optional().nullable(),
  drinksAlcohol: z.boolean().optional().nullable(),
  dietaryNotes: z.string().max(500).optional().nullable(),
  interestIds: z.array(z.string()).min(3, "Pilih minimal 3 minat").optional(),
});

// GET /api/users/me/bookings
router.get("/me/bookings", authenticate, async (req: AuthRequest, res: Response) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.id },
    include: {
      dinner: { include: { city: true } },
      budgetTier: true,
      payment: true,
      table: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(bookings);
});

// PATCH /api/users/me
router.patch("/me", authenticate, async (req: AuthRequest, res: Response) => {
  const data = updateProfileSchema.parse(req.body);
  const { interestIds, ...rest } = data;

  if (rest.city !== undefined && rest.city !== null && !(await isAvailableLocation(rest.city))) {
    res.status(400).json({ message: "Wilayah domisili belum tersedia" });
    return;
  }

  if (rest.phone) {
    const phoneOwner = await prisma.user.findUnique({ where: { phone: rest.phone } });
    if (phoneOwner && phoneOwner.id !== req.user!.id) {
      res.status(409).json({ message: "No. HP sudah terdaftar" });
      return;
    }
  }

  const updateData: any = {
    ...rest,
    birthDate: rest.birthDate ? new Date(rest.birthDate) : undefined,
  };

  if (interestIds !== undefined) {
    const validInterestCount = await prisma.interest.count({
      where: { id: { in: interestIds } },
    });
    if (validInterestCount !== new Set(interestIds).size) {
      res.status(400).json({ message: "Minat tidak valid" });
      return;
    }

    // Replace all interests
    await prisma.userInterest.deleteMany({ where: { userId: req.user!.id } });
    updateData.interests = {
      create: [...new Set(interestIds)].map((interestId) => ({ interestId })),
    };
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: updateData,
    select: {
      id: true, email: true, name: true, phone: true,
      gender: true, birthDate: true, city: true, bio: true,
      activity: true, industry: true, socialComfort: true,
      leisureTopics: true, conversationTopics: true,
      smokes: true, drinksAlcohol: true, dietaryNotes: true,
      avatarUrl: true, role: true,
      interests: { include: { interest: true } },
    },
  });

  res.json(user);
});

// --- Admin routes ---

// GET /api/users (admin)
router.get("/", authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, phone: true,
      gender: true, city: true, role: true, isVerified: true, isSuspended: true,
      activity: true, industry: true, socialComfort: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

// GET /api/users/:id (admin)
router.get("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, email: true, name: true, phone: true,
      gender: true, birthDate: true, city: true, bio: true, avatarUrl: true,
      activity: true, industry: true, socialComfort: true,
      leisureTopics: true, conversationTopics: true,
      smokes: true, drinksAlcohol: true, dietaryNotes: true,
      role: true, isVerified: true, isSuspended: true, createdAt: true,
      interests: { include: { interest: true } },
      bookings: { include: { dinner: { include: { city: true } }, budgetTier: true, payment: true }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!user) { res.status(404).json({ message: "User tidak ditemukan" }); return; }
  res.json(user);
});

// PATCH /api/users/:id/role (admin)
router.patch("/:id/role", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { role } = z.object({ role: z.enum(["USER", "ADMIN"]) }).parse(req.body);
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: role as any }, select: { id: true, role: true } });
  res.json(user);
});

// PATCH /api/users/:id/suspend (admin)
router.patch("/:id/suspend", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { isSuspended } = z.object({ isSuspended: z.boolean() }).parse(req.body);
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isSuspended }, select: { id: true, isSuspended: true } });
  res.json(user);
});

export default router;
