import crypto from 'node:crypto';
import {
  generateSecureToken,
  hashPassword,
  sha256,
  verifyPassword,
} from '../../common/crypto.ts';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../common/errors.ts';
import { env } from '../../config/env.ts';
import { prisma } from '../../db/prisma.ts';
import type { LoginInput, SetupAdminInput } from './validation.ts';

export interface AdminPublic {
  id: string;
  email: string;
  name: string;
}

export interface SessionCreateResult {
  admin: AdminPublic;
  rawToken: string;
  csrfToken: string;
  expiresAt: Date;
}

export async function hasAnyAdmin(): Promise<boolean> {
  return (await prisma.admin.count({ where: { isActive: true } })) > 0;
}

async function createAdminSession(
  admin: AdminPublic,
  meta: { userAgent?: string; ipAddress?: string },
): Promise<SessionCreateResult> {
  const rawToken = generateSecureToken(32);
  const tokenHash = sha256(rawToken);
  const csrfToken = generateSecureToken(24);
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);
  const timestamp = new Date().toISOString();

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { expiresAt: { lte: timestamp } } }),
    prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        adminId: admin.id,
        tokenHash,
        csrfToken,
        expiresAt: expiresAt.toISOString(),
        userAgent: meta.userAgent || null,
        ipAddress: meta.ipAddress || null,
        createdAt: timestamp,
      },
    }),
  ]);

  return { admin, rawToken, csrfToken, expiresAt };
}

export async function setupInitialAdmin(
  input: SetupAdminInput,
  meta: { userAgent?: string; ipAddress?: string },
): Promise<SessionCreateResult> {
  if (env.adminPassword) {
    throw new ForbiddenError('Akun administrator dikelola melalui environment variable');
  }

  const normalizedEmail = input.email.toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const timestamp = new Date().toISOString();
  const adminId = crypto.randomUUID();

  try {
    const admin = await prisma.$transaction(async (tx) => {
      const count = await tx.admin.count();
      if (count > 0) throw new ConflictError('Akun administrator sudah pernah dibuat');

      return tx.admin.create({
        data: {
          id: adminId,
          email: normalizedEmail,
          name: input.name,
          passwordHash,
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        select: { id: true, email: true, name: true },
      });
    }, { isolationLevel: 'Serializable' });

    return createAdminSession(admin, meta);
  } catch (error) {
    if (error instanceof ConflictError) throw error;
    if ((error as { code?: string }).code === 'P2002' ||
        (error as { code?: string }).code === 'P2034') {
      throw new ConflictError('Akun administrator sudah pernah dibuat');
    }
    throw error;
  }
}

export async function loginAdmin(
  input: LoginInput,
  meta: { userAgent?: string; ipAddress?: string },
): Promise<SessionCreateResult> {
  const row = await prisma.admin.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true, email: true, name: true, passwordHash: true, isActive: true },
  });

  if (!row || !row.isActive) {
    throw new UnauthorizedError('Email atau password salah');
  }

  const valid = await verifyPassword(input.password, row.passwordHash);
  if (!valid) throw new UnauthorizedError('Email atau password salah');

  return createAdminSession({ id: row.id, email: row.email, name: row.name }, meta);
}

export async function logoutSession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}
