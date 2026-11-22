import fs from "node:fs";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.ts";
import { prisma } from "./db/prisma.ts";
import { apiRateLimiter } from "./middlewares/rateLimiter.ts";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.ts";
import { adminRouter } from "./modules/admin/routes.ts";
import { authRouter } from "./modules/auth/routes.ts";
import { publicRouter } from "./modules/public/routes.ts";

export function createApiApp() {
  const app = express();

  app.set("trust proxy", 1);

  // Configure Helmet compatible with AI Studio preview iframe
  app.use(
    helmet({
      frameguard: false,
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  // Local file serving is development-only. Production media must use Cloudinary.
  if (!env.isProduction && !env.cloudinary.configured) {
    if (!fs.existsSync(env.uploadDir)) {
      fs.mkdirSync(env.uploadDir, { recursive: true });
    }
    app.use("/uploads", express.static(env.uploadDir, { maxAge: "7d" }));
  }

  app.get("/health/live", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/health/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: "ready", database: "connected" });
    } catch {
      res.status(503).json({ status: "not_ready", database: "disconnected" });
    }
  });

  app.use("/api/v1", apiRateLimiter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1", publicRouter);

  app.use("/api", notFoundHandler);
  app.use(errorHandler);

  return app;
}
