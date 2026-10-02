# Product Requirement Document (PRD)
## Project Name: Fingerprint Push Receiver Service (Middleware)

---

## 1. Ringkasan & Tujuan Project (Overview & Objectives)
Aplikasi ini berfungsi sebagai **middleware / gateway penerima data (push listener)** dari berbagai mesin absensi fingerprint (*multi-device*). 

Sistem ini bersifat independen dan bertanggung jawab untuk:
1. Menerima data log absensi real-time yang dikirimkan (*push*) oleh mesin fingerprint.
2. Menyimpan log mentah ke dalam database MySQL lokal (sebagai buffer/backup).
3. Mengarahkan dan meneruskan (*forward/relay*) data absensi ke aplikasi tujuan yang sesuai (berbagai aplikasi Laravel / multi-tenant).
4. Menyediakan antarmuka web sederhana untuk manajemen mesin, pemetaan target Laravel, serta monitoring status pengiriman log.

---

## 2. Arsitektur & Tech Stack
* **Backend:** Express.js (Node.js)
* **Database:** MySQL
* **Frontend Dashboard:** Bootstrap 5 (EJS / Handlebars / HTML Templating)
* **Target Integration:** Laravel Application(s) via REST API / Webhook

---

## 3. Fitur Utama (Core Features)

### A. Device Listener & Data Ingestion (Penerima Push)
* **ADMS / Solution / ZKTeco Push Protocol Listener:** Endpoint HTTP/HTTPS khusus untuk menerima request bawaan dari mesin fingerprint.
* **Handshake / Heartbeat Handler:** Mengoperasikan *ping/pong* atau registrasi rutin dari mesin ke server.
* **Payload Normalizer:** Mengubah format data mentah dari mesin ke format standar JSON internal.

### B. Device & Tenant Management (Manajemen Mesin & App Laravel)
* **CRUD Device:** Pendaftaran serial number (SN) mesin, nama lokasi, dan status aktif/non-aktif.
* **CRUD Laravel Client Target:** Pendaftaran aplikasi Laravel tujuan (URL Webhook / Endpoint API + Secret Token / API Key).
* **Mapping/Routing:** Memetakan (link) Mesin A ke Aplikasi Laravel X, Mesin B ke Aplikasi Laravel Y, atau 1 Mesin ke banyak aplikasi Laravel.

### C. Data Relay & Retry Mechanism (Pengiriman ke Laravel)
* **Webhook Forwarder:** Mengirimkan payload JSON absensi secara asynchronous (HTTP POST) ke endpoint Laravel terkait.
* **Queue & Retry Logic:** Jika aplikasi Laravel target sedang *down* atau *timeout*, sistem akan melakukan *retry* otomatis secara berkala sampai sukses.

### D. Monitoring & Logs Dashboard (Bootstrap 5 UI)
* **Dashboard Overview:** Statisik jumlah hit hari ini, total mesin aktif, dan status pengiriman (Success vs Failed).
* **Attendance Logs Viewer:** Menampilkan tabel log absensi (User ID, Timestamp, Device SN, Status Forward).
* **Forwarding Error Logs:** Menampilkan daftar kegagalan pengiriman ke Laravel lengkap dengan response code/error message serta tombol *Manual Retry*.

---

## 4. Alur Pengguna & Sistem (System Workflow)

```
[Mesin Fingerprint 1] --(Push HTTP)--> [Express.js Receiver]
                                                |
                                    1. Save Raw to MySQL
                                                |
                                    2. Lookup Target Routing
                                                |
                                    3. Forward (HTTP POST)
                                                v
                                    [Aplikasi Laravel A]
```

1. **Mesin Fingerprint** melakukan scan absensi dan mengirimkan *HTTP POST* ke Express.js listener.
2. **Express.js Service**:
   * Memvalidasi Serial Number (SN) mesin.
   * Membalas response OK ke mesin (agar mesin tahu data sudah terkirim).
   * Menyimpan data log absensi ke database MySQL.
3. **Forwarder Worker**:
   * Mencari pemetaan URL target Laravel untuk SN mesin tersebut.
   * Mengirim data absensi via HTTP POST ke endpoint Laravel target.
   * Memperbarui status log di MySQL (`PENDING` -> `SUCCESS` atau `FAILED`).

---

## 5. Skema Database Utama (MySQL Schema Draft)

1. **`devices`**
   * `id`, `serial_number` (Unique), `name`, `location`, `status` (`ACTIVE`/`INACTIVE`), `created_at`
2. **`laravel_apps`**
   * `id`, `app_name`, `webhook_url`, `api_token`, `status`, `created_at`
3. **`device_app_mappings`**
   * `id`, `device_id`, `laravel_app_id`
4. **`attendance_logs`**
   * `id`, `device_sn`, `pin_user`, `timestamp`, `verify_mode`, `in_out_mode`, `raw_payload`, `created_at`
5. **`forward_logs`**
   * `id`, `attendance_log_id`, `laravel_app_id`, `status` (`PENDING`, `SUCCESS`, `FAILED`), `http_code`, `response_body`, `retry_count`, `updated_at`

---

## 6. Spesifikasi Keamanan & Performa
* **API Key Validation:** Menggunakan header token/secret key saat meneruskan data ke Laravel untuk memastikan integritas request.
* **Asynchronous Processing:** Proses membalas mesin absensi dilakukan secepat mungkin (dibedakan dengan proses pengiriman ke Laravel) agar mesin tidak *timeout*.
* **Rate Limiting & Sanitization:** Mengamankan endpoint listener dari potensi *flood request*.

---

## 7. Batasan Sistem (Out of Scope v1.0)
* Tidak melakukan sinkronisasi data nama/biometrik pegawai *kembali* ke mesin fingerprint (hanya 1 arah dari Mesin -> Middleware -> Laravel).
* Tidak mengolah kalkulasi keterlambatan/gaji (sepenuhnya menjadi tanggung jawab masing-masing aplikasi Laravel).