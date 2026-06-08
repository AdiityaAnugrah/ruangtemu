import { Request, Response, NextFunction } from "express";
import { verifyAccess } from "../lib/jwt";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token tidak ditemukan" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccess(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ message: "Token tidak valid atau sudah kadaluarsa" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ message: "Akses ditolak" });
    return;
  }
  next();
}

export async function requireVerified(req: AuthRequest, res: Response, next: NextFunction) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { isVerified: true, isSuspended: true } });
  if (!user?.isVerified) {
    res.status(403).json({ message: "Akun belum diverifikasi" });
    return;
  }
  if (user?.isSuspended) {
    res.status(403).json({ message: "Akun disuspend" });
    return;
  }
  next();
}
