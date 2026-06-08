# RuangTemu — Social Dining Platform

> **"Satu Meja, Enam Cerita"** — Platform yang mempertemukan orang-orang asing dalam makan malam grup kecil yang bermakna.

RuangTemu adalah social dining platform di mana pengguna mendaftar, memilih jadwal dinner, membayar via QRIS, lalu sistem otomatis **mencocokkan** mereka ke meja berdasarkan **rentang usia** dan **kesamaan minat**. Lokasi dinner dirahasiakan hingga H-1.

---

## Daftar Isi

1. [Gambaran Produk](#1-gambaran-produk)
2. [Tech Stack](#2-tech-stack)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Struktur Proyek](#4-struktur-proyek)
5. [Data Model](#5-data-model)
6. [Alur Pengguna (User Flow)](#6-alur-pengguna-user-flow)
7. [Setup Lokal](#7-setup-lokal)
8. [Environment Variables](#8-environment-variables)
9. [Fitur Utama — Penjelasan Teknis](#9-fitur-utama--penjelasan-teknis)
10. [API Reference](#10-api-reference)
11. [Deploy ke VPS](#11-deploy-ke-vps)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Gambaran Produk

### Konsep Inti
- Setiap **Dinner** berlangsung di satu kota pada hari tertentu (biasanya Jumat/Sabtu).
- Setiap dinner punya beberapa **Budget Tier** (mis. Casual Rp175.000, Premium Rp275.000) — harga sudah termasuk makan & minum.
- Pengguna booking → bayar QRIS manual → admin verifikasi → sistem **matching** otomatis mengelompokkan peserta ke **meja** (maks. 6 orang).
- **H-1**, lokasi detail (nama & alamat venue) dikirim via email/WhatsApp.

### Aktor
| Aktor | Kemampuan |
|---|---|
| **Guest** | Lihat landing, jadwal dinner publik, daftar akun |
| **User** | Booking dinner, bayar & upload bukti, lihat status meja, daftar event |
| **Admin** | CRUD kota/dinner/event, verifikasi pembayaran, jalankan matching, reveal lokasi, kelola pengaturan |

---

## 2. Tech Stack

### Backend
| Teknologi | Peran |
|---|---|
| **Node.js + Express.js** | REST API server |
| **TypeScript** | Type safety |
| **Prisma ORM** | Database access layer (provider: `mysql`) |
| **MariaDB / MySQL** | Database utama |
| **Zod** | Validasi request/response |
| **argon2** | Hashing password |
| **JWT** | Access token (15m) + Refresh token (7d) |
| **Multer** | Upload file (bukti bayar, QRIS, poster event) |
| **Nodemailer** | Kirim email notifikasi |
| **node-cron** | Scheduled jobs (auto-cancel, reveal lokasi, reminder) |
| **Helmet + CORS + express-rate-limit** | Keamanan |
| **pino** | Structured logging |

### Frontend
| Teknologi | Peran |
|---|---|
| **Next.js 14** (App Router) | React framework SSR/SSG |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling utility-first |
| **TanStack Query (React Query)** | Server state, caching, refetching |
| **React Hook Form + Zod** | Form & validasi |
| **Zustand** | Global state (auth, session) |
| **Framer Motion** | Animasi halaman landing |
| **Lucide React** | Ikon |
| **Axios** | HTTP client dengan auto-refresh token |

### Infrastruktur
| Komponen | Detail |
|---|---|
| **VPS** | Ubuntu — `194.233.90.4` |
| **Web server** | Apache (reverse proxy ke PM2) |
| **Process manager** | PM2 (dua app: `ruangtemu-api` & `web-ruangtemu`) |
| **DNS / CDN** | Cloudflare — A record Proxied, SSL Full (strict) |
| **SSL** | Let's Encrypt via `certbot --apache` |
| **Firewall** | `firewalld` — hanya port 22, 80, 443 |

---

## 3. Arsitektur Sistem

```
Internet
    │
    ▼
Cloudflare (Proxied, SSL Full Strict)
    │ HTTPS :443
    ▼
Apache Virtual Host (ruangtemu.biz.id)
    │
    ├── /api/*  ──► Express.js  127.0.0.1:3200  (PM2: ruangtemu-api)
    │                   │
    │                   └── Prisma ORM ──► MariaDB :3306
    │
    └── /*      ──► Next.js     127.0.0.1:3201  (PM2: web-ruangtemu)
                        │
                        └── Axios ──► /api/* (melalui Apache, loop lokal)
```

> **Penting:** Backend **hanya** bind ke `127.0.0.1`, tidak pernah expose ke internet. Port 3200/3201 tidak dibuka di firewalld. Semua traffic masuk lewat Apache.

### Alur Request API dari Frontend

```
Browser → https://ruangtemu.biz.id/api/auth/login
       → Apache (proxy /api/ → 127.0.0.1:3200)
       → Express route /auth/login
       → Prisma → MariaDB
       → Response JSON
```

---

## 4. Struktur Proyek

```
ruangtemu.biz.id/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Skema database lengkap
│   │   ├── migrations/           # File migrasi (auto-generated)
│   │   └── seed.ts               # Data awal: kota, minat, admin, testimonial
│   │
│   ├── src/
│   │   ├── lib/
│   │   │   ├── prisma.ts         # Singleton Prisma client
│   │   │   ├── jwt.ts            # Sign & verify access/refresh token
│   │   │   └── logger.ts         # Pino logger instance
│   │   │
│   │   ├── middlewares/
│   │   │   ├── auth.ts           # authenticate(), requireAdmin(), requireVerified()
│   │   │   ├── upload.ts         # Multer: bukti bayar, QRIS, poster event
│   │   │   └── errorHandler.ts   # Centralized error handler (Zod, Prisma, generic)
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.ts           # /auth/register, /login, /refresh, /logout, /me
│   │   │   ├── users.ts          # /users/me, /users (admin CRUD)
│   │   │   ├── cities.ts         # /cities, /cities/request
│   │   │   ├── dinners.ts        # /dinners (list, detail, CRUD admin)
│   │   │   ├── bookings.ts       # /bookings (create, detail, upload-proof, cancel)
│   │   │   ├── payments.ts       # /payments (verify, reject — admin)
│   │   │   ├── matching.ts       # /matching/:dinnerId (preview, commit, tables)
│   │   │   ├── events.ts         # /events (list, register, admin CRUD)
│   │   │   ├── notifications.ts  # /notifications (list, mark read)
│   │   │   ├── testimonials.ts   # /testimonials (public list, admin CRUD)
│   │   │   ├── interests.ts      # /interests (public list, admin CRUD)
│   │   │   └── admin.ts          # /admin/overview, /settings, /settings/qris
│   │   │
│   │   ├── services/
│   │   │   ├── matchingService.ts     # Algoritma greedy clustering
│   │   │   └── notificationService.ts # Email (Nodemailer) + WA (Fonnte/Wablas)
│   │   │
│   │   ├── cron/
│   │   │   └── jobs.ts           # Auto-cancel, reveal lokasi H-1, reminder H
│   │   │
│   │   └── server.ts             # Entry point — setup Express, register routes
│   │
│   ├── uploads/                  # File upload (gitignored kecuali .gitkeep)
│   │   ├── payments/             # Bukti transfer user
│   │   ├── qris/                 # Gambar QRIS (di-upload admin)
│   │   └── posters/              # Poster event
│   │
│   ├── .env.example              # Template env vars
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router (halaman & layout)
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── layout.tsx            # Root layout (font, metadata, Providers)
│   │   │   ├── globals.css           # Tailwind + CSS variables (tema warna)
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   │
│   │   │   ├── dinners/
│   │   │   │   ├── page.tsx          # List dinner dengan filter kota
│   │   │   │   └── [id]/page.tsx     # Detail dinner + booking form
│   │   │   │
│   │   │   ├── events/
│   │   │   │   ├── page.tsx          # List event
│   │   │   │   └── [slug]/page.tsx   # Detail event (TODO: buat jika diperlukan)
│   │   │   │
│   │   │   ├── dashboard/            # Protected — hanya user terlogin
│   │   │   │   ├── page.tsx          # Overview booking aktif
│   │   │   │   ├── bookings/
│   │   │   │   │   ├── page.tsx      # Riwayat semua booking
│   │   │   │   │   └── [id]/page.tsx # Detail booking + QRIS + upload bukti
│   │   │   │   ├── profile/page.tsx  # Edit profil + pilih minat
│   │   │   │   └── notifications/page.tsx
│   │   │   │
│   │   │   ├── admin/                # Protected — hanya ADMIN
│   │   │   │   ├── page.tsx          # Dashboard metrics
│   │   │   │   ├── payments/page.tsx # Verifikasi/tolak pembayaran
│   │   │   │   ├── matching/page.tsx # Preview + commit matching
│   │   │   │   ├── dinners/page.tsx  # CRUD dinner + reveal lokasi
│   │   │   │   └── settings/page.tsx # Upload QRIS, SMTP, WA, parameter
│   │   │   │
│   │   │   ├── terms/page.tsx
│   │   │   └── privacy/page.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx        # Navbar responsif dengan dropdown user
│   │   │   │   ├── Footer.tsx        # Footer dengan link sosmed & info
│   │   │   │   └── Providers.tsx     # QueryClientProvider + Toaster
│   │   │   │
│   │   │   ├── landing/              # Komponen section landing page
│   │   │   │   ├── HeroSection.tsx
│   │   │   │   ├── StatsSection.tsx
│   │   │   │   ├── HowItWorks.tsx
│   │   │   │   ├── CitiesSection.tsx # Dengan form request kota
│   │   │   │   ├── EventsSection.tsx
│   │   │   │   ├── TestimonialsSection.tsx
│   │   │   │   └── FaqSection.tsx
│   │   │   │
│   │   │   └── ui/
│   │   │       └── toaster.tsx       # Toast notifications (placeholder)
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                # Semua fungsi API call (Axios instance + auto-refresh)
│   │   │   └── utils.ts              # cn(), formatCurrency(), formatDate(), getStatusLabel()
│   │   │
│   │   └── stores/
│   │       └── authStore.ts          # Zustand store: user, token, setAuth, clearAuth
│   │
│   ├── .env.local.example
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   └── package.json
│
├── ecosystem.config.cjs          # PM2 config (dua app)
├── .gitignore
└── README.md
```

---

## 5. Data Model

### Relasi Utama

```
User ─── UserInterest ─── Interest
  │
  └── Booking ─── BudgetTier ─── Dinner ─── City
        │               │           │
        └── Payment    (price)   DinnerTable
                                    │
                          Booking.tableId ──► DinnerTable
```

### Status Flow

**Booking:**
```
PENDING_PAYMENT → PENDING_VERIFICATION → CONFIRMED → MATCHED
                                      ↘
                                    CANCELLED (auto-cancel jika expired)
```

**Payment:**
```
PENDING → VERIFIED  (admin approve → booking jadi CONFIRMED)
        → REJECTED  (admin tolak → booking kembali ke PENDING_PAYMENT)
```

**Dinner:**
```
OPEN → MATCHING → CONFIRMED → COMPLETED
     ↘ CANCELLED
```

### Tabel Kunci

| Model | Catatan Penting |
|---|---|
| `User` | `passwordHash` disimpan argon2. `isVerified` untuk MVP selalu `true`. `isSuspended` bisa di-set admin. |
| `City.areas` | Disimpan sebagai JSON string (MySQL tidak support array native). Parse dengan `JSON.parse()` di app. |
| `Booking` | Constraint `@@unique([userId, dinnerId])` — satu user satu booking per dinner. |
| `Payment.expiredAt` | Dihitung saat booking dibuat: `now() + PAYMENT_DEADLINE_HOURS`. Cron auto-cancel jika lewat. |
| `RefreshToken` | Rotasi saat digunakan (token lama dihapus, token baru dibuat). Disimpan sebagai `VarChar(512)`. |
| `Setting` | Key-value store di DB. Diakses via `/api/admin/settings`. Termasuk URL QRIS, SMTP, WA token. |

---

## 6. Alur Pengguna (User Flow)

### Alur Booking Dinner

```
1. User browse /dinners → pilih dinner yang OPEN
2. Pilih Budget Tier → klik "Pesan Sekarang"
   → jika belum login: redirect /auth/login
3. POST /api/bookings  → status: PENDING_PAYMENT
   + Payment dibuat dengan expiredAt = now() + 24 jam
4. User ke halaman booking detail /dashboard/bookings/:id
   → lihat gambar QRIS + nominal
5. Transfer bank → upload bukti di halaman yang sama
   POST /api/bookings/:id/upload-proof
   → status: PENDING_VERIFICATION
6. Admin login → /admin/payments → lihat bukti → klik Verifikasi
   PATCH /api/payments/:id/verify
   → status Booking: CONFIRMED, Payment: VERIFIED
   → notifikasi email/WA ke user
7. Admin menjalankan matching di /admin/matching
   → preview (dry run) → commit
   → status: MATCHED, Booking.tableId diisi
   → notifikasi ke semua peserta
8. H-1: Admin reveal lokasi di /admin/dinners → "Reveal Lokasi"
   PATCH /api/dinners/:id/reveal
   → Cron job jam 08:00 kirim email/WA ke peserta dengan detail venue
9. H: Cron job jam 09:00 kirim reminder
```

### Alur Matching (Detail Teknis)

Algoritma ada di `backend/src/services/matchingService.ts`:

1. Ambil semua `Booking` dengan `status=CONFIRMED` untuk dinner terpilih.
2. Hitung usia dari `birthDate` setiap peserta.
3. Urutkan peserta by usia (ascending).
4. **Greedy clustering:**
   - Mulai dari peserta termuda, cari kandidat dalam window `ageTolerance × 2` tahun.
   - Skor kandidat = **Jaccard similarity** minat − penalti usia berlebih.
   - Isi meja hingga `maxPerTable` (default 6) orang.
5. Peserta tanpa `birthDate` ditambahkan ke meja terakhir atau meja baru.
6. Hasil bisa di-**preview** (dry run) sebelum di-commit.

> Toleransi usia (`MATCHING_AGE_TOLERANCE`) bisa diubah di `/admin/settings`. Default: 7 tahun.

---

## 7. Setup Lokal

### Prasyarat

- **Node.js v18+** — cek dengan `node -v`
- **MariaDB atau MySQL** — pastikan sudah berjalan
- **Git**

### Langkah Cepat

```bash
# Clone repo
git clone <repo-url> ruangtemu.biz.id
cd ruangtemu.biz.id
```

### A. Setup Backend

> **PowerShell users:** Gunakan `;` bukan `&&` untuk menjalankan perintah berantai.
> Atau jalankan tiap perintah satu per satu.

```powershell
cd backend

# 1. Copy & isi environment variables
cp .env.example .env
# Edit .env — minimal ubah DATABASE_URL dan JWT_SECRET

# 2. Install dependencies
npm install

# 3. Buat database MySQL (jalankan di MySQL shell atau phpMyAdmin)
# Jika pakai XAMPP (root tanpa password):
#   CREATE DATABASE ruangtemu CHARACTER SET utf8mb4;
# Lalu di .env set: DATABASE_URL="mysql://root:@127.0.0.1:3306/ruangtemu"

# 4. Generate Prisma client (tidak butuh koneksi DB)
npm run db:generate

# 5. Jalankan migrasi (butuh DB yang sudah jalan)
npm run db:migrate

# 6. Isi data awal
npm run db:seed

# 7. Jalankan server development
npm run dev
# → API tersedia di http://127.0.0.1:3200
```

**Catatan XAMPP:** MySQL XAMPP biasanya berjalan tanpa password untuk user `root`.
Gunakan `DATABASE_URL="mysql://root:@127.0.0.1:3306/ruangtemu"` di `.env`.

### B. Setup Frontend

Buka terminal baru:

```bash
cd frontend

# 1. Copy & isi env
cp .env.local.example .env.local
# Isi: NEXT_PUBLIC_API_URL=http://localhost:3200

# 2. Install dependencies
npm install

# 3. Jalankan dev server
npm run dev
# → Frontend tersedia di http://localhost:3201
```

### C. Akun Default (dari seed)

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@ruangtemu.biz.id` | `Admin@12345` |
| **User** | `user@example.com` | `User@12345` |

> Password wajib: min. 8 karakter, min. 1 huruf kapital, min. 1 angka.

### D. Script yang Tersedia

**Backend:**
| Script | Fungsi |
|---|---|
| `npm run dev` | Jalankan server dengan hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run start` | Jalankan dari hasil build (production) |
| `npm run db:generate` | Generate Prisma client dari schema |
| `npm run db:migrate` | Buat & jalankan migrasi (development) |
| `npm run db:migrate:deploy` | Jalankan migrasi yang sudah ada (production) |
| `npm run db:seed` | Isi data awal |
| `npm run db:studio` | Buka Prisma Studio (GUI database) |

**Frontend:**
| Script | Fungsi |
|---|---|
| `npm run dev` | Jalankan dev server di port 3201 |
| `npm run build` | Build production |
| `npm run start` | Jalankan dari build di port 3201, bind 127.0.0.1 |
| `npm run lint` | ESLint check |

---

## 8. Environment Variables

### Backend — `backend/.env`

```env
# ── Database ─────────────────────────────────────────────
DATABASE_URL="mysql://ruangtemu:PASSWORD@127.0.0.1:3306/ruangtemu"

# ── Server ───────────────────────────────────────────────
NODE_ENV=development        # development | production
HOST=127.0.0.1              # WAJIB 127.0.0.1 di produksi, jangan 0.0.0.0
PORT=3200

# ── Auth ─────────────────────────────────────────────────
JWT_SECRET=ganti-dengan-string-acak-min-32-karakter
JWT_ACCESS_EXPIRES=15m      # Format: 15m, 1h, 7d
JWT_REFRESH_EXPIRES=7d

# ── CORS ─────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3201   # di produksi: https://ruangtemu.biz.id

# ── Upload ───────────────────────────────────────────────
UPLOAD_DIR=./uploads        # Relatif dari root backend/
MAX_FILE_SIZE_MB=5          # Batas ukuran file upload

# ── SMTP (Email) ─────────────────────────────────────────
# Kosongkan jika tidak ingin kirim email (notifikasi akan di-skip)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false           # true untuk port 465
SMTP_USER=kamu@gmail.com
SMTP_PASS=app-password-gmail   # Google: aktifkan 2FA → App Passwords
SMTP_FROM="RuangTemu <noreply@ruangtemu.biz.id>"

# ── WhatsApp Gateway ─────────────────────────────────────
# Kosongkan jika tidak pakai WA
WA_PROVIDER=fonnte          # fonnte | wablas | (tambah provider baru di notificationService.ts)
WA_TOKEN=token-dari-provider

# ── Matching ─────────────────────────────────────────────
MATCHING_AGE_TOLERANCE=7    # Selisih usia maks tanpa penalti (tahun)
PAYMENT_DEADLINE_HOURS=24   # Batas waktu bayar setelah booking
```

### Frontend — `frontend/.env.local`

```env
# URL API backend — tanpa trailing slash
# Lokal:
NEXT_PUBLIC_API_URL=http://localhost:3200
# Produksi (via Apache proxy):
# NEXT_PUBLIC_API_URL=https://ruangtemu.biz.id/api
```

> `.env` dan `.env.local` sudah ada di `.gitignore`. Jangan pernah commit file ini.

---

## 9. Fitur Utama — Penjelasan Teknis

### Autentikasi (JWT + Refresh Token Rotation)

- **Access token** (15 menit) dikirim di header `Authorization: Bearer <token>`.
- **Refresh token** (7 hari) disimpan di tabel `refresh_tokens` dan di `localStorage` browser.
- Saat access token expired, `api.ts` otomatis memanggil `POST /api/auth/refresh` dan **merotasi** refresh token (token lama dihapus, token baru dibuat).
- Jika refresh token juga expired: user di-redirect ke `/auth/login`.

### Upload File

Multer dikonfigurasi di `backend/src/middlewares/upload.ts`:

| Endpoint | Handler | Destination | Max Size |
|---|---|---|---|
| Upload bukti bayar | `uploadPaymentProof` | `uploads/payments/` | 5 MB |
| Upload QRIS (admin) | `uploadQris` | `uploads/qris/` | 2 MB |
| Upload poster event | `uploadPoster` | `uploads/posters/` | 5 MB |

File hanya diterima jika MIME type adalah `image/jpeg`, `image/png`, atau `image/webp`.

File diakses secara publik via URL `http://localhost:3200/uploads/payments/filename.jpg` (di-serve oleh `express.static`).

### Sistem Notifikasi

`notificationService.ts` menyediakan fungsi:

```typescript
notificationService.sendPaymentConfirmed(user, booking)
notificationService.sendPaymentRejected(user, reason?)
notificationService.sendMatchResult(user, booking)
notificationService.sendLocationReveal(user, dinner)
notificationService.sendDinnerReminder(user, dinner)
```

Setiap notifikasi:
1. Kirim **email** via Nodemailer (jika `SMTP_HOST` dikonfigurasi)
2. Kirim **WhatsApp** via Fonnte (jika `WA_TOKEN` dikonfigurasi + user punya `phone`)
3. Simpan ke tabel `Notification` untuk in-app notification

Jika SMTP/WA tidak dikonfigurasi, notifikasi di-skip (log info) tanpa error.

### Cron Jobs

Berjalan otomatis saat server start (`startCronJobs()` dipanggil di `server.ts`):

| Jadwal | Fungsi |
|---|---|
| Setiap 30 menit | Auto-cancel booking yang `PENDING_PAYMENT` dan `payment.expiredAt < now()` |
| Setiap hari jam 08:00 | Kirim email/WA reveal lokasi ke peserta dinner besok (`status=CONFIRMED`) |
| Setiap hari jam 09:00 | Kirim reminder ke peserta dinner hari ini |

### Matching Algorithm

Lihat `backend/src/services/matchingService.ts`:

```
Input: semua Booking[status=CONFIRMED] untuk satu Dinner

1. Hitung usia setiap peserta dari birthDate
2. Urutkan peserta by usia (ascending)
3. Greedy clustering:
   for setiap peserta belum di-assign:
     buat meja baru dengan peserta ini sebagai "anchor"
     cari kandidat dalam window ageTolerance*2 tahun
     score = JaccardSimilarity(interests_anchor, interests_kandidat)
             - max(0, |usia_anchor - usia_kandidat| - ageTolerance) * 0.1
     tambahkan kandidat dengan score tertinggi sampai meja penuh
4. Peserta tanpa birthDate → tambahkan ke meja terakhir

Output: array DinnerTable + update Booking.tableId + status=MATCHED
```

**Preview (dry run)** tersedia di `/api/matching/:dinnerId/preview` — tidak mengubah database, hanya mengembalikan rencana pengelompokan.

### Pengaturan Sistem (Settings)

Disimpan di tabel `Setting` (key-value). Admin mengubahnya via `/admin/settings`. Nilai yang diambil runtime (cron, notifikasi, matching) dibaca dari tabel, bukan env var — sehingga bisa diubah tanpa restart server untuk beberapa parameter.

Kecuali: `SMTP_HOST`, `WA_TOKEN`, dll yang sifatnya credential tetap dibaca dari env var di startup.

---

## 10. API Reference

Semua endpoint diawali dengan `/api/` (atau tanpa prefix jika mengakses backend langsung di port 3200).

### Konvensi

- Request body: `application/json` (kecuali upload: `multipart/form-data`)
- Auth: `Authorization: Bearer <accessToken>`
- Error format: `{ "message": "...", "errors"?: { field: [...] } }`

### Auth

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| POST | `/auth/register` | — | Daftar akun baru |
| POST | `/auth/login` | — | Login, dapat token |
| POST | `/auth/refresh` | — | Rotate refresh token |
| POST | `/auth/logout` | User | Hapus refresh token |
| GET | `/auth/me` | User | Data user saat ini + minat |

**POST /auth/register** body:
```json
{
  "name": "Budi Santoso",
  "email": "budi@email.com",
  "password": "Password1",
  "phone": "081234567890",    // opsional
  "gender": "MALE",           // MALE | FEMALE | OTHER (opsional)
  "city": "Jakarta"           // opsional
}
```

### Users

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| PATCH | `/users/me` | User | Update profil + minat |
| GET | `/users/me/bookings` | User | Semua booking user |
| GET | `/users` | Admin | List semua user |
| GET | `/users/:id` | Admin | Detail user + riwayat booking |
| PATCH | `/users/:id/role` | Admin | Ubah role (`USER`\|`ADMIN`) |
| PATCH | `/users/:id/suspend` | Admin | Suspend/unsuspend akun |

### Cities

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/cities` | — | Kota aktif (publik) |
| GET | `/cities/all` | Admin | Semua kota termasuk nonaktif |
| POST | `/cities` | Admin | Buat kota baru |
| PUT | `/cities/:id` | Admin | Update kota |
| DELETE | `/cities/:id` | Admin | Nonaktifkan kota |
| POST | `/cities/request` | — | Request kota baru (publik) |
| GET | `/cities/requests/all` | Admin | Lihat semua request kota |

**POST /cities** body:
```json
{
  "name": "Bandung",
  "areas": ["Dago", "Braga", "Cihampelas"]
}
```

### Dinners

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/dinners` | — | Dinner mendatang (publik, lokasi disembunyikan) |
| GET | `/dinners/all` | Admin | Semua dinner |
| GET | `/dinners/:id` | — | Detail dinner + tier |
| POST | `/dinners` | Admin | Buat dinner + budget tiers |
| PUT | `/dinners/:id` | Admin | Update dinner |
| PATCH | `/dinners/:id/status` | Admin | Ubah status |
| PATCH | `/dinners/:id/reveal` | Admin | Reveal lokasi → ubah status ke `CONFIRMED` |
| DELETE | `/dinners/:id` | Admin | Set status `CANCELLED` |

**POST /dinners** body:
```json
{
  "cityId": "clxxx",
  "date": "2025-08-15T19:00:00.000Z",
  "startTime": "19:00",
  "maxPerTable": 6,
  "budgetTiers": [
    { "label": "Casual", "price": 175000 },
    { "label": "Premium", "price": 275000 }
  ]
}
```

### Bookings

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| POST | `/bookings` | User | Buat booking (dinner harus OPEN) |
| GET | `/bookings/:id` | User/Admin | Detail booking + info meja (jika sudah MATCHED) |
| POST | `/bookings/:id/upload-proof` | User | Upload bukti transfer (form-data, field: `proof`) |
| DELETE | `/bookings/:id` | User | Cancel booking (hanya PENDING_PAYMENT/VERIFICATION) |
| GET | `/bookings` | Admin | List semua booking dengan filter |

### Payments

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/payments/pending` | Admin | Pembayaran menunggu verifikasi |
| GET | `/payments` | Admin | Semua payment (dengan filter `?status=PENDING`) |
| PATCH | `/payments/:id/verify` | Admin | Verifikasi → booking jadi CONFIRMED |
| PATCH | `/payments/:id/reject` | Admin | Tolak dengan catatan → user bisa upload ulang |

### Matching

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/matching/:dinnerId/preview` | Admin | Dry run — lihat rencana kelompok tanpa commit |
| POST | `/matching/:dinnerId/commit` | Admin | Eksekusi matching → buat tabel, update booking |
| GET | `/matching/:dinnerId/tables` | Admin | Lihat tabel setelah matching |
| PATCH | `/matching/bookings/:id/table` | Admin | Pindahkan booking ke tabel lain secara manual |

### Events

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/events` | — | Event aktif publik |
| GET | `/events/all` | Admin | Semua event |
| GET | `/events/:slug` | — | Detail event |
| POST | `/events` | Admin | Buat event |
| PUT | `/events/:id` | Admin | Update event |
| POST | `/events/:id/poster` | Admin | Upload poster (form-data, field: `poster`) |
| DELETE | `/events/:id` | Admin | Set status `CANCELLED` |
| POST | `/events/:id/register` | User | Daftar event |
| GET | `/events/:id/registrations` | Admin | List peserta event |

### Notifications

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/notifications` | User | 50 notifikasi terbaru |
| PATCH | `/notifications/:id/read` | User | Tandai satu sudah dibaca |
| PATCH | `/notifications/read-all/all` | User | Tandai semua sudah dibaca |

### Admin

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/admin/overview` | Admin | Metrics dashboard (user, booking, revenue, dll) |
| GET | `/admin/settings` | Admin | Semua setting (credential disensor `***`) |
| PATCH | `/admin/settings` | Admin | Update setting (nilai `***` diabaikan) |
| POST | `/admin/settings/qris` | Admin | Upload gambar QRIS (form-data, field: `qris`) |

### Interests & Testimonials

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/interests` | — | Semua minat (untuk form profil) |
| POST | `/interests` | Admin | Tambah minat |
| DELETE | `/interests/:id` | Admin | Hapus minat |
| GET | `/testimonials` | — | Testimonial published (publik) |
| POST | `/testimonials` | Admin | Buat testimonial |
| PATCH | `/testimonials/:id` | Admin | Update/publish testimonial |
| DELETE | `/testimonials/:id` | Admin | Hapus testimonial |

### Health Check

```
GET /health
→ { "status": "ok", "timestamp": "..." }
```

---

## 11. Deploy ke VPS

### Prasyarat di VPS (`194.233.90.4`)

```bash
ssh aditya@194.233.90.4
sudo -i

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# PM2
npm install -g pm2

# Apache + certbot
apt-get install -y apache2 certbot python3-certbot-apache
a2enmod proxy proxy_http headers rewrite ssl
systemctl enable apache2
```

### 1. Buat Database

```bash
mysql -u root -p
```
```sql
CREATE DATABASE ruangtemu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ruangtemu'@'localhost' IDENTIFIED BY 'PASSWORD_SANGAT_AMAN';
GRANT ALL PRIVILEGES ON ruangtemu.* TO 'ruangtemu'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Clone & Konfigurasi

```bash
mkdir -p /var/www/ruangtemu.biz.id
cd /var/www/ruangtemu.biz.id
git clone <repo-url> .

# ── Backend ──────────────────────────────────────
cd backend
cp .env.example .env
nano .env
# Isi semua nilai:
#   DATABASE_URL → gunakan password yang dibuat tadi
#   JWT_SECRET   → generate: openssl rand -base64 48
#   HOST=127.0.0.1
#   PORT=3200
#   NODE_ENV=production
#   FRONTEND_URL=https://ruangtemu.biz.id

npm install --omit=dev
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run build
# → menghasilkan dist/server.js

# ── Frontend ─────────────────────────────────────
cd ../frontend
cp .env.local.example .env.local
echo "NEXT_PUBLIC_API_URL=https://ruangtemu.biz.id/api" > .env.local

npm install --omit=dev
npm run build
# → menghasilkan .next/
```

### 3. Apache Virtual Host

Buat file konfigurasi:

```bash
nano /etc/apache2/sites-available/ruangtemu.biz.id.conf
```

```apache
<VirtualHost *:80>
    ServerName ruangtemu.biz.id
    ProxyPreserveHost On

    # API → Express backend (perhatikan trailing slash)
    ProxyPass /api/ http://127.0.0.1:3200/
    ProxyPassReverse /api/ http://127.0.0.1:3200/

    # Semua request lain → Next.js
    ProxyPass / http://127.0.0.1:3201/
    ProxyPassReverse / http://127.0.0.1:3201/

    ErrorLog ${APACHE_LOG_DIR}/ruangtemu.biz.id-error.log
    CustomLog ${APACHE_LOG_DIR}/ruangtemu.biz.id-access.log combined
</VirtualHost>
```

```bash
a2ensite ruangtemu.biz.id.conf
apache2ctl configtest          # WAJIB — pastikan "Syntax OK"
systemctl reload apache2
```

### 4. SSL dengan Let's Encrypt

```bash
# Certbot otomatis modifikasi vhost untuk HTTPS + redirect
certbot --apache -d ruangtemu.biz.id --redirect
```

Setelah selesai, certbot menambah blok `<VirtualHost *:443>` secara otomatis.

### 5. PM2

```bash
cd /var/www/ruangtemu.biz.id
pm2 start ecosystem.config.cjs
pm2 save                # simpan daftar app
pm2 startup             # aktifkan auto-start saat reboot
# Ikuti instruksi yang muncul
```

Periksa status:
```bash
pm2 list
pm2 logs ruangtemu-api --lines 50
pm2 logs web-ruangtemu --lines 50
```

### 6. Firewalld

```bash
# Cek port yang sedang listen
ss -ltnp

# Pastikan hanya port publik yang terbuka
firewall-cmd --list-ports
# Seharusnya hanya: 22/tcp 80/tcp 443/tcp
# JANGAN buka 3200 atau 3201
```

### 7. Cloudflare DNS

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `ruangtemu.biz.id` | `194.233.90.4` | Proxied (orange) |

SSL/TLS → Overview → Mode: **Full (strict)**

> Mode Full (strict) memerlukan sertifikat valid di server (Let's Encrypt). Jangan gunakan mode Flexible.

### 8. Update / Deploy Ulang

```bash
cd /var/www/ruangtemu.biz.id
git pull

# Backend (jika ada perubahan)
cd backend
npm install
npm run db:migrate:deploy
npm run build
pm2 restart ruangtemu-api

# Frontend (jika ada perubahan)
cd ../frontend
npm install
npm run build
pm2 restart web-ruangtemu
```

---

## 12. Troubleshooting

### Backend tidak bisa konek ke database

```bash
# Cek MariaDB berjalan
systemctl status mariadb

# Test koneksi manual
mysql -u ruangtemu -p ruangtemu

# Cek DATABASE_URL di .env
cat backend/.env | grep DATABASE_URL
```

### API 502 Bad Gateway

```bash
# Cek apakah backend PM2 sedang berjalan
pm2 list
pm2 logs ruangtemu-api --lines 30

# Cek port
ss -ltnp | grep 3200

# Cek Apache error log
tail -f /var/log/apache2/ruangtemu.biz.id-error.log
```

### Frontend tidak load (502 di /)

```bash
pm2 logs web-ruangtemu --lines 30
ss -ltnp | grep 3201
```

### Prisma migration error di production

```bash
cd backend
# Lihat status migrasi
npx prisma migrate status

# Jika ada migrasi yang "failed"
npx prisma migrate resolve --applied "nama_migrasi"
```

### Upload file gagal

```bash
# Pastikan folder ada dan bisa ditulis
ls -la backend/uploads/
# Jika perlu
chmod -R 755 backend/uploads/
chown -R www-data:www-data backend/uploads/
```

### Email tidak terkirim

Cek konfigurasi SMTP di `/admin/settings`. Untuk Gmail, pastikan:
1. Aktifkan 2-Factor Authentication
2. Buat **App Password** di Google Account → Security → App Passwords
3. Gunakan App Password (bukan password Gmail) di `SMTP_PASS`

### Menambahkan Provider WhatsApp Baru

Edit `backend/src/services/notificationService.ts` fungsi `sendWA()`:

```typescript
if (provider === "wablas") {
  await fetch("https://solo.wablas.com/api/send-message", {
    method: "POST",
    headers: { "Authorization": token, "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message }),
  });
}
```

---

*Dibuat dengan ❤️ untuk RuangTemu — platform social dining Indonesia.*
