import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";
import { notificationService } from "../services/notificationService";

const router = Router();

// GET /api/payments (admin - semua payment pending verifikasi)
router.get("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { status } = z.object({ status: z.string().optional() }).parse(req.query);

  const payments = await prisma.payment.findMany({
    where: { status: (status as any) || undefined },
    include: {
      booking: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          dinner: { include: { city: true } },
          budgetTier: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(payments);
});

// GET /api/payments/pending (admin - khusus pending)
router.get("/pending", authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const payments = await prisma.payment.findMany({
    where: { status: "PENDING", booking: { status: "PENDING_VERIFICATION" } },
    include: {
      booking: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          dinner: { include: { city: true } },
          budgetTier: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  res.json(payments);
});

// PATCH /api/payments/:id/verify (admin)
router.patch("/:id/verify", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { booking: { include: { user: true, dinner: { include: { city: true } }, budgetTier: true } } },
  });

  if (!payment) { res.status(404).json({ message: "Payment tidak ditemukan" }); return; }
  if (payment.status !== "PENDING") {
    res.status(400).json({ message: "Payment sudah diproses sebelumnya" });
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "VERIFIED", verifiedById: req.user!.id, verifiedAt: new Date() },
    }),
    prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: "CONFIRMED" },
    }),
  ]);

  // Kirim notifikasi konfirmasi pembayaran
  await notificationService.sendPaymentConfirmed(payment.booking.user, payment.booking);

  res.json({ message: "Pembayaran berhasil diverifikasi" });
});

// PATCH /api/payments/:id/reject (admin)
router.patch("/:id/reject", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { note } = z.object({ note: z.string().optional() }).parse(req.body);

  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { booking: { include: { user: true } } },
  });

  if (!payment) { res.status(404).json({ message: "Payment tidak ditemukan" }); return; }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "REJECTED", note: note || null },
    }),
    prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: "PENDING_PAYMENT" },
    }),
  ]);

  // Notifikasi ke user
  await notificationService.sendPaymentRejected(payment.booking.user, note);

  res.json({ message: "Pembayaran ditolak, user bisa upload ulang" });
});

export default router;
