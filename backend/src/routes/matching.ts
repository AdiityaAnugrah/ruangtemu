import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";
import { matchingService } from "../services/matchingService";

const router = Router();

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
              interests: { include: { interest: true } },
            },
          },
        },
      },
    },
  });
  res.json(tables);
});

// PATCH /api/matching/bookings/:bookingId/table (admin - pindah booking ke tabel lain)
router.patch("/bookings/:bookingId/table", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { tableId } = z.object({ tableId: z.string() }).parse(req.body);
  const booking = await prisma.booking.update({
    where: { id: req.params.bookingId },
    data: { tableId },
  });
  res.json(booking);
});

export default router;
