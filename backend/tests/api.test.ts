import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Wedding Invitation API — PostgreSQL/Prisma integration", () => {
  let tmpDir: string;
  let app: any;
  let agent: any;
  let prisma: any;
  let disconnectPrisma: () => Promise<void>;
  let csrfToken = "";
  let guestSlug = "";
  let createdGuestId = "";
  let createdWishId = "";
/*
  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wedding-test-"));
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
    process.env.DIRECT_URL =
      process.env.TEST_DATABASE_URL ||
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL;
    process.env.UPLOAD_DIR = path.join(tmpDir, "uploads");
    process.env.SESSION_SECRET =
      "test-session-secret-that-is-long-enough-123456";
    process.env.ADMIN_EMAIL = "";
    process.env.ADMIN_PASSWORD = "";
    if (!process.env.DATABASE_URL)
      throw new Error(
        "Set TEST_DATABASE_URL (recommended) or DATABASE_URL to an isolated PostgreSQL test database",
      );
    const db = await import("../src/db/prisma.ts");
    prisma = db.prisma;
    disconnectPrisma = db.disconnectPrisma;
    const { createApiApp } = await import("../src/app.ts");
    const { seedDatabase } = await import("../src/db/seed.ts");
    await prisma.$connect();
    await prisma.session.deleteMany();
    await prisma.rsvp.deleteMany();
    await prisma.wish.deleteMany();
    await prisma.guest.deleteMany();
    await prisma.gallery.deleteMany();
    await prisma.event.deleteMany();
    await prisma.loveStory.deleteMany();
    await prisma.giftAccount.deleteMany();
    await prisma.siteSetting.deleteMany();
    await prisma.couple.deleteMany();
    await prisma.invitation.deleteMany();
    await prisma.template.deleteMany();
    await prisma.admin.deleteMany();
    await seedDatabase();
    app = createApiApp();
    agent = request.agent(app);
  });
  */

