# Deployment — Wedding Invitation

## Arsitektur target
- Vue 3 + Vite + TypeScript, disajikan oleh Express pada origin yang sama.
- Express.js + TypeScript.
- Prisma ORM + PostgreSQL di Neon.
- Cloudinary untuk media permanen.

## Environment variables wajib
- `NODE_ENV=production`
- `PORT` (diisi platform container)
- `DATABASE_URL`: Neon pooled connection string untuk runtime.
- `DIRECT_URL`: Neon direct/unpooled connection string untuk Prisma Migrate.
- `SESSION_SECRET`: random secret minimal 32 karakter.
- `ADMIN_EMAIL` dan `ADMIN_PASSWORD`: akun admin bootstrap; password minimal 12 karakter.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- `APP_URL`: URL publik aplikasi.

Jangan commit `.env` atau kredensial ke Git. Simpan seluruh rahasia pada environment/secrets platform hosting.

## Local setup
```bash
cp .env.example .env
npm install
npm run prisma:validate
npm run prisma:generate
```

Setelah initial migration dibuat dan database development tersedia:
```bash
npm run prisma:migrate:dev
npm run dev
```

## Production
Dockerfile melakukan instalasi dependency, generate Prisma Client, build frontend, lalu saat container mulai menjalankan `prisma migrate deploy` sebelum Express.

Untuk platform yang menyediakan release/pre-deploy command, gunakan `npx prisma migrate deploy` sebagai release command dan jalankan container dengan `npm start`.

## Test
Gunakan database PostgreSQL khusus yang boleh dikosongkan. Jangan arahkan `TEST_DATABASE_URL` ke database production.
```bash
TEST_DATABASE_URL="postgresql://.../wedding_test?sslmode=require" npm test
```

Integration test membersihkan tabel pada database test sebelum seed. Pastikan database test terpisah.

## Catatan status
Migration SQL belum dibuat di tahap refactoring ini. Jalankan `prisma migrate dev --name init` hanya setelah schema Prisma divalidasi dan database development tersedia. Jangan deploy sebelum initial migration committed dan seluruh build/test lulus.
