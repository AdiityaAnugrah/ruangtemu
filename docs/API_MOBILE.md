# RuangTemu Mobile API Documentation

Last updated: 2026-07-05

Dokumen ini dibuat sebagai panduan integrasi API RuangTemu untuk aplikasi mobile Android/iOS. API yang dijelaskan mengikuti route backend Express saat ini.

## 1. Base URL

Production:

```txt
https://api.ruangtemu.biz.id
```

Alternatif via web reverse proxy jika dipakai:

```txt
https://ruangtemu.biz.id/api
```

Local development:

```txt
http://localhost:3200
```

Semua path di bawah ditulis relatif dari `Base URL`.

Contoh:

```txt
POST https://api.ruangtemu.biz.id/auth/login
```

---

## 2. Format Umum

### Request JSON

```http
Content-Type: application/json
Accept: application/json
```

### Request Authenticated

```http
Authorization: Bearer <accessToken>
```

### Upload File

Gunakan `multipart/form-data`.

```http
Content-Type: multipart/form-data
Authorization: Bearer <accessToken>
```

### Response Error Standar

```json
{
  "message": "Pesan error"
}
```

### HTTP Status yang Umum

| Status | Arti |
|---|---|
| `200` | Berhasil |
| `201` | Berhasil membuat data |
| `400` | Request tidak valid / validasi gagal |
| `401` | Token tidak ada / token invalid / token expired |
| `403` | Tidak punya akses / akun suspended |
| `404` | Data tidak ditemukan |
| `409` | Konflik data, misalnya email sudah terdaftar |
| `429` | Rate limit |
| `500` | Error server |

---

## 3. Auth & Token Flow

Backend memakai JWT:

- `accessToken`: token pendek, default sekitar 15 menit.
- `refreshToken`: token panjang, default sekitar 7 hari.

Mobile app sebaiknya menyimpan token di secure storage:

- Android: EncryptedSharedPreferences / Keystore.
- iOS: Keychain.

### Flow Login Mobile

1. User login/register.
2. Simpan `accessToken`, `refreshToken`, dan data `user`.
3. Semua request private pakai header:

```http
Authorization: Bearer <accessToken>
```

4. Jika API membalas `401`, panggil `POST /auth/refresh` dengan `refreshToken`.
5. Simpan token baru.
6. Ulangi request yang gagal.
7. Jika refresh gagal, logout user dari app.

---

## 4. Enum Penting

### User Role

```txt
USER
ADMIN
```

### Gender

```txt
MALE
FEMALE
OTHER
```

Catatan: register/update profile saat ini menerima `MALE` dan `FEMALE`; data lama/backend matching bisa menampilkan `OTHER`.

### Dinner Status

```txt
OPEN
MATCHING
CONFIRMED
COMPLETED
CANCELLED
```

### Booking/Event Registration Status

```txt
PENDING_PAYMENT
PENDING_VERIFICATION
CONFIRMED
MATCHED
CANCELLED
REFUNDED
```

### Payment Status

```txt
PENDING
VERIFIED
REJECTED
```

---

## 5. Model Ringkas

### User

```ts
type User = {
  id: string;
  email: string;
  phone?: string | null;
  name: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  birthDate?: string | null;
  city?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  activity?: string | null;
  industry?: string | null;
  socialComfort?: number | null;
  personalityType?: "Introvert" | "Ekstrovert" | "Ambivert" | null;
  leisureTopics?: string[] | null;
  conversationTopics?: string[] | null;
  smokes?: boolean | null;
  drinksAlcohol?: boolean | null;
  dietaryNotes?: string | null;
  role: "USER" | "ADMIN";
  isVerified?: boolean;
  isSuspended?: boolean;
}
```

### City

```ts
type City = {
  id: string;
  name: string;
  areas: string; // JSON string array
  isActive: boolean;
}
```

### Dinner

```ts
type Dinner = {
  id: string;
  cityId: string;
  date: string;
  startTime: string;
  maxPerTable: number;
  status: "OPEN" | "MATCHING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  revealedAt?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  arrivalTime?: string | null;
  reservationName?: string | null;
  hostName?: string | null;
  hostPhone?: string | null;
  venueNotes?: string | null;
  city?: City;
  budgetTiers?: BudgetTier[];
}
```

