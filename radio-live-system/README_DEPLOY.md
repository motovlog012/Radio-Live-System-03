# 🚂 README_DEPLOY.md — Deploy ke Railway

Panduan ini khusus untuk men-deploy **Radio Live Broadcasting Management System** ke Railway sebagai **2 service terpisah**: `backend` dan `frontend`, plus 1 service PostgreSQL.

---

## 0. Struktur Deploy

Project ini adalah **monorepo dengan 2 service independen** (bukan satu app tunggal), karena frontend (Next.js) dan backend (Express API + Socket.io) memang dirancang terpisah — ini justru lebih baik untuk Railway karena masing-masing bisa di-scale, di-restart, dan diberi domain sendiri secara independen.

Anda akan membuat **3 service Railway** dalam 1 Project:
1. **PostgreSQL** (database, disediakan Railway)
2. **backend** (Root Directory: `backend`)
3. **frontend** (Root Directory: `frontend`)

---

## 1. Buat Project & Database PostgreSQL

1. Login ke [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo** → pilih repo `radio-live-system` Anda (push dulu seluruh isi folder ini ke GitHub jika belum)
3. Di dalam project yang baru dibuat, klik **+ New → Database → Add PostgreSQL**
4. Setelah selesai provisioning, klik service PostgreSQL tersebut → tab **Variables** → catat/copy nilai `DATABASE_URL` (formatnya seperti `postgresql://postgres:xxxxx@xxxxx.railway.internal:5432/railway`)

> 💡 Tips: Anda tidak perlu copy-paste manual. Di Railway, Anda bisa mereferensikan variable antar service dengan sintaks `${{Postgres.DATABASE_URL}}` langsung di Variables service backend.

---

## 2. Deploy Service Backend

1. Di project yang sama, klik **+ New → GitHub Repo** (atau **Empty Service** lalu hubungkan ke repo) → pilih repo yang sama
2. Buka tab **Settings** service ini:
   - **Root Directory**: `backend`
   - **Builder**: Railway akan otomatis mendeteksi `backend/railway.json` dan `backend/Dockerfile` → pastikan **Build Method = Dockerfile**
3. Buka tab **Variables**, tambahkan:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference ke service Postgres) |
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` *(Railway override otomatis lewat env `PORT` bawaan platform, baris ini hanya fallback)* |
   | `JWT_ACCESS_SECRET` | hasil dari `openssl rand -hex 32` |
   | `JWT_REFRESH_SECRET` | hasil dari `openssl rand -hex 32` (berbeda dari access secret) |
   | `CORS_ORIGIN` | isi nanti setelah frontend punya domain (lihat langkah 4) |
   | `MAX_REQUESTS_PER_DAY` | `50` |
   | `UPLOAD_DIR` | `uploads` |
   | `MAX_UPLOAD_SIZE_MB` | `20` |

4. **Deploy**. Railway akan:
   - `npm install` (otomatis trigger `postinstall` → `prisma generate`)
   - `npx prisma generate` (di Dockerfile, sebagai jaring pengaman tambahan)
   - `npm run build` (compile TypeScript)
   - Saat container start: `npx prisma migrate deploy` (menerapkan migration yang sudah ada di `prisma/migrations/`) → fallback otomatis ke `prisma db push` jika perlu → lalu `node dist/index.js`

5. Setelah deploy sukses, buka tab **Settings → Networking → Generate Domain** untuk dapat URL publik backend (misal `https://radio-backend.up.railway.app`). **Catat URL ini.**

6. (Opsional) Isi data awal dengan menjalankan seed satu kali lewat tab **Shell** Railway pada service backend:
   ```bash
   npm run seed
   ```

### Build Command / Start Command (referensi)
Karena project menggunakan **Dockerfile** (lihat `backend/railway.json`), Railway **tidak memakai** kotak "Build Command"/"Start Command" manual — semuanya didefinisikan di `backend/Dockerfile`. Jika suatu saat Anda mematikan Dockerfile builder dan beralih ke Nixpacks, gunakan:
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npx prisma migrate deploy && npm start`

---

## 3. Deploy Service Frontend

1. Tambah service baru lagi: **+ New → GitHub Repo** → repo yang sama
2. Tab **Settings**:
   - **Root Directory**: `frontend`
   - **Builder**: Dockerfile (otomatis terdeteksi dari `frontend/railway.json`)
3. Tab **Variables**, tambahkan:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | URL backend dari langkah 2.5 (misal `https://radio-backend.up.railway.app`) |
   | `NEXT_PUBLIC_STREAM_URL` | URL stream Icecast Anda (atau isi placeholder dulu jika belum ada) |

   > Variable ini **tidak perlu** di-set sebagai "build-time" secara khusus — `frontend/scripts/inject-env.sh` membacanya otomatis **setiap kali container start** dan menuliskannya ke `public/runtime-env.js`. Jadi kalau Anda ganti URL backend nanti, cukup ubah variable di Railway lalu **redeploy** (tidak perlu rebuild ulang dari nol, cukup restart juga sudah cukup karena entrypoint jalan tiap start).

