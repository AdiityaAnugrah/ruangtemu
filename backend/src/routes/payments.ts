import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";
import { notificationService } from "../services/notificationService";

const router = Router();
const ACTIONABLE_PAYMENT_STATUSES = ["PENDING_PAYMENT", "PENDING_VERIFICATION"];

function getPaymentObject(payment: unknown): Record<string, any> {
  return payment && typeof payment === "object" && !Array.isArray(payment) ? payment as Record<string, any> : {};
}

function toEventPaymentItem(registration: any) {
  const payment = getPaymentObject(registration.payment);
  const status = payment.status ?? "PENDING";
  const isActionable = status === "PENDING" && ACTIONABLE_PAYMENT_STATUSES.includes(registration.status);
  return {
    id: registration.id,
    type: "EVENT",
    amount: Number(payment.amount ?? registration.event?.price ?? 0),
    proofUrl: payment.proofUrl ?? null,
    status,
    isActionable,
    note: payment.note ?? null,
    expiredAt: payment.expiredAt ?? null,
    createdAt: payment.uploadedAt ?? registration.createdAt,
    eventRegistration: registration,
  };
}

function toBookingPaymentItem(payment: any) {
  const isActionable = payment.status === "PENDING" && ACTIONABLE_PAYMENT_STATUSES.includes(payment.booking?.status);
  return { ...payment, type: "BOOKING", isActionable };
}

// GET /api/payments (admin - semua pembayaran dan registrasi)
router.get("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { status } = z.object({ status: z.string().optional() }).parse(req.query);

  const [bookingPayments, eventRegistrations] = await Promise.all([
    prisma.payment.findMany({
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
    }),
    prisma.eventRegistration.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        event: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const eventPayments = eventRegistrations
    .map(toEventPaymentItem)
    .filter((payment) => !status || payment.status === status)
    .filter((payment) => payment.status !== "PENDING" || payment.isActionable);
  const payments = [
    ...bookingPayments.map(toBookingPaymentItem).filter((payment) => payment.status !== "PENDING" || payment.isActionable),
    ...eventPayments,
  ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(payments);
});

// GET /api/payments/pending (admin - khusus pending)
router.get("/pending", authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const [bookingPayments, eventRegistrations] = await Promise.all([
    prisma.payment.findMany({
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
    }),
    prisma.eventRegistration.findMany({
      where: { status: "PENDING_VERIFICATION" },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        event: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const eventPayments = eventRegistrations.map(toEventPaymentItem).filter((payment) => payment.status === "PENDING" && payment.isActionable);
  const payments = [...bookingPayments.map(toBookingPaymentItem), ...eventPayments]
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  res.json(payments);
});

// PATCH /api/payments/:id/verify (admin)
router.patch("/:id/verify", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { booking: { include: { user: true, dinner: { include: { city: true } }, budgetTier: true } } },
  });

  if (!payment) {
    const registration = await prisma.eventRegistration.findUnique({ where: { id: req.params.id } });
    if (!registration) { res.status(404).json({ message: "Payment tidak ditemukan" }); return; }

    const registrationPayment = getPaymentObject(registration.payment);
    if (!["PENDING_PAYMENT", "PENDING_VERIFICATION"].includes(registration.status) || registrationPayment.status !== "PENDING") {
      res.status(400).json({ message: "Pembayaran event sudah diproses atau tidak dapat diverifikasi" });
      return;
    }

    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        status: "CONFIRMED",
        payment: {
          ...registrationPayment,
          status: "VERIFIED",
          verifiedById: req.user!.id,
          verifiedAt: new Date().toISOString(),
        },
      },
    });

    res.json({ message: "Pembayaran event berhasil diverifikasi" });
    return;
  }
  if (!["PENDING_PAYMENT", "PENDING_VERIFICATION"].includes(payment.booking.status) || payment.status !== "PENDING") {
    res.status(400).json({ message: "Pembayaran sudah diproses atau tidak dapat diverifikasi" });
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

  if (!payment) {
    const registration = await prisma.eventRegistration.findUnique({ where: { id: req.params.id } });
    if (!registration) { res.status(404).json({ message: "Payment tidak ditemukan" }); return; }

    const registrationPayment = getPaymentObject(registration.payment);
    if (!["PENDING_PAYMENT", "PENDING_VERIFICATION"].includes(registration.status) || registrationPayment.status !== "PENDING") {
      res.status(400).json({ message: "Pembayaran event sudah diproses atau tidak dapat ditolak" });
      return;
    }
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        status: "PENDING_PAYMENT",
        payment: {
          ...registrationPayment,
          status: "REJECTED",
          note: note || null,
        },
      },
    });

    res.json({ message: "Pembayaran event ditolak, user bisa upload ulang" });
    return;
  }

  if (!["PENDING_PAYMENT", "PENDING_VERIFICATION"].includes(payment.booking.status) || payment.status !== "PENDING") {
    res.status(400).json({ message: "Pembayaran sudah diproses atau tidak dapat ditolak" });
    return;
  }

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
