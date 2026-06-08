import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";
import { uploadQris } from "../middlewares/upload";

const router = Router();

// GET /api/admin/public-settings (public values needed by checkout)
router.get("/public-settings", async (_req, res: Response) => {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["qris_image_url", "payment_deadline_hours"] } },
  });

  const result: Record<string, string> = {};
  settings.forEach((setting) => {
    result[setting.key] = setting.value;
  });
  res.json(result);
});

// GET /api/admin/public-overview (public landing metrics)
router.get("/public-overview", async (_req, res: Response) => {
  const now = new Date();
  const [
    activeCities,
    upcomingDinners,
    activeEvents,
    confirmedParticipants,
  ] = await Promise.all([
    prisma.city.count({ where: { isActive: true } }),
    prisma.dinner.count({
      where: {
        status: { in: ["OPEN", "MATCHING", "CONFIRMED"] },
        date: { gte: now },
        city: { isActive: true },
      },
    }),
    prisma.event.count({
      where: {
        status: "OPEN",
        date: { gte: now },
      },
    }),
    prisma.booking.count({ where: { status: { in: ["CONFIRMED", "MATCHED"] } } }),
  ]);

  res.json({
    activeCities,
    upcomingDinners,
    activeEvents,
    confirmedParticipants,
  });
});

// GET /api/admin/overview (dashboard metrics)
router.get("/overview", authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const [
    totalUsers,
    totalBookings,
    confirmedBookings,
    pendingPayments,
    upcomingDinners,
    totalRevenue,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: { in: ["CONFIRMED", "MATCHED"] } } }),
    prisma.payment.count({ where: { status: "PENDING", booking: { status: "PENDING_VERIFICATION" } } }),
    prisma.dinner.count({ where: { status: { in: ["OPEN", "MATCHING", "CONFIRMED"] }, date: { gte: new Date() } } }),
    prisma.payment.aggregate({ where: { status: "VERIFIED" }, _sum: { amount: true } }),
  ]);

  res.json({
    totalUsers,
    totalBookings,
    confirmedBookings,
    pendingPayments,
    upcomingDinners,
    totalRevenue: totalRevenue._sum.amount ?? 0,
  });
});

// GET /api/admin/settings (admin)
router.get("/settings", authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const settings = await prisma.setting.findMany();
  const result: Record<string, string> = {};
  settings.forEach((s) => {
    // jangan expose credentials ke frontend kecuali key aman
    if (!s.key.includes("pass") && !s.key.includes("token") && !s.key.includes("secret")) {
      result[s.key] = s.value;
    } else {
      result[s.key] = s.value ? "***configured***" : "";
    }
  });
  res.json(result);
});

// PATCH /api/admin/settings (admin)
router.patch("/settings", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const data = z.record(z.string()).parse(req.body);
  for (const [key, value] of Object.entries(data)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  res.json({ message: "Pengaturan disimpan" });
});

// POST /api/admin/settings/qris (admin - upload QRIS image)
router.post("/settings/qris", authenticate, requireAdmin, uploadQris.single("qris"), async (req: AuthRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ message: "File QRIS wajib" }); return; }
  const qrisUrl = `/uploads/qris/${req.file.filename}`;
  await prisma.setting.upsert({
    where: { key: "qris_image_url" },
    update: { value: qrisUrl },
    create: { key: "qris_image_url", value: qrisUrl },
  });
  res.json({ qrisUrl });
});

export default router;