4. **Deploy**. Setelah selesai, generate domain publik juga lewat **Settings → Networking → Generate Domain** (misal `https://radio-frontend.up.railway.app`).

### Build Command / Start Command (referensi, jika tidak pakai Dockerfile)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `sh scripts/inject-env.sh npm start`

---

## 4. Hubungkan Backend ↔ Frontend (CORS)

Balik ke service **backend** → tab **Variables** → update:

```
CORS_ORIGIN=https://radio-frontend.up.railway.app
```

(Bisa lebih dari satu domain, dipisah koma, misal jika Anda juga punya custom domain: `https://radio.sekolahku.sch.id,https://radio-frontend.up.railway.app`)

Klik **Deploy** lagi pada service backend agar variable baru diterapkan.

---

## 5. Cara Menjalankan Prisma Migration di Railway

Migration history sudah disertakan di `backend/prisma/migrations/` dan otomatis dijalankan saat container start lewat:
```
npx prisma migrate deploy
```
(didefinisikan di `CMD` pada `backend/Dockerfile`).

**Menjalankan manual** (misal setelah mengubah schema dan menambah migration baru):
1. Buka service backend di Railway → tab **Shell** (atau gunakan Railway CLI: `railway run sh`)
2. Jalankan:
   ```bash
   npx prisma migrate deploy
   ```

**Membuat migration baru** (dilakukan dari komputer lokal Anda, bukan di Railway):
```bash
# Pastikan DATABASE_URL lokal mengarah ke Postgres Railway (ambil dari Variables),
# atau ke Postgres lokal Anda dulu lalu migration-nya dicommit ke git.
npx prisma migrate dev --name nama_perubahan
git add prisma/migrations
git commit -m "Add migration: nama_perubahan"
git push
```
Setelah push, Railway akan rebuild & otomatis menjalankan `migrate deploy` saat container start.

---

## 6. Cara Melakukan Redeploy

**Otomatis**: setiap `git push` ke branch yang terhubung akan memicu redeploy otomatis di kedua service.

**Manual** (tanpa push kode baru, misal setelah ganti Environment Variable):
1. Buka service di Railway
2. Klik tab **Deployments**
3. Klik **⋮ (menu titik tiga)** pada deployment teratas → **Redeploy**

Atau lewat Railway CLI:
```bash
railway up
```

---

## 7. Checklist Setelah Deploy

- [ ] Buka URL frontend, pastikan halaman utama (`/`) muncul dengan QR Code
- [ ] Login dengan akun seed (`admin@radio.local` / `password123`) di `/login`
- [ ] Cek `/dashboard` menampilkan status broadcast & bisa Start/Stop
- [ ] Cek `/songs` bisa upload file audio (login sebagai Admin/Operator)
- [ ] Cek `/request` bisa kirim request lagu dan muncul realtime di Live Request Board
- [ ] **Ganti password default** akun-akun seed setelah login pertama
- [ ] Tambahkan custom domain via **Settings → Networking → Custom Domain** jika punya domain sendiri

---

## 8. Troubleshooting Khusus Railway

| Masalah | Solusi |
|---|---|
| Build gagal di `npx prisma generate` dengan error P1012 | Pastikan `backend/prisma/schema.prisma` providernya `"postgresql"`, bukan `"sqlite"` (sudah diperbaiki di versi ini) |
| `prisma migrate deploy` error "No migration found" | Pastikan folder `backend/prisma/migrations/` ikut ter-commit ke git (jangan masuk `.gitignore`) |
| Login gagal / CORS error di browser console | Cek `CORS_ORIGIN` di backend sama persis dengan domain frontend (termasuk `https://`, tanpa trailing slash) |
| File upload sukses tapi link "Dengarkan" 404 | Pastikan mengakses lewat domain backend yang benar; jika baru redeploy tanpa Volume, file lama otomatis hilang (filesystem ephemeral) — pasang Railway Volume di `/app/uploads` untuk persistensi |
| Variable `NEXT_PUBLIC_API_URL` tidak terbaca di frontend | Pastikan service frontend benar-benar restart/redeploy setelah ubah variable — `scripts/inject-env.sh` jalan saat container *start*, bukan saat idle |
| Socket.io tidak realtime (request lagu tidak muncul otomatis) | Pastikan tidak ada proxy/CDN di depan backend yang memblokir WebSocket upgrade; Railway secara default sudah mendukung WebSocket tanpa konfigurasi tambahan |

---

Selesai! Aplikasi Anda sekarang berjalan di Railway dengan PostgreSQL, migration otomatis, upload lagu, scheduler radio, dan seluruh fitur inti lainnya.
