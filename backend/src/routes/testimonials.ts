import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/testimonials (public - hanya published)
router.get("/", async (_req: Request, res: Response) => {
  const testimonials = await prisma.testimonial.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(testimonials);
});

// POST /api/testimonials (admin)
router.post("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const data = z.object({
    name: z.string().min(2),
    age: z.number().int().optional(),
    content: z.string().min(10),
    isPublished: z.boolean().optional(),
  }).parse(req.body);

  const t = await prisma.testimonial.create({ data });
  res.status(201).json(t);
});

// PATCH /api/testimonials/:id (admin)
router.patch("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const data = z.object({
    isPublished: z.boolean().optional(),
    content: z.string().optional(),
    name: z.string().optional(),
    age: z.number().optional(),
  }).parse(req.body);

  const t = await prisma.testimonial.update({ where: { id: req.params.id }, data });
  res.json(t);
});

// DELETE /api/testimonials/:id (admin)
router.delete("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  await prisma.testimonial.delete({ where: { id: req.params.id } });
  res.json({ message: "Testimonial dihapus" });
});

export default router;
