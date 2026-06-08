import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { logger } from "../lib/logger";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Validasi gagal",
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = Array.isArray(err.meta?.target) ? err.meta.target : [];
    if (target.includes("email")) {
      res.status(409).json({ message: "Email sudah terdaftar" });
      return;
    }
    if (target.includes("phone")) {
      res.status(409).json({ message: "No. HP sudah terdaftar" });
      return;
    }

    res.status(409).json({ message: "Data sudah terdaftar" });
    return;
  }

  if (err instanceof Error) {
    if (err.message.includes("Unique constraint")) {
      res.status(409).json({ message: "Data sudah ada" });
      return;
    }

    logger.error({ err }, "Unhandled error");
    const status = (err as { status?: number }).status || 500;
    res.status(status).json({
      message: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : err.message,
    });
    return;
  }

  res.status(500).json({ message: "Terjadi kesalahan server" });
}
