
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';

import { createApiApp } from './backend/src/app.ts';
import { env } from './backend/src/config/env.ts';
import { prisma, disconnectPrisma } from './backend/src/db/prisma.ts';
import { seedDatabase } from './backend/src/db/seed.ts';
import {
  getDefaultPublicSlug,
  getPublicInvitationBySlug,
} from './backend/src/modules/invitations/service.ts';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setMetaTag(
  html: string,
  attribute: 'name' | 'property',
  key: string,
  content: string,
): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<meta\\b(?=[^>]*\\b${attribute}=["']${escapedKey}["'])[^>]*>`,
    'gi',
  );

  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;

  return `${html.replace(pattern, '')}`.replace(
    '</head>',
    `  ${tag}\n</head>`,
  );
}

function buildInvitationHtml(
  template: string,
  data: Awaited<ReturnType<typeof getPublicInvitationBySlug>>,
  pageUrl: string,
): string {
  const invitation = data.invitation;
  const couple = data.couple;

  const groomName = couple?.groomNickName?.trim() || couple?.groomFullName?.trim();
  const brideName = couple?.brideNickName?.trim() || couple?.brideFullName?.trim();

  const coupleNames =
    groomName && brideName
      ? `${groomName} & ${brideName}`
      : invitation.title;

  // Nama pasangan selalu berasal dari data Couple di database.
  const title = coupleNames
    ? `${coupleNames} — Online Wedding Invitation`
    : invitation.seoTitle || invitation.title;

  const description =
    couple?.groomFullName && couple?.brideFullName
      ? `Celebrate the wedding of ${couple.groomFullName} & ${couple.brideFullName}. Access event details, maps, gallery, and RSVP online.`
      : invitation.seoDescription || invitation.title;

  const imagePath = invitation.ogImageUrl || invitation.heroImageUrl;
  const imageUrl = imagePath
    ? new URL(imagePath, pageUrl).toString()
    : '';

  let html = template.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(title)}</title>`,
  );

  html = setMetaTag(html, 'name', 'description', description);
  html = setMetaTag(html, 'property', 'og:type', 'website');
  html = setMetaTag(html, 'property', 'og:title', title);
  html = setMetaTag(html, 'property', 'og:description', description);
  html = setMetaTag(html, 'property', 'og:url', pageUrl);

  // Hapus gambar lama agar preview tidak mengambil gambar statis.
  const oldImagePattern =
    /<meta\b(?=[^>]*\bproperty=["']og:image["'])[^>]*>/gi;
  html = html.replace(oldImagePattern, '');

  if (imageUrl) {
    html = setMetaTag(html, 'property', 'og:image', imageUrl);
    html = setMetaTag(html, 'property', 'og:image:alt', title);
    html = setMetaTag(
      html,
      'name',
      'twitter:card',
      'summary_large_image',
    );
    html = setMetaTag(html, 'name', 'twitter:title', title);
    html = setMetaTag(html, 'name', 'twitter:description', description);
    html = setMetaTag(html, 'name', 'twitter:image', imageUrl);
  }

  return html;
}
/*
function createInvitationMetadataMiddleware(indexHtml: string) {
  const excludedPaths = new Set([
    'admin',
    'api',
    'health',
    'assets',
    'favicon.ico',
    'robots.txt',
    'sitemap.xml',
  ]);

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (req.method !== 'GET') return next();

    if (!req.headers.accept?.includes('text/html')) {
      return next();
    }

    const pathname = req.path;
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length > 0 && excludedPaths.has(segments[0])) {
      return next();
    }

    // Jangan memproses file statis seperti JS, CSS, gambar, dan font.
    if (path.extname(pathname)) {
      return next();
    }

    try {
      const slug = segments.length === 0
        ? await getDefaultPublicSlug()
        : segments[0];

      const invitationData = await getPublicInvitationBySlug(slug);

      const pageUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

      const html = buildInvitationHtml(
        indexHtml,
        invitationData,
        pageUrl,
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).send(html);
    } catch (error) {
      // Jika slug tidak ditemukan, lanjutkan ke SPA fallback.
      // Error database yang tidak diharapkan tetap dicatat.
      if (
        error instanceof Error &&
        !error.message.includes('tidak ditemukan') &&
        !error.message.includes('Belum ada undangan')
      ) {
        console.error('Invitation metadata error:', error);
      }

      next();
    }
  };
}
  */
function createInvitationMetadataMiddleware(indexHtml: string) {
  const excludedPaths = new Set([
    'admin',
    'api',
    'health',
    'assets',
    'favicon.ico',
    'robots.txt',
    'sitemap.xml',
  ]);

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (req.method !== 'GET') return next();

    const pathname = req.path;
    const segments = pathname.split('/').filter(Boolean);

    // Abaikan halaman admin dan endpoint API.
    if (segments.length > 0 && excludedPaths.has(segments[0])) {
      return next();
    }

    // Abaikan file statis seperti JS, CSS, gambar, dan font.
    if (path.extname(pathname)) {
      return next();
    }

    try {
      const slug =
        segments.length === 0
          ? await getDefaultPublicSlug()
          : segments[0];

      const invitationData = await getPublicInvitationBySlug(slug);

      const pageUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

      const html = buildInvitationHtml(
        indexHtml,
        invitationData,
        pageUrl,
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).send(html);
    } catch (error) {
      if (
        error instanceof Error &&
        !error.message.includes('tidak ditemukan') &&
        !error.message.includes('Belum ada undangan')
      ) {
        console.error('Invitation metadata error:', error);
      }

      next();
    }
  };
}

async function bootstrap() {
  await prisma.$connect();
  await seedDatabase();

  const app = createApiApp();

  if (!env.isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    const indexHtml = await readFile(indexPath, 'utf-8');

    // Metadata dinamis harus berjalan sebelum static serving dan SPA fallback.
    app.use(createInvitationMetadataMiddleware(indexHtml));

    app.use(express.static(distPath));

    app.get('*', (_req, res) => {
      res.sendFile(indexPath);
    });
  }

  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(
      `Wedding Invitation System running on http://0.0.0.0:${env.port}`,
    );
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} received; shutting down`);

    server.close(async () => {
      await disconnectPrisma();
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch(async (err) => {
  console.error('Failed to start server:', err);
  await disconnectPrisma().catch(() => undefined);
  process.exit(1);
});
