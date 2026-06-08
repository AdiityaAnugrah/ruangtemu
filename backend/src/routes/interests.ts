import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/interests (public)
router.get("/", async (_req: Request, res: Response) => {
  const interests = await prisma.interest.findMany({ orderBy: { name: "asc" } });
  res.json(interests);
});

// POST /api/interests (admin)
router.post("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name } = z.object({ name: z.string().min(2).max(50) }).parse(req.body);
  const interest = await prisma.interest.create({ data: { name } });
  res.status(201).json(interest);
});

// DELETE /api/interests/:id (admin)
router.delete("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  await prisma.interest.delete({ where: { id: req.params.id } });
  res.json({ message: "Minat dihapus" });
});

export default router;
