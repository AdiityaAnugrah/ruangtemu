import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { notificationService } from "../services/notificationService";

const router = Router();

const dinnerSchema = z.object({
  cityId: z.string(),
  date: z.string().datetime(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  maxPerTable: z.number().int().min(2).max(10).optional(),
  venueName: z.string().optional().nullable(),
  venueAddress: z.string().optional().nullable(),
  budgetTiers: z.array(z.object({
    label: z.string().min(1),
    price: z.number().int().positive(),
  })).min(1),
});

// GET /api/dinners (public - list upcoming)
router.get("/", async (req: Request, res: Response) => {
  const { cityId, status } = z.object({
    cityId: z.string().optional(),
    status: z.string().optional(),
  }).parse(req.query);

  const dinners = await prisma.dinner.findMany({
    where: {
      cityId: cityId || undefined,
      status: status ? (status as any) : { in: ["OPEN", "MATCHING", "CONFIRMED"] },
      date: { gte: new Date() },
      city: { isActive: true },
    },
    include: {
      city: { select: { id: true, name: true } },
      budgetTiers: true,
      _count: { select: { bookings: true } },
    },
    orderBy: { date: "asc" },
  });

  res.json(dinners.map((d) => ({
    ...d,
    venueName: d.status === "CONFIRMED" || d.status === "COMPLETED" ? d.venueName : "Akan diumumkan H-1",
    venueAddress: d.status === "CONFIRMED" || d.status === "COMPLETED" ? d.venueAddress : null,
  })));
});

// GET /api/dinners/all (admin - semua dinner)
router.get("/all", authenticate, requireAdmin, async (req: Request, res: Response) => {
  const dinners = await prisma.dinner.findMany({
    include: {
      city: { select: { id: true, name: true } },
      budgetTiers: true,
      _count: { select: { bookings: true, tables: true } },
    },
    orderBy: { date: "desc" },
  });
  res.json(dinners);
});

// GET /api/dinners/:id (public)
router.get("/:id", async (req: Request, res: Response) => {
  const dinner = await prisma.dinner.findUnique({
    where: { id: req.params.id },
    include: {
      city: true,
      budgetTiers: true,
      _count: { select: { bookings: true } },
    },
  });
  if (!dinner || !dinner.city.isActive) { res.status(404).json({ message: "Dinner tidak ditemukan" }); return; }

  const isRevealed = dinner.status === "CONFIRMED" || dinner.status === "COMPLETED";
  res.json({
    ...dinner,
    venueName: isRevealed ? dinner.venueName : "Akan diumumkan H-1",
    venueAddress: isRevealed ? dinner.venueAddress : null,
  });
});

// POST /api/dinners (admin)
router.post("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const data = dinnerSchema.parse(req.body);
  const dinner = await prisma.dinner.create({
    data: {
      cityId: data.cityId,
      date: new Date(data.date),
      startTime: data.startTime,
      maxPerTable: data.maxPerTable ?? 6,
      venueName: data.venueName,
      venueAddress: data.venueAddress,
      budgetTiers: { create: data.budgetTiers },
    },
    include: { budgetTiers: true, city: true },
  });
  res.status(201).json(dinner);
});

// PUT /api/dinners/:id (admin)
router.put("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const data = dinnerSchema.partial().parse(req.body);
  const { budgetTiers, date, ...rest } = data;

  const dinner = await prisma.dinner.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      date: date ? new Date(date) : undefined,
    },
    include: { budgetTiers: true, city: true },
  });
  res.json(dinner);
});

// PATCH /api/dinners/:id/status (admin)
router.patch("/:id/status", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { status } = z.object({
    status: z.enum(["OPEN", "MATCHING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
  }).parse(req.body);
  const dinner = await prisma.dinner.update({
    where: { id: req.params.id },
    data: { status: status as any },
  });
  res.json(dinner);
});

// PATCH /api/dinners/:id/reveal (admin - reveal lokasi H-1)
router.patch("/:id/reveal", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { venueName, venueAddress } = z.object({
    venueName: z.string(),
    venueAddress: z.string(),
  }).parse(req.body);

  const dinner = await prisma.dinner.update({
    where: { id: req.params.id },
    data: {
      venueName,
      venueAddress,
      revealedAt: new Date(),
      status: "CONFIRMED",
    },
    include: { city: true },
  });

  const bookings = await prisma.booking.findMany({
    where: { dinnerId: dinner.id, status: "MATCHED" },
    include: { user: true },
  });

  let notificationsSent = 0;
  for (const booking of bookings) {
    try {
      const sent = await notificationService.sendLocationReveal(booking.user, {
        id: dinner.id,
        date: dinner.date,
        city: dinner.city,
        venueName,
        venueAddress,
      });
      if (sent) notificationsSent++;
    } catch (err) {
      logger.error({ err, bookingId: booking.id }, "Failed to send location reveal notification");
    }
  }

  res.json({ ...dinner, notificationsSent });
});

// DELETE /api/dinners/:id (admin)
router.delete("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  await prisma.dinner.update({ where: { id: req.params.id }, data: { status: "CANCELLED" } });
  res.json({ message: "Dinner dibatalkan" });
});

export default router;
