import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";
import { matchingService } from "../services/matchingService";

const router = Router();

function calculateAge(birthDate?: Date | null): number {
  if (!birthDate) return 0;
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) return age - 1;
  return age;
}

function formatParticipant(booking: any) {
  return {
    bookingId: booking.id,
    status: booking.status,
    userId: booking.user.id,
    name: booking.user.name,
    gender: booking.user.gender,
    age: calculateAge(booking.user.birthDate),
    location: booking.user.city,
    avatarUrl: booking.user.avatarUrl,
    interests: booking.user.interests?.map((ui: any) => ui.interest?.name).filter(Boolean) ?? [],
    matchProfile: {
      activity: booking.user.activity,
      industry: booking.user.industry,
      socialComfort: booking.user.socialComfort,
      personalityType: booking.user.personalityType,
      leisureTopics: Array.isArray(booking.user.leisureTopics) ? booking.user.leisureTopics : [],
      conversationTopics: Array.isArray(booking.user.conversationTopics) ? booking.user.conversationTopics : [],
      smokes: booking.user.smokes,
      drinksAlcohol: booking.user.drinksAlcohol,
      dietaryNotes: booking.user.dietaryNotes,
    },
  };
}

const participantInclude = {
  user: {
    select: {
      id: true,
      name: true,
      gender: true,
      birthDate: true,
      avatarUrl: true,
      city: true,
      activity: true,
      industry: true,
      socialComfort: true,
      personalityType: true,
      leisureTopics: true,
      conversationTopics: true,
      smokes: true,
      drinksAlcohol: true,
      dietaryNotes: true,
      interests: { include: { interest: true } },
    },
  },
};

// GET /api/matching/:dinnerId/preview (admin - dry run)
router.get("/:dinnerId/preview", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const result = await matchingService.preview(req.params.dinnerId);
  res.json(result);
});

// POST /api/matching/:dinnerId/commit (admin - eksekusi)
router.post("/:dinnerId/commit", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const result = await matchingService.commit(req.params.dinnerId);
  res.json({ message: "Matching berhasil", ...result });
});

// GET /api/matching/:dinnerId/tables (admin - lihat tabel setelah matching)
router.get("/:dinnerId/tables", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const tables = await prisma.dinnerTable.findMany({
    where: { dinnerId: req.params.dinnerId },
    include: {
      bookings: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              gender: true,
              birthDate: true,
              avatarUrl: true,
              city: true,
              activity: true,
              industry: true,
              socialComfort: true,
              personalityType: true,
              leisureTopics: true,
              conversationTopics: true,
              smokes: true,
              drinksAlcohol: true,
              dietaryNotes: true,
              interests: { include: { interest: true } },
            },
          },
        },
      },
    },
  });
  res.json(tables);
});

// GET /api/matching/:dinnerId/manual (admin - board manual matching)
router.get("/:dinnerId/manual", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const dinner = await prisma.dinner.findUnique({
    where: { id: req.params.dinnerId },
    include: { city: true, _count: { select: { bookings: true } } },
  });
  if (!dinner) { res.status(404).json({ message: "Dinner tidak ditemukan" }); return; }

  const [tables, unassigned] = await Promise.all([
    prisma.dinnerTable.findMany({
      where: { dinnerId: dinner.id },
      orderBy: { name: "asc" },
      include: {
        bookings: {
          where: { status: { in: ["CONFIRMED", "MATCHED"] } },
          include: participantInclude,
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.booking.findMany({
      where: { dinnerId: dinner.id, status: { in: ["CONFIRMED", "MATCHED"] }, tableId: null },
      include: participantInclude,
      orderBy: { createdAt: "asc" },
    }),
  ]);

  res.json({
    dinner,
    tables: tables.map((table) => ({
      id: table.id,
      name: table.name,
      venueTableLabel: table.venueTableLabel,
      participants: table.bookings.map(formatParticipant),
    })),
    unassigned: unassigned.map(formatParticipant),
  });
});

// POST /api/matching/:dinnerId/manual/setup (admin - buat meja kosong untuk matching manual)
router.post("/:dinnerId/manual/setup", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const body = z.object({ tableCount: z.number().int().min(1).max(50).optional() }).parse(req.body);
  const dinner = await prisma.dinner.findUnique({
    where: { id: req.params.dinnerId },
    include: { _count: { select: { bookings: true } } },
  });
  if (!dinner) { res.status(404).json({ message: "Dinner tidak ditemukan" }); return; }

  const participantCount = await prisma.booking.count({
    where: { dinnerId: dinner.id, status: { in: ["CONFIRMED", "MATCHED"] } },
  });
  const desiredCount = body.tableCount ?? Math.max(1, Math.ceil(participantCount / Math.max(dinner.maxPerTable, 1)));
  const existingCount = await prisma.dinnerTable.count({ where: { dinnerId: dinner.id } });

  if (existingCount < desiredCount) {
    await prisma.$transaction(
      Array.from({ length: desiredCount - existingCount }, (_, index) =>
        prisma.dinnerTable.create({
          data: { dinnerId: dinner.id, name: `Meja ${existingCount + index + 1}` },
        })
      )
    );
  }

  await prisma.dinner.update({ where: { id: dinner.id }, data: { status: "MATCHING" } });
  res.json({ message: "Board manual matching siap", tableCount: Math.max(existingCount, desiredCount) });
});

// POST /api/matching/:dinnerId/manual/tables (admin - tambah meja manual)
router.post("/:dinnerId/manual/tables", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const dinner = await prisma.dinner.findUnique({ where: { id: req.params.dinnerId } });
  if (!dinner) { res.status(404).json({ message: "Dinner tidak ditemukan" }); return; }
  const count = await prisma.dinnerTable.count({ where: { dinnerId: dinner.id } });
  const table = await prisma.dinnerTable.create({
    data: { dinnerId: dinner.id, name: `Meja ${count + 1}` },
  });
  res.json(table);
});

// PATCH /api/matching/bookings/:bookingId/table (admin - pindah booking ke tabel lain / unassign)
router.patch("/bookings/:bookingId/table", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { tableId } = z.object({ tableId: z.string().nullable() }).parse(req.body);
  if (tableId) {
    const table = await prisma.dinnerTable.findUnique({ where: { id: tableId } });
    if (!table) { res.status(404).json({ message: "Meja tidak ditemukan" }); return; }
  }
  const booking = await prisma.booking.update({
    where: { id: req.params.bookingId },
    data: { tableId, status: tableId ? "MATCHED" : "CONFIRMED" },
  });
  res.json(booking);
});

export default router;
