import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/notifications (user - notifikasi sendiri)
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(notifications);
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", authenticate, async (req: AuthRequest, res: Response) => {
  const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!n || n.userId !== req.user!.id) {
    res.status(404).json({ message: "Notifikasi tidak ditemukan" });
    return;
  }
  await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.json({ message: "Ditandai sudah dibaca" });
});

// PATCH /api/notifications/read-all
router.patch("/read-all/all", authenticate, async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: "Semua notifikasi ditandai sudah dibaca" });
});

export default router;