beforeAll(async () => {
  // Wajib menggunakan database khusus testing
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL wajib diisi. Test tidak boleh menggunakan database aplikasi utama.",
    );
  }

  const testDatabase = new URL(testDatabaseUrl);

  if (testDatabase.pathname !== "/wedding_invitation_test") {
    throw new Error(
      "Pengujian hanya boleh menggunakan database wedding_invitation_test.",
    );
  }

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wedding-test-"));

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DIRECT_URL = testDatabaseUrl;

  process.env.UPLOAD_DIR = path.join(tmpDir, "uploads");
  process.env.SESSION_SECRET =
    "test-session-secret-that-is-long-enough-123456";
  process.env.ADMIN_EMAIL = "";
  process.env.ADMIN_PASSWORD = "";

  const db = await import("../src/db/prisma.ts");

  prisma = db.prisma;
  disconnectPrisma = db.disconnectPrisma;

  const { createApiApp } = await import("../src/app.ts");
  const { seedDatabase } = await import("../src/db/seed.ts");

  await prisma.$connect();

  // Reset data khusus database testing
  await prisma.session.deleteMany();
  await prisma.rsvp.deleteMany();
  await prisma.wish.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.gallery.deleteMany();
  await prisma.event.deleteMany();
  await prisma.loveStory.deleteMany();
  await prisma.giftAccount.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.couple.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.template.deleteMany();
  await prisma.admin.deleteMany();

  await seedDatabase();

  app = createApiApp();
  agent = request.agent(app);
});

  afterAll(async () => {
    if (disconnectPrisma) await disconnectPrisma();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });
  it("GET /api/v1/health returns ok", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
  });
  it("serves three seeded templates and public invitation content", async () => {
    const templates = await request(app).get("/api/v1/templates");
    expect(templates.status).toBe(200);
    expect(templates.body.data.map((t: any) => t.key)).toEqual([
      "classic-elegant",
      "botanical-green",
      "modern-minimalist",
    ]);
    const invitation = await request(app).get("/api/v1/invitations/andi-siti");
    expect(invitation.status).toBe(200);
    expect(invitation.body.data.invitation.slug).toBe("andi-siti");
    expect(invitation.body.data.couple.groomNickName).toBe("Andi");
    expect(invitation.body.data.events.length).toBe(2);
  });
  it("enforces authentication, one-time setup, login, and CSRF", async () => {
    expect((await request(app).get("/api/v1/admin/dashboard")).status).toBe(
      401,
    );
    expect(
      (await request(app).get("/api/v1/auth/status")).body.data.needsSetup,
    ).toBe(true);
    const setup = await agent
      .post("/api/v1/auth/setup")
      .send({
        name: "Admin Pengantin",
        email: "admin@wedding.test",
        password: "StrongPassword123!",
      });
    expect(setup.status).toBe(201);
    csrfToken = setup.body.data.csrfToken;
    expect(
      (
        await request(app)
          .post("/api/v1/auth/setup")
          .send({
            name: "Hacker",
            email: "hacker@wedding.test",
            password: "StrongPassword123!",
          })
      ).status,
    ).toBe(409);
    expect(
      (await agent.post("/api/v1/admin/events").send({ title: "No CSRF" }))
        .status,
    ).toBe(403);
    expect((await agent.post("/api/v1/auth/logout")).status).toBe(200);
    const login = await agent
      .post("/api/v1/auth/login")
      .send({ email: "admin@wedding.test", password: "StrongPassword123!" });
    expect(login.status).toBe(200);
    csrfToken = login.body.data.csrfToken;
    expect((await agent.get("/api/v1/auth/me")).body.data.admin.email).toBe(
      "admin@wedding.test",
    );
  });
  it("creates guests, resolves personal links, and validates RSVP limits", async () => {
    const created = await agent
      .post("/api/v1/admin/guests")
      .set("X-CSRF-Token", csrfToken)
      .send({
        fullName: "Ibu Kartini Putri",
        phone: "628111222333",
        groupName: "VIP",
        maxGuests: 2,
      });
    expect(created.status).toBe(201);
    createdGuestId = created.body.data.id;
    const pathValue = created.body.data.personalizedPath as string;
    expect(pathValue).toMatch(/^\/andi-siti\/ibu-kartini-putri-[a-f0-9]{16}$/);
    guestSlug = pathValue.split("/").at(-1) || "";
    const lookup = await request(app).get(
      `/api/v1/invitations/andi-siti/guests/by-slug/${guestSlug}`,
    );
    expect(lookup.status).toBe(200);
    expect(lookup.body.data.guest.fullName).toBe("Ibu Kartini Putri");
    const duplicate = await agent
      .post("/api/v1/admin/guests")
      .set("X-CSRF-Token", csrfToken)
      .send({ fullName: "Ibu Kartini Putri", maxGuests: 1 });
    expect(duplicate.status).toBe(201);
    expect(duplicate.body.data.guestSlug).not.toBe(guestSlug);
    await agent
      .delete(`/api/v1/admin/guests/${duplicate.body.data.id}`)
      .set("X-CSRF-Token", csrfToken);
    expect(
      (
        await request(app).get(
          "/api/v1/invitations/andi-siti/guests/by-slug/not-a-real-guest",
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post("/api/v1/public/rsvp")
          .send({
            slug: "andi-siti",
            guestSlug,
            guestName: "Ibu Kartini Putri",
            attendanceStatus: "ATTENDING",
            guestCount: 5,
          })
      ).status,
    ).toBe(400);
    const r1 = await request(app)
      .post("/api/v1/public/rsvp")
      .send({
        slug: "andi-siti",
        guestSlug,
        guestName: "Ibu Kartini Putri",
        attendanceStatus: "ATTENDING",
        guestCount: 2,
        message: "Sampai jumpa!",
      });
    expect(r1.status).toBe(201);
    const r2 = await request(app)
      .post("/api/v1/public/rsvp")
      .send({
        slug: "andi-siti",
        guestSlug,
        guestName: "Ibu Kartini Putri",
        attendanceStatus: "NOT_ATTENDING",
        guestCount: 1,
        message: "Berhalangan.",
      });
    expect(r2.status).toBe(201);
    expect(r2.body.data.id).toBe(r1.body.data.id);
  });
  it("supports public RSVP edit tokens and wish moderation", async () => {
    const publicRsvp = await request(app)
      .post("/api/v1/public/rsvp")
      .send({
        slug: "andi-siti",
        guestName: "Tamu Publik",
        attendanceStatus: "ATTENDING",
        guestCount: 1,
      });
    expect(publicRsvp.status).toBe(201);
    expect(publicRsvp.body.data.editToken).toBeTruthy();
    const wish = await request(app)
      .post("/api/v1/public/wishes")
      .send({
        slug: "andi-siti",
        authorName: "Sahabat Lama",
        relationLabel: "Teman SMA",
        message: "Selamat berbahagia untuk kalian berdua!",
      });
    expect(wish.status).toBe(201);
    expect(wish.body.data.status).toBe("PENDING");
    createdWishId = wish.body.data.id;
    const before = await request(app).get("/api/v1/invitations/andi-siti");
    expect(
      before.body.data.wishes.some((w: any) => w.id === createdWishId),
    ).toBe(false);
    const approved = await agent
      .patch(`/api/v1/admin/wishes/${createdWishId}/approve`)
      .set("X-CSRF-Token", csrfToken);
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe("APPROVED");
    const after = await request(app).get("/api/v1/invitations/andi-siti");
    expect(
      after.body.data.wishes.some((w: any) => w.id === createdWishId),
    ).toBe(true);
  });
  it("validates image uploads and exports CSV safely", async () => {
    const bad = await agent
      .post("/api/v1/admin/gallery")
      .set("X-CSRF-Token", csrfToken)
      .field("title", "Spoofed")
      .attach("image", Buffer.from("not-an-image"), {
        filename: "evil.png",
        contentType: "image/png",
      });
    expect(bad.status).toBe(400);
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
    ]);
    const good = await agent
      .post("/api/v1/admin/gallery")
      .set("X-CSRF-Token", csrfToken)
      .field("title", "Test Photo")
      .attach("image", png, {
        filename: "photo.png",
        contentType: "image/png",
      });
    expect(good.status).toBe(201);
    expect(good.body.data.imageUrl).toMatch(/^\/uploads\//);
    expect(
      (
        await agent
          .delete(`/api/v1/admin/gallery/${good.body.data.id}`)
          .set("X-CSRF-Token", csrfToken)
      ).status,
    ).toBe(200);
    const csv = await agent.get("/api/v1/admin/rsvps/export");
    expect(csv.status).toBe(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.text).toContain("Ibu Kartini Putri");
    expect(
      (
        await agent
          .delete(`/api/v1/admin/guests/${createdGuestId}`)
          .set("X-CSRF-Token", csrfToken)
      ).status,
    ).toBe(200);
  });
});
