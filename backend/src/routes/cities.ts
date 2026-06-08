import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";

const router = Router();

const citySchema = z.object({
  name: z.string().min(2).max(100),
  areas: z.array(z.string()).min(1),
  isActive: z.boolean().optional(),
});

// GET /api/cities (public)
router.get("/", async (_req: Request, res: Response) => {
  const cities = await prisma.city.findMany({
    where: { isActive: true },
    select: { id: true, name: true, areas: true },
    orderBy: { name: "asc" },
  });
  res.json(cities.map((c) => ({ ...c, areas: JSON.parse(c.areas) })));
});

// GET /api/cities/all (admin)
router.get("/all", authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const cities = await prisma.city.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { dinners: true } } },
  });
  res.json(cities.map((c) => ({ ...c, areas: JSON.parse(c.areas) })));
});

// POST /api/cities (admin)
router.post("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const data = citySchema.parse(req.body);
  const city = await prisma.city.create({
    data: { name: data.name, areas: JSON.stringify(data.areas), isActive: data.isActive ?? true },
  });
  res.status(201).json({ ...city, areas: JSON.parse(city.areas) });
});

// PUT /api/cities/:id (admin)
router.put("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const data = citySchema.partial().parse(req.body);
  const city = await prisma.city.update({
    where: { id: req.params.id },
    data: {
      ...data,
      areas: data.areas ? JSON.stringify(data.areas) : undefined,
    },
  });
  res.json({ ...city, areas: JSON.parse(city.areas) });
});

// DELETE /api/cities/:id (admin)
router.delete("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  await prisma.city.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: "Kota dinonaktifkan" });
});

// POST /api/cities/request (public)
router.post("/request", async (req: Request, res: Response) => {
  const { cityName, email } = z.object({
    cityName: z.string().min(2).max(100),
    email: z.string().email().optional(),
  }).parse(req.body);

  const existing = await prisma.cityRequest.findFirst({ where: { cityName: { equals: cityName } } });
  if (existing) {
    await prisma.cityRequest.update({ where: { id: existing.id }, data: { count: { increment: 1 } } });
  } else {
    await prisma.cityRequest.create({ data: { cityName, email } });
  }
  res.status(201).json({ message: "Permintaan kota berhasil dikirim" });
});

// GET /api/cities/requests (admin)
router.get("/requests/all", authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const requests = await prisma.cityRequest.findMany({ orderBy: { count: "desc" } });
  res.json(requests);
});

export default router;
