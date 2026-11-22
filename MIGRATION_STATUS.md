# Status Migrasi Wedding Invitation — SQLite ke PostgreSQL + Prisma

Tanggal pekerjaan: 22 November 2026

## Keputusan arsitektur
- Frontend: Vue 3 + Vite + TypeScript
- Backend: Express.js + TypeScript
- ORM: Prisma Client
- Database target: PostgreSQL di Neon
- Runtime connection: `DATABASE_URL` (Neon pooled URL)
- Migration connection: `DIRECT_URL` (Neon direct/unpooled URL)
- Media production: Cloudinary
- Local storage: development/test fallback saja

## Refactoring yang sudah diterapkan pada source workspace
- Menambahkan Prisma singleton `backend/src/db/prisma.ts`.
- Menulis ulang seluruh 13 model pada `prisma/schema.prisma` berdasarkan 13 tabel SQLite sebelumnya.
- Menghapus adapter `node:sqlite`, `DatabaseSync`, `backend/src/db/client.ts`, dan `backend/src/db/schema.ts` dari source aktif.
- Memigrasikan service admin/auth/session, invitation/couple, templates, events, stories, galleries, guests, RSVP, wishes, gifts, settings, dan dashboard ke Prisma Client asynchronous.
- Mengubah admin/public route handler agar menunggu operasi async.
- Mengubah seed menjadi Prisma seed idempotent untuk template, admin environment, invitation, couple, events, stories, galleries, guests, RSVP, wishes, gifts, dan site settings.
- Menambahkan Cloudinary provider, validasi tipe file berdasarkan magic bytes, dan local fallback non-production.
- Menambahkan liveness/readiness endpoint dan graceful Prisma disconnect.
- Menambahkan Dockerfile, `.dockerignore`, `.env.example`, serta panduan deployment.
- Mengubah integration test supaya menggunakan database PostgreSQL terpisah melalui `TEST_DATABASE_URL`.
- Membuat initial migration SQL berdasarkan `schema.prisma` di `prisma/migrations/20261122180000_init_postgresql/`.

## Pemeriksaan yang berhasil dilakukan
- Pemeriksaan sintaks TypeScript menggunakan compiler API lokal: 33 file TypeScript berhasil ditranspilasi tanpa diagnostic sintaks.
- Pencarian source aktif: tidak ditemukan lagi import `node:sqlite`, `DatabaseSync`, `.prepare()`, `getDb()`, `withTransaction()`, atau `initializeSchema()`.
- Jumlah model Prisma: 13.

## Pemeriksaan yang BELUM dapat dilakukan
- `npm install` timeout pada environment pengerjaan; tidak tersedia `node_modules` dan `package-lock.json`.
- Prisma CLI belum tersedia sehingga `prisma validate`, `prisma generate`, dan pemeriksaan konsistensi migration belum dapat dijalankan.
- Tidak tersedia `psql`, PostgreSQL server, atau Docker pada environment ini.
- Belum tersedia kredensial Neon/PostgreSQL dan Cloudinary untuk integration test nyata.
- TypeScript type-check penuh, frontend build, unit test, API integration test, migration deploy, Cloudinary upload/delete, dan container startup belum diverifikasi.

## Status deployment
**Belum boleh dianggap production-ready.** Source refactor dan SQL migration awal sudah disiapkan, tetapi migration SQL ditulis dari model Prisma dan belum diverifikasi oleh Prisma CLI atau PostgreSQL engine. Dependency lockfile juga belum berhasil dihasilkan.

## Langkah verifikasi wajib pada environment yang memiliki akses npm dan PostgreSQL
1. Salin `.env.example` menjadi `.env` dan isi `DATABASE_URL` serta `DIRECT_URL` ke database development.
2. Jalankan `npm install` untuk menghasilkan `package-lock.json`.
3. Jalankan `npm run prisma:validate` dan `npm run prisma:generate`.
4. Jalankan `npm run prisma:migrate:deploy` untuk menerapkan migration awal pada database development kosong.
5. Jalankan `npm run lint`, `npm run build`, dan `npm test` dengan `TEST_DATABASE_URL` ke database test terpisah.
6. Perbaiki seluruh error hasil verifikasi sebelum deploy.
7. Uji Cloudinary upload/delete dan health readiness di staging.
8. Baru deploy ke production Neon + Cloudinary.
