import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL wajib diisi untuk Prisma Migrate'),
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  SESSION_SECRET: z.preprocess((value) => value === '' ? undefined : value, z.string().min(32).optional()),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  ADMIN_EMAIL: z.preprocess((value) => value === '' ? undefined : value, z.string().email().optional()),
  ADMIN_PASSWORD: z.preprocess((value) => value === '' ? undefined : value, z.string().min(12).optional()),
  APP_URL: z.preprocess((value) => value === '' ? undefined : value, z.string().url().optional()),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

const data = parsed.data;
const cloudinaryValues = [data.CLOUDINARY_CLOUD_NAME, data.CLOUDINARY_API_KEY, data.CLOUDINARY_API_SECRET];
const cloudinaryConfigured = cloudinaryValues.every((value) => Boolean(value?.trim()));
const cloudinaryPartiallyConfigured = cloudinaryValues.some((value) => Boolean(value?.trim())) && !cloudinaryConfigured;
if (cloudinaryPartiallyConfigured) throw new Error('Isi seluruh CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET atau kosongkan semuanya');
if (Boolean(data.ADMIN_EMAIL) !== Boolean(data.ADMIN_PASSWORD)) throw new Error('ADMIN_EMAIL dan ADMIN_PASSWORD harus diisi bersamaan');

if (data.NODE_ENV === 'production') {
  if (!data.SESSION_SECRET) throw new Error('SESSION_SECRET wajib diisi pada production');
  if (!cloudinaryConfigured) throw new Error('Cloudinary wajib dikonfigurasi pada production');
  if (!data.ADMIN_EMAIL || !data.ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi pada production');
  }
}

const rawSessionSecret = data.SESSION_SECRET?.trim();
const sessionKeyBytes = rawSessionSecret
  ? crypto.createHash('sha256').update(rawSessionSecret).digest()
  : crypto.randomBytes(32);

export const env = {
  nodeEnv: data.NODE_ENV,
  isProduction: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
  port: data.PORT,
  databaseUrl: data.DATABASE_URL,
  directUrl: data.DIRECT_URL,
  uploadDir: data.UPLOAD_DIR,
  sessionKey: sessionKeyBytes,
  sessionTtlHours: data.SESSION_TTL_HOURS,
  adminEmail: data.ADMIN_EMAIL?.trim().toLowerCase() || '',
  adminPassword: data.ADMIN_PASSWORD?.trim() || '',
  appUrl: data.APP_URL?.trim() || '',
  cloudinary: {
    cloudName: data.CLOUDINARY_CLOUD_NAME?.trim() || '',
    apiKey: data.CLOUDINARY_API_KEY?.trim() || '',
    apiSecret: data.CLOUDINARY_API_SECRET?.trim() || '',
    configured: cloudinaryConfigured,
  },
};
