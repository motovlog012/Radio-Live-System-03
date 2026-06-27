# 📻 Radio Live Broadcasting Management System

Sistem manajemen siaran radio untuk sekolah, kampus, komunitas, maupun radio profesional. Mendukung live streaming, request lagu via QR Code dengan antrean cerdas, upload lagu, jadwal siaran otomatis (scheduler), panel admin multi-role, dan monitoring realtime.

> **Status project**: fondasi inti yang sudah berfungsi penuh dan **production-ready untuk Railway** (lihat `README_DEPLOY.md`). Database menggunakan **PostgreSQL** (wajib, karena beberapa kolom memakai tipe enum yang tidak didukung SQLite).
>
> - **Server streaming audio nyata (Icecast/SHOUTcast/RTMP/WebRTC)** belum dijalankan otomatis — aplikasi web ini menyediakan UI player, kontrol siaran, dan integrasi titik mount, tapi Anda perlu menjalankan/mengoperasikan server Icecast sendiri (konfigurasi docker-compose tersedia lewat `--profile streaming`).
> - Fitur yang **sudah bekerja penuh**: autentikasi JWT + RBAC, dashboard realtime (Socket.io), request lagu via QR dengan antrean cerdas (auto pindah ke hari berikutnya jika penuh, deteksi duplikat & gabung prioritas), live request board realtime, **upload lagu (file audio sungguhan via multer)**, playlist CRUD, **scheduler radio otomatis** (auto start/stop broadcast sesuai jadwal), pengumuman realtime, kontrol broadcast manual (start/stop/pause/resume), activity log, rate limiting, dan UI modern (dark/light, glassmorphism, animasi Framer Motion, responsive).
> - Fitur seperti audio mixing browser (VU meter/spectrum analyzer/noise suppression), backup ke Google Drive/Dropbox, notifikasi WhatsApp/Telegram/Discord, dan reset semester adalah modul lanjutan yang **belum diimplementasikan** — struktur kode (services terpisah, RBAC, activity log) sudah disiapkan agar mudah ditambahkan.

---

## 🧱 Struktur Project

```
radio-live-system/
├── backend/
│   ├── src/
│   │   ├── routes/       # auth, songs, upload, playlists, requests, schedules, announcements, broadcast
│   │   ├── middleware/   # auth & RBAC
│   │   ├── services/     # scheduler.service.ts (auto start/stop siaran)
│   │   ├── socket/       # realtime events
│   │   └── utils/        # JWT helper
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/   # migration history PostgreSQL (sudah di-commit)
│   │   └── seed.ts
│   ├── railway.json
│   └── Dockerfile
├── frontend/
│   ├── scripts/inject-env.sh   # runtime env injection saat container start
│   └── src/
│       ├── app/           # /, /login, /request, /dashboard, /songs, /playlist, /schedule
│       ├── components/    # AudioPlayer, Navbar, LiveBadge
│       └── lib/           # api client, socket client, zustand store, runtime-config
├── docker/nginx.conf
├── docker-compose.yml
├── README.md (file ini)
└── README_DEPLOY.md      # panduan khusus deploy ke Railway
```

---

## ⚙️ Teknologi

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, TailwindCSS, Framer Motion, Zustand, Socket.io-client, qrcode.react |
| Backend | Node.js, Express, TypeScript, Socket.io, Prisma ORM, Multer (upload file) |
| Database | **PostgreSQL** (wajib — mendukung enum Role/RequestStatus/BroadcastState) |
| Auth | JWT (access + refresh token), RBAC 7 role |
| Streaming | Slot integrasi Icecast (opsional, profile Docker terpisah) |
| Deployment | Docker, Docker Compose, Railway, Nginx reverse proxy |

---

## 👥 Role Pengguna (RBAC)

| Role | Akses |
|---|---|
| `SUPER_ADMIN` | Akses penuh ke semua modul |
| `ADMIN` | Mengatur sistem, jadwal, playlist, request |
| `PENYIAR` | Kontrol siaran, playlist, moderasi request |
| `OPERATOR` | Mengatur playlist & lagu (termasuk upload) |
| `GURU` | Membuat pengumuman |
| `SISWA` | Request lagu |
| `GUEST` | Hanya mendengarkan |

---

## 🚀 Cara Menjalankan Secara Lokal

### 1. Siapkan PostgreSQL (wajib)

