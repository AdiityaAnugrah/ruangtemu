import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";
import { uploadPoster } from "../middlewares/upload";

const router = Router();

const eventSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10),
  date: z.string().datetime(),
  cityId: z.string().optional().nullable(),
  price: z.number().int().min(0),
  capacity: z.number().int().positive(),
  status: z.string().optional(),
});

// GET /api/events (public)
router.get("/", async (_req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    where: { status: "OPEN", date: { gte: new Date() } },
    orderBy: { date: "asc" },
    include: { _count: { select: { registrations: true } } },
  });
  res.json(events);
});

// GET /api/events/all (admin)
router.get("/all", authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { registrations: true } } },
  });
  res.json(events);
});

// GET /api/events/:slug (public)
router.get("/:slug", async (req: Request, res: Response) => {
  const event = await prisma.event.findUnique({
    where: { slug: req.params.slug },
    include: { _count: { select: { registrations: true } } },
  });
  if (!event) { res.status(404).json({ message: "Event tidak ditemukan" }); return; }
  res.json(event);
});

// POST /api/events (admin)
router.post("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const data = eventSchema.parse(req.body);
  const event = await prisma.event.create({
    data: { ...data, date: new Date(data.date) },
  });
  res.status(201).json(event);
});

// PUT /api/events/:id (admin)
router.put("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const data = eventSchema.partial().parse(req.body);
  const event = await prisma.event.update({
    where: { id: req.params.id },
    data: { ...data, date: data.date ? new Date(data.date) : undefined },
  });
  res.json(event);
});

// POST /api/events/:id/poster (admin)
router.post("/:id/poster", authenticate, requireAdmin, uploadPoster.single("poster"), async (req: AuthRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ message: "File poster wajib" }); return; }
  const posterUrl = `/uploads/posters/${req.file.filename}`;
  const event = await prisma.event.update({ where: { id: req.params.id }, data: { posterUrl } });
  res.json(event);
});

// DELETE /api/events/:id (admin)
router.delete("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  await prisma.event.update({ where: { id: req.params.id }, data: { status: "CANCELLED" } });
  res.json({ message: "Event dibatalkan" });
});

// --- Registrasi event ---

// POST /api/events/:id/register (user)
router.post("/:id/register", authenticate, async (req: AuthRequest, res: Response) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event || event.status !== "OPEN") {
    res.status(400).json({ message: "Event tidak tersedia" });
    return;
  }

  const regCount = await prisma.eventRegistration.count({ where: { eventId: req.params.id } });
  if (regCount >= event.capacity) {
    res.status(400).json({ message: "Kapasitas event penuh" });
    return;
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId: req.params.id, userId: req.user!.id } },
  });
  if (existing) {
    res.status(409).json({ message: "Anda sudah terdaftar" });
    return;
  }

  const reg = await prisma.eventRegistration.create({
    data: {
      eventId: req.params.id,
      userId: req.user!.id,
      payment: { amount: event.price, method: "QRIS", status: "PENDING" },
    },
    include: { event: true },
  });

  res.status(201).json(reg);
});

// GET /api/events/:id/registrations (admin)
router.get("/:id/registrations", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const regs = await prisma.eventRegistration.findMany({
    where: { eventId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
  });
  res.json(regs);
});

export default router;