### BudgetTier

```ts
type BudgetTier = {
  id: string;
  dinnerId: string;
  label: string;
  price: number;
}
```

### Booking

```ts
type Booking = {
  id: string;
  userId: string;
  dinnerId: string;
  budgetTierId: string;
  status: "PENDING_PAYMENT" | "PENDING_VERIFICATION" | "CONFIRMED" | "MATCHED" | "CANCELLED" | "REFUNDED";
  tableId?: string | null;
  dinner?: Dinner;
  budgetTier?: BudgetTier;
  payment?: Payment;
  table?: DinnerTable | null;
  createdAt: string;
}
```

### Payment

```ts
type Payment = {
  id: string;
  bookingId: string;
  amount: number;
  method: string;
  proofUrl?: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  verifiedById?: string | null;
  verifiedAt?: string | null;
  note?: string | null;
  expiredAt: string;
  createdAt: string;
}
```

### Event

```ts
type Event = {
  id: string;
  title: string;
  slug: string;
  description: string;
  posterUrl?: string | null;
  date: string;
  cityId?: string | null;
  price: number;
  capacity: number;
  status: string;
  createdAt: string;
}
```

### EventRegistration

```ts
type EventRegistration = {
  id: string;
  eventId: string;
  userId: string;
  status: "PENDING_PAYMENT" | "PENDING_VERIFICATION" | "CONFIRMED" | "MATCHED" | "CANCELLED" | "REFUNDED";
  payment?: {
    amount?: number;
    method?: string;
    status?: "PENDING" | "VERIFIED" | "REJECTED";
    expiredAt?: string;
    proofUrl?: string;
    uploadedAt?: string;
    verifiedById?: string;
    verifiedAt?: string;
    note?: string;
  } | null;
  event?: Event;
  createdAt: string;
}
```

---

# 6. Public Endpoints

Endpoint public tidak perlu token.

