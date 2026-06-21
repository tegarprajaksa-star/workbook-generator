# 📖 PANDUAN DEPLOY — Versi Sangat Sederhana

> **Tujuan:** Pindahkan aplikasi Workbook Generator ke domain Anda sendiri.
> **Waktu yang dibutuhkan:** 30-60 menit
> **Biaya:** ~Rp 100.000-200.000/bulan (VPS) + Rp 150.000/tahun (domain)

---

## 🎯 Yang Akan Anda Dapatkan

Setelah selesai, aplikasi Anda akan online di:
- `https://namadomainanda.com` (dengan gembok HTTPS hijau)
- Bisa diakses siapa saja yang Anda kasih akun
- Data tersimpan aman di server Anda

---

## 📋 Yang Perlu Anda Beli (3 Hal)

### 1. Domain (Nama Website)
**Beli di:** Niagahoster, GoDaddy, atau Namecheap
**Harga:** ~Rp 150.000/tahun untuk .com
**Contoh:** `workbook-saya.com`

### 2. VPS (Server Virtual)
**Beli di:** DigitalOcean, Vultr, atau Hetzner
**Harga:** ~Rp 100.000-200.000/bulan
**Spesifikasi minimal:**
- 2 GB RAM
- 50 GB Storage
- Ubuntu 22.04 atau 24.04

### 3. Akun Cloudflare (GRATIS)
**Daftar di:** cloudflare.com
**Fungsi:** Mempercepat website + HTTPS gratis

---

## 🚀 LANGKAH-LANGKAH (Ikuti Urutannya)

### LANGKAH 1: Upload Code ke Server

Setelah beli VPS, Anda dapat IP address (contoh: `123.45.67.89`).

**Opsi A — Kalau Anda pakai Windows:**
1. Download WinSCP (gratis): https://winscp.net
2. Connect ke server dengan IP, username `root`, password VPS
3. Upload semua file project ke `/root/workbook/`

**Opsi B — Kalau Anda pakai Mac/Linux:**
```bash
# Di komputer Anda, jalankan:
scp -r /path/ke/project root@IP_SERVER:/root/workbook/
```

**Opsi C — Termudah, pakai Git:**
1. Buat akun GitHub (gratis)
2. Upload project ke GitHub (bisa pakai GitHub Desktop app)
3. Di VPS: `git clone https://github.com/username/repo-anda.git workbook`

---

### LANGKAH 2: Login ke Server

**Di komputer Anda, buka Terminal (Mac) atau PowerShell (Windows):**

```bash
ssh root@IP_SERVER_ANDA
```

Masukkan password VPS Anda.

---

### LANGKAH 3: Install Docker (Copy-Paste Command Ini)

Setelah login ke server, copy-paste command ini satu per satu:

```bash
# Update sistem
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Cek Docker berhasil
docker --version
```

Kalau muncul angka versi (contoh: `Docker version 24.0.7`), **berhasil!**

---

### LANGKAH 4: Masuk ke Folder Project

```bash
cd /root/workbook
```

(Ganti `workbook` dengan nama folder Anda upload di Langkah 1)

---

### LANGKAH 5: Jalankan Aplikasi (1 Command!)

```bash
bash deploy.sh
```

Tunggu 5-10 menit (proses build pertama kali agak lama).

Kalau berhasil, akan muncul:
```
🎉 BERHASIL! Aplikasi sudah jalan!
📱 Akses: http://IP_SERVER_ANDA:3000
👤 Email: admin@workbookgen.app
🔒 Password: admin123
```

**Coba akses di browser:** `http://IP_SERVER_ANDA:3000`

Kalau muncul halaman login, **BERHASIL!** 🎉

---

### LANGKAH 6: Hubungkan Domain

#### 6a. Setting DNS di Cloudflare

1. Login ke Cloudflare.com
2. Klik **"Add a Site"** → masukkan domain Anda
3. Pilih plan **FREE**
4. Cloudflare kasih 2 nameserver (contoh: `xxx.ns.cloudflare.com`)
5. Ganti nameserver domain Anda di tempat beli domain (Niagahoster/GoDaddy)
6. Tunggu 1-24 jam untuk aktif

#### 6b. Tambah Record DNS

Di dashboard Cloudflare → **DNS** → **Add Record**:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `IP_SERVER_ANDA` | 🟠 Proxied |
| A | `www` | `IP_SERVER_ANDA` | 🟠 Proxied |

---

### LANGKAH 7: Setup HTTPS (Gembok Hijau)

Cloudflare sudah include HTTPS gratis. Setting:

1. Cloudflare → **SSL/TLS** → **Overview**
2. Pilih **"Flexible"** (untuk pemula)
3. Tunggu 5 menit

Sekarang akses: `https://namadomainanda.com` — sudah ada gembok hijau! 🔒

---

### LANGKAH 8: Setting Cloudflare Tunnel (Opsional tapi Recommended)

Supaya tidak perlu buka port 3000, pakai Cloudflare Tunnel:

```bash
# Di server, install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
dpkg -i cloudflared.deb

# Login (akan muncul link browser)
cloudflared tunnel login

# Buat tunnel
cloudflared tunnel create workbook

# Hubungkan ke domain
cloudflared tunnel route dns workbook namadomainanda.com

# Jalan tunnel
cloudflared tunnel run workbook
```

Untuk jalan otomatis saat server restart:
```bash
cloudflared service install
```

---

## ✅ SELESAI!

Aplikasi Anda sekarang online di:
- **`https://namadomainanda.com`** (dengan HTTPS)
- Bisa diakses dari mana saja
- Data aman di server Anda

---

## 🔧 Setelah Deploy: Hal yang Harus Dilakukan

### 1. Login & Ubah Password Master Admin
- Email: `admin@workbookgen.app`
- Password: `admin123`
- **WAJIB ganti password setelah login pertama!**

### 2. Buat Akun Admin Lain
- Login sebagai Master Admin
- Buka Admin Panel → Tambah User
- Buat akun admin/user sesuai kebutuhan

### 3. Backup Berkala
```bash
# Backup database (jalankan di server)
cd /root/workbook
tar -czf backup-$(date +%Y%m%d).tar.gz db/

# Pindahkan backup ke komputer Anda
# (download via WinSCP/scp)
```

---

## 🆘 Masalah? Cek Ini

### Aplikasi tidak bisa diakses
```bash
# Cek aplikasi jalan atau tidak
docker compose ps

# Cek log error
docker compose logs -f
```

### Domain belum bisa diakses
- DNS butuh waktu 1-24 jam untuk propagate
- Cek di https://whatsmydns.net

### Port 3000 diblokir
- Gunakan Cloudflare Tunnel (LANGKAH 8)
- Atau setting Nginx reverse proxy (lihat bawah)

---

## 📞 Butuh Bantuan?

Kalau stuck, kirim screenshot error ke developer Anda dengan info:
1. Command apa yang dijalankan
2. Error message yang muncul
3. IP server (atau domain)

---

## 🔄 Update Aplikasi (Kalau Ada Versi Baru)

```bash
cd /root/workbook
git pull  # kalau pakai git
docker compose up -d --build
```

---

**Selamat! Aplikasi Workbook Generator Anda sudah online! 🎉**
