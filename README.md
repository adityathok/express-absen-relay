# Fingerprint Push Receiver Service (Middleware)

Middleware penerima **push data absensi** dari banyak mesin fingerprint (ZKTeco / iClock / ADMS),
penyimpan log mentah ke MySQL, dan **relay webhook** ke berbagai aplikasi Laravel dengan mekanisme
*retry* otomatis. Dilengkapi dashboard Bootstrap 5 untuk manajemen device, aplikasi target, mapping,
serta monitoring log.

## Fitur

- **Device Listener** — endpoint `/iclock/*` sesuai protokol push ZKTeco (handshake, ATTLOG, getrequest, devicecmd).
- **Validasi Device** — hanya serial number (SN) yang terdaftar & berstatus `ACTIVE` yang diterima.
- **Normalisasi Payload** — data tab-separated dari mesin diubah menjadi JSON internal.
- **Async Forwarding** — mesin dibalas `200 OK` secepat mungkin; pengiriman ke Laravel berjalan terpisah.
- **Retry Otomatis** — pengiriman gagal diulang berkala (exponential backoff) + tombol *Manual Retry*.
- **Audit Trail** — `attendance_logs` (log mentah) dan `forward_logs` (status per aplikasi target).
- **Dashboard Bootstrap 5** — overview statistik, CRUD device/app/mapping, viewer log, login bcrypt.
- **Keamanan** — Helmet, rate limiting, express-session, bcrypt (10 rounds), HMAC-SHA256 signature ke Laravel.

## Tech Stack

Node.js (Express 5) · MySQL (`mysql2` pool) · EJS + Bootstrap 5 · Socket.IO (feed realtime) ·
express-session, connect-flash, helmet, express-rate-limit, node-cron, bcryptjs.

## Struktur Folder

```
config/       Konfigurasi env & connection pool MySQL
controllers/  Logic request/response
database/     schema.sql
middleware/   Auth, validasi, rate limiter, logger, error handler
models/       Query MySQL per entitas
routes/       Definisi route (auth, admin, iclock)
scripts/      setup.js, reset-password.js
services/     iclock (parser), forward (webhook), retry (cron), realtime
views/        Template EJS + Bootstrap 5
public/       Aset statis (CSS/JS)
```

## Persyaratan

- Node.js 18+ (dites pada Node 24)
- MySQL 5.7+ / MariaDB 10.3+

## Instalasi

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
# sesuaikan kredensial DB dan SESSION_SECRET di .env
npm run setup             # membuat database, schema, dan user admin awal
npm start                 # atau: npm run dev (auto-reload)
```

Dashboard berjalan di `http://localhost:3331`. Login awal mengikuti `ADMIN_USERNAME` / `ADMIN_PASSWORD`
(default `admin` / `admin123`) — **segera ganti**. Bisa langsung dari dashboard melalui menu akun di
pojok kiri bawah → **Edit Profil** (ubah username/password), atau lewat CLI:

```bash
npm run reset-password -- admin PASSWORD_BARU
```

## Konfigurasi Mesin Fingerprint

Arahkan *cloud server* / *ADMS* pada mesin ke host middleware:

| Setting | Nilai |
| --- | --- |
| Server Address | IP/host middleware |
| Server Port | `3331` (sesuai `PORT`) |
| Endpoint path | `/iclock/cdata` |

Registry SN mesin lebih dulu di menu **Mesin** (SN harus sama persis dengan yang dikirim mesin).

## Endpoint Listener

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/iclock/cdata?SN=<sn>` | Handshake / heartbeat |
| POST | `/iclock/cdata?SN=<sn>&table=ATTLOG` | Push data absensi |
| GET | `/iclock/getrequest` | Poll command (v1: tidak ada command) |
| POST | `/iclock/devicecmd` | Ack command |
| POST | `/iclock/ping` | Cek konektivitas ringan |

SN tidak terdaftar / non-aktif dibalas `403` (`ERROR: DEVICE_NOT_REGISTERED` / `ERROR: DEVICE_INACTIVE`).

## Webhook ke Laravel

Setiap absensi diteruskan sebagai `HTTP POST` JSON ke `webhook_url` aplikasi target:

```json
{
  "event": "attendance.created",
  "device": { "sn": "SN-001", "name": "Lobby", "location": "Gedung A" },
  "attendance": {
    "id": 12,
    "user_id": "1001",
    "timestamp": "2026-01-02 08:15:30",
    "verify_mode": "1",
    "in_out_mode": "0"
  },
  "received_at": "2026-01-02 08:15:31"
}
```

Header yang dikirim:

- `X-Relay-Secret` — secret key aplikasi target
- `X-Relay-Signature` — `sha256=<HMAC_SHA256(secret, rawBody)>`
- `X-Relay-Event`, `User-Agent`

Verifikasi di Laravel:

```php
$signature = 'sha256=' . hash_hmac('sha256', $request->getContent(), $secret);

abort_unless(hash_equals($signature, $request->header('X-Relay-Signature')), 401);
```

## Retry

- Pengiriman gagal dicatat sebagai `FAILED` beserta `http_code` dan `response_body`.
- Scheduler (default tiap menit) mengulang sampai `RELAY_MAX_RETRY` kali dengan backoff eksponensial.
- Bisa juga diulang manual dari **Log Pengiriman** atau halaman detail log absensi.
- Status agregat log absensi: `SUCCESS`, `PARTIAL` (sebagian target sukses), `FAILED`, `PENDING`.

## Konfigurasi `.env`

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `3331` | Port HTTP server |
| `SESSION_SECRET` | — | Wajib diganti di produksi |
| `DB_*` | root@127.0.0.1 | Kredensial MySQL |
| `ADMIN_*` | admin/admin123 | Seed admin awal |
| `RELAY_TIMEOUT_MS` | `10000` | Timeout webhook |
| `RELAY_MAX_RETRY` | `5` | Maksimal percobaan ulang |
| `RELAY_RETRY_INTERVAL_SECONDS` | `60` | Basis backoff |
| `RELAY_RETRY_CRON` | `* * * * *` | Jadwal scheduler retry |

## Out of Scope (v1)

Hanya alur satu arah **Mesin → Middleware → Laravel**. Tidak ada sinkronisasi data pegawai kembali ke
mesin dan tidak ada kalkulasi keterlambatan/gaji (tanggung jawab aplikasi Laravel).