## 6.1 Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-07-05T06:15:25.408Z"
}
```

## 6.2 List Kota Aktif

```http
GET /cities
```

Response:

```json
[
  {
    "id": "city_id",
    "name": "Magelang",
    "areas": "[\"Magelang Utara\",\"Magelang Selatan\"]",
    "isActive": true
  }
]
```

## 6.3 Request Kota Baru

```http
POST /cities/request
```

Body:

```json
{
  "cityName": "Semarang",
  "email": "user@email.com"
}
```

Response:

```json
{
  "message": "Request kota tersimpan"
}
```

## 6.4 List Interest

```http
GET /interests
```

Response:

```json
[
  { "id": "interest_id", "name": "Musik" }
]
```

## 6.5 List Testimonial Published

```http
GET /testimonials
```

Response:

```json
[
  {
    "id": "testimonial_id",
    "name": "Ayu",
    "age": 24,
    "content": "Seru banget!",
    "isPublished": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

## 6.6 Public Payment Settings

```http
GET /admin/public-settings
```

Dipakai mobile untuk menampilkan QRIS/bank transfer/nomor WhatsApp payment.

Response contoh:

```json
{
  "qris_image_url": "/uploads/qris/qris-file.png",
  "payment_deadline_hours": "24",
  "payment_whatsapp_number": "628xxxx",
  "payment_bank_enabled": "true",
  "payment_bank_name": "BCA",
  "payment_bank_account_number": "1234567890",
  "payment_bank_account_name": "RuangTemu"
}
```

Untuk file upload yang return path relatif `/uploads/...`, gabungkan dengan API base URL:

```ts
const fullUrl = `${API_BASE_URL}${path}`;
```

## 6.7 Public Overview

```http
GET /admin/public-overview
```

Response berisi metrik landing/public overview.

## 6.8 List Event Public

```http
GET /events
```

Query optional:

| Query | Tipe | Keterangan |
|---|---|---|
| `cityId` | string | Filter event kota; event global `cityId = null` tetap ikut |

Response:

```json
[
  {
    "id": "event_id",
    "title": "Bertemu with strangers",
    "slug": "bertemu-with-strangers",
    "description": "...",
    "posterUrl": "/uploads/posters/file.jpg",
    "date": "2026-07-20T12:00:00.000Z",
    "cityId": null,
    "price": 55000,
    "capacity": 50,
    "status": "OPEN",
    "_count": { "registrations": 10 }
  }
]
```

## 6.9 Detail Event Public

```http
GET /events/:slug
```

Response: object `Event` + `_count.registrations`.

---

# 7. Auth Endpoints

## 7.1 Register

```http
POST /auth/register
```

Body:

```json
{
  "name": "Aditya",
  "email": "aditya@example.com",
  "password": "Password123",
  "phone": "+6281234567890",
  "gender": "MALE",
  "birthDate": "2000-06-12T00:00:00.000Z",
  "city": "Magelang",
  "interestIds": ["interest_id_1", "interest_id_2", "interest_id_3"],
  "activity": "Mahasiswa",
  "industry": "Teknologi",
  "socialComfort": 4,
  "personalityType": "Ambivert",
  "leisureTopics": ["Film", "Kopi"],
  "conversationTopics": ["Karier", "Traveling"],
  "smokes": false,
  "drinksAlcohol": false,
  "dietaryNotes": "Tidak pedas"
}
```

Validasi penting:

- `password` minimal 8 karakter, ada huruf kapital dan angka.
- `phone` optional, format internasional: `+6281234567890`.
- `gender`: `MALE` atau `FEMALE`.
- `birthDate`: ISO datetime.
- `interestIds`: minimal 3.
- `city` harus tersedia di sistem lokasi.

Response `201`:

```json
{
  "user": {
    "id": "user_id",
    "email": "aditya@example.com",
    "name": "Aditya",
    "role": "USER",
    "avatarUrl": null
  },
  "accessToken": "jwt_access",
  "refreshToken": "jwt_refresh"
}
```

## 7.2 Login

```http
POST /auth/login
```

Body:

```json
{
  "email": "aditya@example.com",
  "password": "Password123"
}
```

Response:

```json
{
  "user": {
    "id": "user_id",
    "email": "aditya@example.com",
    "name": "Aditya",
    "role": "USER",
    "avatarUrl": null
  },
  "accessToken": "jwt_access",
  "refreshToken": "jwt_refresh"
}
```

## 7.3 Refresh Token

```http
POST /auth/refresh
```

Body:

```json
{
  "refreshToken": "jwt_refresh"
}
```

Response:

```json
{
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

Catatan mobile:

- Refresh token lama akan diganti.
- Simpan kedua token baru.

## 7.4 Logout

```http
POST /auth/logout
Authorization: Bearer <accessToken>
```

Body:

```json
{
  "refreshToken": "jwt_refresh"
}
```

Response:

```json
{
  "message": "Logout berhasil"
}
```

## 7.5 Get Current User

```http
GET /auth/me
Authorization: Bearer <accessToken>
```

Response: object user login.

## 7.6 Google Auth Mobile

```http
POST /auth/google
```

Body:

```json
{
  "idToken": "google_id_token_from_mobile_sdk"
}
```

Response sama seperti login:

```json
{
  "user": {},
  "accessToken": "jwt_access",
  "refreshToken": "jwt_refresh"
}
```

Catatan: Google OAuth saat ini bergantung konfigurasi env Google di server.

## 7.7 Email Verification Legacy

Endpoint masih ada tetapi flow register aktif saat ini langsung verified.

```http
POST /auth/verify-email
POST /auth/resend-verification
```

---

# 8. User Profile Endpoints

Semua endpoint di bagian ini perlu token.

## 8.1 Update Profile

```http
PATCH /users/me
Authorization: Bearer <accessToken>
```

Body semua field optional:

```json
{
  "name": "Aditya Anugrah",
  "phone": "+6281234567890",
  "gender": "MALE",
  "birthDate": "2000-06-12T00:00:00.000Z",
  "city": "Magelang",
  "bio": "Suka ngobrol dan kuliner",
  "activity": "Founder",
  "industry": "Technology",
  "socialComfort": 4,
  "personalityType": "Ambivert",
  "leisureTopics": ["Kopi", "Film"],
  "conversationTopics": ["Bisnis", "Traveling"],
  "smokes": false,
  "drinksAlcohol": false,
  "dietaryNotes": "Tidak pedas",
  "interestIds": ["interest_id_1", "interest_id_2", "interest_id_3"]
}
```

Response: object user terbaru lengkap dengan `interests`.

## 8.2 My Bookings

```http
GET /users/me/bookings
Authorization: Bearer <accessToken>
```

Response:

```json
[
  {
    "id": "booking_id",
    "status": "PENDING_PAYMENT",
    "dinner": {},
    "budgetTier": {},
    "payment": {},
    "table": null,
    "createdAt": "2026-07-01T00:00:00.000Z"
  }
]
```

## 8.3 My Event Registrations

```http
GET /users/me/event-registrations
Authorization: Bearer <accessToken>
```

Response:

```json
[
  {
    "id": "registration_id",
    "status": "PENDING_PAYMENT",
    "payment": {},
    "event": {}
  }
]
```

---

# 9. Dinner & Booking Endpoints

## 9.1 List Dinner

```http
GET /dinners
Authorization: Bearer <accessToken>
```

Query optional:

| Query | Tipe | Keterangan |
|---|---|---|
| `cityId` | string | Filter kota |
| `status` | string | Filter status dinner |

Default status jika tidak dikirim:

```txt
OPEN, MATCHING, CONFIRMED
```

Response:

```json
[
  {
    "id": "dinner_id",
    "cityId": "city_id",
    "date": "2026-07-20T00:00:00.000Z",
    "startTime": "19:00",
    "status": "OPEN",
    "venueName": "Akan diumumkan H-1",
    "venueAddress": null,
    "city": { "id": "city_id", "name": "Magelang" },
    "budgetTiers": [
      { "id": "tier_id", "label": "Casual", "price": 175000 }
    ],
    "_count": { "bookings": 4 }
  }
]
```

Catatan: lokasi venue disembunyikan sampai dinner `CONFIRMED`/`COMPLETED`.

## 9.2 Detail Dinner

```http
GET /dinners/:id
Authorization: Bearer <accessToken>
```

Response: object `Dinner` + `city`, `budgetTiers`, `_count.bookings`.

## 9.3 Create Booking

```http
POST /bookings
Authorization: Bearer <accessToken>
```

Body:

```json
{
  "dinnerId": "dinner_id",
  "budgetTierId": "tier_id"
}
```

Validasi:

- Dinner harus `OPEN`.
- Budget tier harus milik dinner tersebut.
- User wajib punya profile lengkap: birth date, gender, city, minimal 3 minat.
- Jika user sudah booking dinner yang sama, API mengembalikan booking existing.

Response `201`:

```json
{
  "id": "booking_id",
  "status": "PENDING_PAYMENT",
  "dinner": {},
  "budgetTier": {},
  "payment": {
    "id": "payment_id",
    "amount": 175000,
    "method": "QRIS",
    "status": "PENDING",
    "expiredAt": "2026-07-06T10:00:00.000Z"
  }
}
```

## 9.4 Detail Booking

```http
GET /bookings/:id
Authorization: Bearer <accessToken>
```

User hanya bisa melihat booking sendiri. Admin bisa melihat semua.

Response: object `Booking` + dinner, tier, payment, table.

Jika lokasi belum reveal, field venue disamarkan.

## 9.5 Upload Bukti Pembayaran Booking

```http
POST /bookings/:id/upload-proof
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

Form field:

| Field | Tipe | Wajib |
|---|---|---|
| `proof` | file image | Ya |

Response:

```json
{
  "message": "Bukti pembayaran berhasil diupload",
  "proofUrl": "/uploads/payments/filename.jpg"
}
```

Setelah upload:

- booking status menjadi `PENDING_VERIFICATION`.
- payment status tetap `PENDING` sampai admin verify.

## 9.6 Cancel Booking

```http
DELETE /bookings/:id
Authorization: Bearer <accessToken>
```

Response:

```json
{
  "message": "Booking dibatalkan"
}
```

---

# 10. Event Registration Endpoints

## 10.1 Register Event

```http
POST /events/:id/register
Authorization: Bearer <accessToken>
```

Response `201`:

```json
{
  "id": "registration_id",
  "eventId": "event_id",
  "userId": "user_id",
  "status": "PENDING_PAYMENT",
  "payment": {
    "amount": 55000,
    "method": "QRIS",
    "status": "PENDING",
    "expiredAt": "2026-07-06T10:00:00.000Z"
  },
  "event": {}
}
```

Jika event gratis (`price <= 0`), status langsung `CONFIRMED` dan payment `VERIFIED`.

## 10.2 Detail Event Registration

```http
GET /events/registrations/:id
Authorization: Bearer <accessToken>
```

Response: object `EventRegistration` + `event`.

## 10.3 Upload Bukti Pembayaran Event

```http
POST /events/registrations/:id/upload-proof
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

Form field:

| Field | Tipe | Wajib |
|---|---|---|
| `proof` | file image | Ya |

Response:

```json
{
  "message": "Bukti pembayaran berhasil diupload",
  "proofUrl": "/uploads/payments/filename.jpg"
}
```

---

# 11. Notification Endpoints

## 11.1 List Notifications

```http
GET /notifications
Authorization: Bearer <accessToken>
```

Response:

```json
[
  {
    "id": "notification_id",
    "channel": "IN_APP",
    "type": "PAYMENT_CONFIRMED",
    "payload": {},
    "sentAt": "2026-07-01T00:00:00.000Z",
    "isRead": false,
    "createdAt": "2026-07-01T00:00:00.000Z"
  }
]
```

## 11.2 Mark Notification Read

```http
PATCH /notifications/:id/read
Authorization: Bearer <accessToken>
```

Response: notification updated.

## 11.3 Mark All Notifications Read

```http
PATCH /notifications/read-all/all
Authorization: Bearer <accessToken>
```

Response:

```json
{
  "message": "Semua notifikasi dibaca"
}
```

---

# 12. Admin API

Endpoint admin tidak wajib dipakai mobile user app, tetapi berguna jika nanti dibuat mobile admin app. Semua perlu token role `ADMIN`.

## 12.1 Admin Overview

```http
GET /admin/overview
Authorization: Bearer <adminAccessToken>
```

Response:

```json
{
  "totalUsers": 100,
  "totalBookings": 50,
  "confirmedBookings": 30,
  "pendingPayments": 3,
  "upcomingDinners": 2,
  "totalEventRegistrations": 20,
  "activeEvents": 1,
  "revenue": 5000000
}
```

## 12.2 Admin Settings

```http
GET /admin/settings
PATCH /admin/settings
POST /admin/settings/qris
```

Upload QRIS:

```http
POST /admin/settings/qris
Content-Type: multipart/form-data
```

Form field:

| Field | Tipe |
|---|---|
| `qris` | file image |

## 12.3 Admin User Management

```http
GET /users
GET /users/:id
PATCH /users/:id/role
PATCH /users/:id/suspend
```

Change role body:

```json
{ "role": "ADMIN" }
```

Suspend body:

```json
{ "isSuspended": true }
```

## 12.4 Admin City Management

```http
GET /cities/all
POST /cities
PUT /cities/:id
DELETE /cities/:id
GET /cities/requests/all
```

Create/update city body:

```json
{
  "name": "Magelang",
  "areas": ["Magelang Utara", "Magelang Selatan"],
  "isActive": true
}
```

## 12.5 Admin Dinner Management

```http
GET /dinners/all
POST /dinners
PUT /dinners/:id
PATCH /dinners/:id/status
PATCH /dinners/:id/reveal
DELETE /dinners/:id
```

Create dinner body:

```json
{
  "cityId": "city_id",
  "date": "2026-07-20T00:00:00.000Z",
  "startTime": "19:00",
  "maxPerTable": 6,
  "venueName": "Nama venue optional",
  "venueAddress": "Alamat optional",
  "arrivalTime": "18:45",
  "reservationName": "RuangTemu",
  "hostName": "Aditya",
  "hostPhone": "+6281234567890",
  "venueNotes": "Datang tepat waktu",
  "budgetTiers": [
    { "label": "Casual", "price": 175000 },
    { "label": "Premium", "price": 275000 }
  ]
}
```

Update status body:

```json
{ "status": "MATCHING" }
```

Reveal body:

```json
{
  "venueName": "Cafe Contoh",
  "venueAddress": "Jl. Contoh No. 1",
  "arrivalTime": "18:45",
  "reservationName": "RuangTemu",
  "hostName": "Aditya",
  "hostPhone": "+6281234567890",
  "venueNotes": "Tunjukkan nama reservasi ke kasir",
  "tables": [
    { "id": "table_id", "venueTableLabel": "Meja A1" }
  ]
}
```

## 12.6 Admin Payment Management

```http
GET /payments
GET /payments/pending
PATCH /payments/:id/verify
PATCH /payments/:id/reject
```

Query optional:

```txt
GET /payments?status=PENDING
```

Reject body:

```json
{
  "note": "Bukti tidak jelas"
}
```

Catatan:

- Untuk booking, `:id` adalah `Payment.id`.
- Untuk event registration, `:id` adalah `EventRegistration.id` karena payment event tersimpan sebagai JSON.
- Response list payment mengandung field `type`: `BOOKING` atau `EVENT`.
- Field `isActionable` menandai item pending yang masih bisa diverifikasi/ditolak.

## 12.7 Admin Booking Management

```http
GET /bookings
POST /bookings/manual-confirmed
PATCH /bookings/:id/reschedule
```

Manual confirmed body:

```json
{
  "userId": "user_id",
  "dinnerId": "dinner_id",
  "budgetTierId": "tier_id",
  "method": "BANK_TRANSFER",
  "note": "Sudah bayar offline"
}
```

Reschedule body:

```json
{
  "dinnerId": "target_dinner_id",
  "budgetTierId": "target_tier_id"
}
```

## 12.8 Admin Event Management

```http
GET /events/all
POST /events
PUT /events/:id
POST /events/:id/poster
DELETE /events/:id
GET /events/:id/registrations
POST /events/manual-confirmed
PATCH /events/registrations/:id/reschedule
```

Create/update event body:

```json
{
  "title": "Bertemu with strangers",
  "slug": "bertemu-with-strangers",
  "description": "Deskripsi event",
  "date": "2026-07-20T12:00:00.000Z",
  "cityId": null,
  "price": 55000,
  "capacity": 50,
  "status": "OPEN"
}
```

Upload poster:

```http
POST /events/:id/poster
Content-Type: multipart/form-data
```

Form field:

| Field | Tipe |
|---|---|
| `poster` | file image |

Manual confirmed event body:

```json
{
  "userId": "user_id",
  "eventId": "event_id",
  "method": "BANK_TRANSFER",
  "note": "Sudah bayar offline"
}
```

Reschedule event body:

```json
{
  "eventId": "target_event_id"
}
```

## 12.9 Admin Matching

```http
GET /matching/:dinnerId/preview
POST /matching/:dinnerId/commit
GET /matching/:dinnerId/tables
GET /matching/:dinnerId/manual
POST /matching/:dinnerId/manual/setup
POST /matching/:dinnerId/manual/tables
PATCH /matching/bookings/:bookingId/table
```

Preview response:

```json
{
  "tables": [
    {
      "tableScore": 8.5,
      "participants": [
        {
          "bookingId": "booking_id",
          "userId": "user_id",
          "name": "Ayu",
          "age": 24,
          "gender": "FEMALE",
          "location": "Magelang",
          "interests": ["Musik", "Kopi"],
          "matchProfile": {}
        }
      ]
    }
  ],
  "unassigned": 0
}
```

Manual board response:

```json
{
  "dinner": {},
  "tables": [
    {
      "id": "table_id",
      "name": "Meja 1",
      "venueTableLabel": null,
      "participants": []
    }
  ],
  "unassigned": []
}
```

Setup manual body optional:

```json
{
  "tableCount": 3
}
```

Move participant body:

```json
{
  "tableId": "table_id"
}
```

Unassign participant body:

```json
{
  "tableId": null
}
```

## 12.10 Admin Interest/Testimonial

```http
POST /interests
DELETE /interests/:id
POST /testimonials
PATCH /testimonials/:id
DELETE /testimonials/:id
```

Create interest body:

```json
{ "name": "Musik" }
```

Create/update testimonial body:

```json
{
  "name": "Ayu",
  "age": 24,
  "content": "Seru banget!",
  "isPublished": true
}
```

---

# 13. Mobile Implementation Notes

## 13.1 API Client Pseudocode

```ts
const API_BASE_URL = "https://api.ruangtemu.biz.id";

async function apiRequest(path, options = {}) {
  const accessToken = await secureStorage.get("accessToken");

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      const newAccessToken = await secureStorage.get("accessToken");
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          Accept: "application/json",
          ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
          Authorization: `Bearer ${newAccessToken}`,
          ...options.headers,
        },
      });
    }
  }

  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.message || "Request gagal");
  return json;
}
```

## 13.2 Refresh Token Pseudocode

```ts
async function refreshToken() {
  const refreshToken = await secureStorage.get("refreshToken");
  if (!refreshToken) return false;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    await secureStorage.remove("accessToken");
    await secureStorage.remove("refreshToken");
    return false;
  }

  const data = await response.json();
  await secureStorage.set("accessToken", data.accessToken);
  await secureStorage.set("refreshToken", data.refreshToken);
  return true;
}
```

## 13.3 Upload Bukti Pembayaran Mobile

React Native style:

```ts
const form = new FormData();
form.append("proof", {
  uri: imageUri,
  name: "proof.jpg",
  type: "image/jpeg",
});

