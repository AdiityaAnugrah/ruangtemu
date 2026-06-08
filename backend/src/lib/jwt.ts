import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_SECRET! + "_refresh";
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "7d";

export interface JwtPayload {
  sub: string; // userId
  role: string;
  type: "access" | "refresh";
  jti?: string;
}

export function signAccess(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role, type: "access" }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  } as jwt.SignOptions);
}

export function signRefresh(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role, type: "refresh", jti: randomUUID() }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  } as jwt.SignOptions);
}

export function verifyAccess(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefresh(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
