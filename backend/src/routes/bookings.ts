import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";
import { uploadPaymentProof } from "../middlewares/upload";
import { getNumberSetting } from "../lib/settings";
import { isAvailableLocation } from "../lib/locations";

const router = Router();

// POST /api/bookings (user - buat booking)
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { dinnerId, budgetTierId } = z.object({
    dinnerId: z.string(),
    budgetTierId: z.string(),
  }).parse(req.body);

  const dinner = await prisma.dinner.findUnique({ where: { id: dinnerId } });
  if (!dinner || dinner.status !== "OPEN") {
    res.status(400).json({ message: "Dinner tidak tersedia untuk booking" });
    return;
  }

  const tier = await prisma.budgetTier.findUnique({ where: { id: budgetTierId } });
  if (!tier || tier.dinnerId !== dinnerId) {
    res.status(400).json({ message: "Budget tier tidak valid" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { interests: true },
  });
  if (!user || !user.birthDate || !user.gender || !user.city || user.interests.length < 3) {
    res.status(400).json({ message: "Lengkapi profil, wilayah, tanggal lahir, dan minimal 3 minat sebelum booking" });
    return;
  }

  if (!(await isAvailableLocation(user.city))) {
    res.status(400).json({ message: "Wilayah domisili belum tersedia" });
    return;
  }

  const existing = await prisma.booking.findUnique({
    where: { userId_dinnerId: { userId: req.user!.id, dinnerId } },
  });
  if (existing) {
    res.status(409).json({ message: "Anda sudah memiliki booking untuk dinner ini" });
    return;
  }

  const deadlineHours = await getNumberSetting("payment_deadline_hours", "PAYMENT_DEADLINE_HOURS", 24);
  const expiredAt = new Date();
  expiredAt.setHours(expiredAt.getHours() + deadlineHours);

  const booking = await prisma.booking.create({
    data: {
      userId: req.user!.id,
      dinnerId,
      budgetTierId,
      payment: {
        create: {
          amount: tier.price,
          expiredAt,
        },
      },
    },
    include: {
      dinner: { include: { city: true } },
      budgetTier: true,
      payment: true,
    },
  });

  res.status(201).json(booking);
});

// GET /api/bookings/:id (user - detail booking sendiri)
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      dinner: { include: { city: true } },
      budgetTier: true,
      payment: true,
      table: {
        include: {
          bookings: {
            where: { status: "MATCHED" },
            include: { user: { select: { id: true, name: true, gender: true, avatarUrl: true, city: true } } },
          },
        },
      },
    },
  });

  if (!booking) { res.status(404).json({ message: "Booking tidak ditemukan" }); return; }

  // User hanya bisa lihat booking sendiri
  if (req.user?.role !== "ADMIN" && booking.userId !== req.user!.id) {
    res.status(403).json({ message: "Akses ditolak" });
    return;
  }

  // Sembunyikan lokasi jika belum waktunya
  const dinner = booking.dinner as any;
  if (dinner.status !== "CONFIRMED" && dinner.status !== "COMPLETED") {
    dinner.venueName = "Akan diumumkan H-1";
    dinner.venueAddress = null;
  }

  res.json(booking);
});

// POST /api/bookings/:id/upload-proof (user - upload bukti bayar)
router.post("/:id/upload-proof", authenticate, uploadPaymentProof.single("proof"), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: "File bukti pembayaran wajib diupload" });
    return;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { payment: true },
  });

  if (!booking || booking.userId !== req.user!.id) {
    res.status(404).json({ message: "Booking tidak ditemukan" });
    return;
  }

  if (booking.status !== "PENDING_PAYMENT" && booking.status !== "PENDING_VERIFICATION") {
    res.status(400).json({ message: "Status booking tidak memungkinkan upload bukti" });
    return;
  }

  if (!booking.payment) {
    res.status(400).json({ message: "Data payment tidak ditemukan" });
    return;
  }

  if (booking.payment.expiredAt < new Date()) {
    res.status(400).json({ message: "Waktu pembayaran sudah habis. Booking dibatalkan." });
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
    return;
  }

  const proofUrl = `/uploads/payments/${req.file.filename}`;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: booking.payment.id },
      data: { proofUrl, status: "PENDING" },
    }),
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "PENDING_VERIFICATION" },
    }),
  ]);

  res.json({ message: "Bukti pembayaran berhasil diupload", proofUrl });
});

// DELETE /api/bookings/:id (user - cancel booking)
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking || booking.userId !== req.user!.id) {
    res.status(404).json({ message: "Booking tidak ditemukan" });
    return;
  }

  if (!["PENDING_PAYMENT", "PENDING_VERIFICATION"].includes(booking.status)) {
    res.status(400).json({ message: "Booking yang sudah dikonfirmasi tidak bisa dibatalkan" });
    return;
  }

  await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
  res.json({ message: "Booking dibatalkan" });
});

// --- Admin routes ---

// GET /api/bookings (admin)
router.get("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { dinnerId, status } = z.object({
    dinnerId: z.string().optional(),
    status: z.string().optional(),
  }).parse(req.query);

  const bookings = await prisma.booking.findMany({
    where: {
      dinnerId: dinnerId || undefined,
      status: (status as any) || undefined,
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      dinner: { include: { city: true } },
      budgetTier: true,
      payment: true,
      table: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(bookings);
});

export default router;
