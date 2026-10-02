# AGENTS.md - Context & Coding Guidelines

## 1. Project Overview
Aplikasi ini adalah **Middleware Listener Fingerprint** yang dibangun menggunakan **Express.js**, **MySQL**, dan **Bootstrap 5**.

### Core Responsibilities:
1. **Receiver Node:** Menerima HTTP Push Request dari berbagai mesin fingerprint (multi-device).
2. **Data Normalization:** Memvalidasi dan menormalisasi payload data absensi dari mesin.
3. **Data Forwarder:** Meneruskan (*dispatch*) data absensi secara real-time via Webhook (HTTP POST) ke berbagai aplikasi target (Laravel).
4. **Retry & Audit Trail:** Menyimpan log penerimaan dan status pengiriman. Menyiapkan mekanisme *retry* jika target Laravel sedang offline/gagal.
5. **Dashboard Management:** Menyediakan antarmuka (Bootstrap 5) dengan sistem autentikasi (login) untuk mengelola device, aplikasi Laravel target, mapping device-to-app, dan memantau log pengiriman.

---

## 2. Tech Stack & Environment
* **Runtime:** Node.js (Express.js)
* **Database:** MySQL (Gunakan `mysql2` dengan connection pool atau ORM ringan seperti Prisma/Sequelize/Knative query builder)
* **Authentication:** Express-Session / JWT untuk login dashboard
* **Frontend/View:** EJS / Handlebars + Bootstrap 5 (CDN/npm)
* **HTTP Client:** Axios atau `fetch` bawaan Node.js untuk forwarding webhook
* **Security:** Helmet, express-rate-limit, bcrypt untuk password hashing

---

## 3. Architecture & Data Flow
[Mesin Fingerprint 1..N]
│ (HTTP Push)
▼
[Express.js Receiver Endpoint]
│
├──> [1. Simpan Raw Log ke MySQL]
├──> [2. Cek Mapping Target App Laravel]
└──> [3. Forward HTTP POST ke Target Laravel]
│
├── [Sukses] ──> Update Log Status: SUCCESS
└── [Gagal]  ──> Update Log Status: FAILED (Queue for Retry)

## 4. Key Rules & Coding Standards

### Security & Authentication
* **Dashboard Routes:** Semua route dashboard (misal: `/admin/*`) wajib dilindungi oleh middleware authentication.
* **Fingerprint Endpoint:** Endpoint penerima push (misal: `/api/v1/push`) harus memvalidasi token/IP/serial number device yang sudah terdaftar di database.
* **Password Hashing:** Wajib menggunakan `bcrypt` dengan minimum 10 salt rounds.

### Error Handling & Resilience
* Selalu bungkus proses *forwarding* webhook dalam try-catch.
* Jangan sampai kegagalan pengiriman ke salah satu aplikasi Laravel menggagalkan proses penyimpanan log penerimaan lokal.
* Kembalikan response HTTP status code yang sesuai ke mesin fingerprint (misal: `200 OK` atau format plain text sesuai spesifikasi protokol vendor mesin).

### Code Style
* Gunakan modul ES6 (`import`/`export`) atau CommonJS (`require`) secara konsisten di seluruh project.
* Pisahkan struktur folder secara modular:
  * `/controllers` - Logic request/response
  * `/routes` - Definisi route Express
  * `/models` / `/services` - Interaksi database & forwarding webhook
  * `/views` - Template Bootstrap 5
  * `/middleware` - Auth check, logger, rate limiter
* Gunakan file `.env` untuk konfigurasi sensitif (DB Credentials, Session Secret, Port).

---

## 5. Primary Entities & Database Schema Reference

1. **`users`** (Admin dashboard): `id`, `username`, `password`, `created_at`
2. **`devices`** (Mesin absensi): `id`, `sn` (serial number), `name`, `ip_address`, `location`, `status`
3. **`apps`** (Aplikasi Laravel target): `id`, `app_name`, `webhook_url`, `secret_key`, `status`
4. **`device_app_mappings`**: `id`, `device_id`, `app_id`
5. **`attendance_logs`**: `id`, `device_sn`, `user_id_finger`, `timestamp`, `raw_payload`, `forward_status` (`PENDING`, `SUCCESS`, `FAILED`), `response_code`, `created_at`

---

## 6. Instructions for AI Assistant
* Saat membuatkan kode, prioritaskan struktur yang rapi, modular, dan mudah dipelihara.
* Pastikan UI dashboard menggunakan komponen Bootstrap 5 secara responsif dan bersih.
* Sertakan validasi input pada setiap form dashboard maupun API endpoint.
* Jangan hardcode kredensial atau URL target di dalam kode program.