Cara tercepat — pakai Docker hanya untuk database:
```bash
docker run -d --name radio-db -e POSTGRES_USER=radio -e POSTGRES_PASSWORD=radio_password -e POSTGRES_DB=radio_live -p 5432:5432 postgres:16-alpine
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env -> DATABASE_URL="postgresql://radio:radio_password@localhost:5432/radio_live?schema=public"
npm install
npx prisma migrate deploy   # menjalankan migration yang sudah disiapkan
npm run seed                # membuat akun demo & data contoh
npm run dev                 # jalan di http://localhost:4000
```

Akun demo setelah seeding (password semua: `password123`):
- `superadmin@radio.local`, `admin@radio.local`, `penyiar@radio.local`, `operator@radio.local`, `guru@radio.local`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev          # jalan di http://localhost:3000
```

Buka `http://localhost:3000` — QR Code di halaman utama otomatis mengarah ke `http://localhost:3000/request`.

---

## 🐳 Cara Deploy dengan Docker Compose (lokal/VPS)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

PostgreSQL otomatis disiapkan oleh compose (service `db`). Tambahkan profile untuk fitur opsional:

```bash
docker compose --profile streaming up --build     # + Icecast
docker compose --profile production up --build    # + Nginx reverse proxy
```

---

## ☁️ Deploy ke Railway

Lihat **`README_DEPLOY.md`** untuk panduan lengkap step-by-step: membuat service PostgreSQL, mengisi Environment Variables, build/start command, menjalankan migration, dan redeploy.

---

## 🎙️ Upload Lagu

Halaman `/songs` (login sebagai Admin/Operator) memungkinkan upload file audio sungguhan (MP3, WAV, FLAC, AAC, OGG, M4A) lewat `POST /api/upload/song`, disimpan di folder `uploads/` dan disajikan lewat `/uploads/<nama-file>`.

> ⚠️ **Penting**: filesystem container (termasuk Railway) bersifat *ephemeral* — file akan hilang saat redeploy kecuali Anda memasang **Volume** (Railway mendukung ini) atau memindahkan storage ke S3-compatible (MinIO, Cloudflare R2, dll).

---

## 📅 Scheduler Radio (Auto Start/Stop)

`backend/src/services/scheduler.service.ts` berjalan tiap 60 detik, membandingkan waktu server dengan kolom `startTime`/`endTime` di tabel `Schedule` (berbasis hari dalam minggu). Saat waktu cocok dan `autoStart`/`autoStop` aktif, sistem otomatis membuat/menutup `BroadcastSession` dan mengirim event Socket.io ke seluruh dashboard yang terhubung.

> Untuk skala produksi besar dengan banyak instance, pertimbangkan mengganti pendekatan `setInterval` ini dengan job scheduler terdedikasi (BullMQ + Redis) agar tahan restart & tidak terduplikasi antar instance.

---

## 🔐 Keamanan yang Sudah Diterapkan

- Helmet (HTTP security headers, termasuk `crossOriginResourcePolicy` agar file upload bisa diakses dari domain frontend yang berbeda)
- `trust proxy` diaktifkan (wajib di belakang reverse proxy seperti Railway)
- Rate limiting global (anti brute-force/spam)
- JWT access + refresh token, httpOnly cookie (otomatis `secure` + `sameSite=none` di production untuk dukung domain frontend/backend berbeda)
- RBAC di setiap endpoint sensitif
- Validasi input dengan Zod di semua route
- Validasi tipe file & ukuran maksimum saat upload audio
- Password hashing dengan bcrypt
- Activity log untuk audit (login, broadcast start/stop, scheduler, dll)

---

## 🧩 Menambahkan Fitur Lanjutan (roadmap)

- **Audio mixer browser** (VU meter, spectrum analyzer) → Web Audio API di `components/Mixer.tsx`.
- **Reset Semester** dengan konfirmasi password + OTP → `prisma.$transaction` + backup otomatis sebelum eksekusi.
- **Notifikasi WhatsApp/Telegram/Discord** → `backend/src/services/notification.service.ts`.
- **PWA** → tambahkan `manifest.json` + service worker.
- **Swagger/OpenAPI** → `swagger-jsdoc` + `swagger-ui-express`.
- **Storage S3/MinIO untuk upload** → ganti `multer.diskStorage` dengan `multer-s3` agar file tidak hilang saat redeploy.

---

## 🖥️ Kompatibilitas

Berjalan di browser modern (Chrome, Edge, Firefox, Safari) di Windows, Linux, macOS, Android, dan iOS — berbasis web responsif (Next.js + Tailwind).

---

## 📝 Lisensi

Gunakan dan modifikasi bebas untuk kebutuhan internal sekolah/kampus/komunitas Anda.
