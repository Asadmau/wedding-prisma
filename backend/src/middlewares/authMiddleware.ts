import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { sha256 } from "../common/crypto.ts";
import { ForbiddenError, UnauthorizedError } from "../common/errors.ts";
import { prisma } from "../db/prisma.ts";

export const SESSION_COOKIE_NAME = "wedding_admin_session";

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  name: string;
  sessionId: string;
  csrfToken: string;
}

export interface AdminRequest extends Request {
  admin?: AuthenticatedAdmin;
}

function isHttpsRequest(req: Request): boolean {
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (typeof forwardedProto === "string")
    return forwardedProto.split(",")[0].trim() === "https";
  return req.secure;
}

export function setSessionCookie(
  req: Request,
  res: Response,
  rawToken: string,
  expiresAt: Date,
): void {
  const maxAgeSec = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${maxAgeSec}`,
  ];
  if (isHttpsRequest(req)) parts.push("Secure", "SameSite=None", "Partitioned");
  else parts.push("SameSite=Lax");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(req: Request, res: Response): void {
  const parts = [`${SESSION_COOKIE_NAME}=`, "Path=/", "HttpOnly", "Max-Age=0"];
  if (isHttpsRequest(req)) parts.push("Secure", "SameSite=None", "Partitioned");
  else parts.push("SameSite=Lax");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export async function resolveSessionFromRequest(
  req: Request,
): Promise<AuthenticatedAdmin | null> {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof rawToken !== "string" || !rawToken) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(rawToken) },
    select: {
      id: true,
      csrfToken: true,
      expiresAt: true,
      admin: { select: { id: true, email: true, name: true, isActive: true } },
    },
  });

  if (!session || !session.admin.isActive) return null;
  if (session.expiresAt <= new Date().toISOString()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  return {
    id: session.admin.id,
    email: session.admin.email,
    name: session.admin.name,
    sessionId: session.id,
    csrfToken: session.csrfToken,
  };
}

export async function requireAdminAuth(
  req: AdminRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const admin = await resolveSessionFromRequest(req);
    if (!admin)
      return next(new UnauthorizedError("Silakan login sebagai administrator"));

    const method = req.method.toUpperCase();
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const csrfHeader = req.headers["x-csrf-token"];
      const expected = Buffer.from(admin.csrfToken, "utf8");
      const actual =
        typeof csrfHeader === "string" ? Buffer.from(csrfHeader, "utf8") : null;
      const csrfValid =
        actual !== null &&
        actual.length === expected.length &&
        crypto.timingSafeEqual(actual, expected);

      if (!csrfValid)
        return next(new ForbiddenError("Token CSRF tidak valid atau hilang"));

      const origin = req.headers.origin;
      if (origin) {
        try {
          const originHost = new URL(origin).host;
          const expectedHost =
            (typeof req.headers["x-forwarded-host"] === "string"
              ? req.headers["x-forwarded-host"].split(",")[0].trim()
              : undefined) || req.headers.host;
          if (expectedHost && originHost !== expectedHost) {
            return next(
              new ForbiddenError("Origin permintaan tidak diizinkan"),
            );
          }
        } catch {
          return next(new ForbiddenError("Format Origin tidak valid"));
        }
      }
    }

    req.admin = admin;
    return next();
  } catch (error) {
    return next(error);
  }
}