await fetch(`${API_BASE_URL}/bookings/${bookingId}/upload-proof`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  body: form,
});
```

Untuk event:

```txt
POST /events/registrations/:id/upload-proof
```

## 13.4 Asset URL

Jika API mengembalikan:

```json
{ "proofUrl": "/uploads/payments/file.jpg" }
```

Mobile harus menampilkan:

```ts
const imageUrl = `${API_BASE_URL}${proofUrl}`;
```

## 13.5 Payment Flow Mobile

### Dinner

1. `GET /dinners`
2. User pilih dinner dan tier.
3. `POST /bookings`
4. `GET /admin/public-settings` untuk QRIS/bank.
5. Tampilkan instruksi pembayaran.
6. Upload bukti: `POST /bookings/:id/upload-proof`.
7. Poll/refresh `GET /bookings/:id` atau `GET /users/me/bookings`.
8. Jika `payment.status = VERIFIED`, tampilkan booking confirmed.
9. Jika `booking.status = MATCHED`, tampilkan table info.
10. Jika dinner sudah reveal, tampilkan lokasi.

### Event

1. `GET /events`
2. `GET /events/:slug`
3. `POST /events/:id/register`
4. Tampilkan payment instruction.
5. Upload bukti: `POST /events/registrations/:id/upload-proof`.
6. Poll `GET /events/registrations/:id` atau `GET /users/me/event-registrations`.

## 13.6 Reschedule Flow Mobile

Saat ini user tidak melakukan reschedule langsung dari API mobile. User diarahkan menghubungi WhatsApp. Admin yang menjalankan reschedule melalui admin endpoint.

## 13.7 Push Notification Future

Backend saat ini punya `Notification` in-app, email, dan WA. Untuk push notification mobile di masa depan, disarankan tambah model baru:

```txt
DeviceToken
- id
- userId
- provider: FCM/APNS
- token
- platform: android/ios
- createdAt
- updatedAt
```

Endpoint future yang disarankan:

```http
POST /devices
DELETE /devices/:token
```

Body:

```json
{
  "token": "fcm_or_apns_token",
  "platform": "android"
}
```

---

# 14. Checklist Integrasi Mobile

## Minimal User App

- [ ] Register/login/logout.
- [ ] Secure token storage.
- [ ] Auto refresh token saat 401.
- [ ] Ambil kota dan interest onboarding.
- [ ] Update profile.
- [ ] List dinner.
- [ ] Detail dinner.
- [ ] Create booking.
- [ ] Ambil payment settings.
- [ ] Upload bukti pembayaran.
- [ ] Riwayat booking.
- [ ] Detail booking/table/lokasi reveal.
- [ ] List event.
- [ ] Register event.
- [ ] Upload bukti event.
- [ ] List notification.

## Optional Admin Mobile App

- [ ] Admin overview.
- [ ] Payment verification.
- [ ] Dinner CRUD.
- [ ] Event CRUD.
- [ ] Matching auto/manual.
- [ ] Reveal lokasi.

---

# 15. Catatan Keamanan Mobile

- Jangan simpan token di plain AsyncStorage tanpa encryption.
- Jangan hardcode admin token.
- Jangan hardcode credential production.
- Semua request production wajib HTTPS.
- Untuk upload, batasi tipe file ke image dan ukuran file sesuai setting backend `MAX_FILE_SIZE_MB`.
- Jika mendapat `403 Akun disuspend`, paksa logout dan tampilkan pesan kontak admin.
