# 🌊 PANDUAN DEPLOY KE DIGITALOCEAN
## Versi Sangat Sederhana — Ikuti Urutannya

> **Waktu:** 30-45 menit
> **Biaya:** ~Rp 150.000/bulan (VPS) + Rp 150.000/tahun (domain)
> **Hasil:** Aplikasi online di `https://domainanda.com`

---

## 📋 PERSIAPAN (Beli 3 Hal Ini Dulu)

### 1️⃣ Beli Domain
**Pilih salah satu:**
- Niagahoster: https://niagahoster.co.id
- GoDaddy: https://godaddy.com
- Namecheap: https://namecheap.com

**Harga:** ~Rp 150.000/tahun untuk `.com`
**Contoh domain:** `workbook-bisnis.com`

### 2️⃣ Buat Akun DigitalOcean
**Daftar di:** https://digitalocean.com
**Butuh:** Email + kartu kredit/debit (untuk verifikasi, bisa dihapus setelahnya)
**Deposit minimal:** $10 (~Rp 160.000)

### 3️⃣ Buat Akun Cloudflare (GRATIS)
**Daftar di:** https://cloudflare.com
**Fungsi:** HTTPS gratis + website cepat

---

## 🚀 LANGKAH 1: Buat Server (Droplet) di DigitalOcean

### 1.1 Login ke DigitalOcean
1. Buka https://cloud.digitalocean.com
2. Login dengan akun Anda

### 1.2 Klik "Create Droplet"
1. Di pojok kanan atas, klik tombol hijau **"Create"**
2. Pilih **"Droplets"**

### 1.3 Pilih Region
**Pilih:** Singapore (terdekat dengan Indonesia, paling cepat)
- Klik region **Singapore** (SGP1)

### 1.4 Pilih Image (Sistem Operasi)
- Pilih **Ubuntu** → version **24.04 (LTS) x64**

### 1.5 Pilih Size (Spesifikasi)
- Klik tab **"Basic"** → **"Regular"**
- Pilih yang **$6/month**:
  - 1 GB RAM
  - 1 CPU
  - 25 GB SSD
  - 1000 GB transfer

> 💡 Kalau aplikasi lambat, upgrade ke **$12/month** (2 GB RAM) nanti.

### 1.6 Pilih Authentication Method
**Termudah: Password**
1. Pilih **"Password"** (bukan SSH key)
2. Buat password yang KUAT (catat di tempat aman!):
   - Contoh: `W0rkbook!2025#Secure`
   - Minimal 8 karakter, campuran huruf besar/kecil/angka/simbol

### 1.7 Finalisasi
1. **Hostname:** ketik `workbook`
2. Klik tombol hijau **"Create Droplet"** di bawah

⏳ Tunggu 1-2 menit sampai status jadi hijau "Active".

### 1.8 Catat IP Server
Setelah droplet jadi, akan muncul IP address (contoh: `139.59.123.456`).
**CATAT IP INI!** — ini alamat server Anda.

---

## 🚀 LANGKAH 2: Akses Server

### 2.1 Buka Terminal/Command Prompt

**Windows:**
1. Tekan `Windows + R`
2. Ketik `powershell` → Enter

**Mac:**
1. Buka app **Terminal** (di Applications > Utilities)

### 2.2 Login ke Server
Ketik command ini (ganti IP dengan IP server Anda):

```
ssh root@IP_SERVER_ANDA
```

**Contoh:**
```
ssh root@139.59.123.456
```

### 2.3 Konfirmasi
- Kalau muncul `"Are you sure you want to continue connecting?"` → ketik `yes` → Enter
- Masukkan password yang Anda buat di Langkah 1.6
- (Saat ketik password, tidak muncul karakter — itu normal)

✅ Kalau prompt berubah jadi `root@workbook:~#`, **berhasil login!**

---

## 🚀 LANGKAH 3: Upload Project ke Server

### Cara Termudah: Pakai Git (Recommended)

#### 3.1 Upload Project ke GitHub (di komputer Anda)

1. Buat akun GitHub: https://github.com (gratis)
2. Klik **"New repository"**
3. Nama: `workbook-generator`
4. Pilih **"Private"** (supaya aman)
5. Klik **"Create repository"**
6. Download GitHub Desktop: https://desktop.github.com
7. Add folder project Anda ke GitHub Desktop
8. Commit + Push ke GitHub

#### 3.2 Clone ke Server (di server)

Di server (sudah login ssh), jalankan:

```bash
# Install git
apt update && apt install -y git

# Clone project (ganti URL dengan URL repo Anda)
git clone https://github.com/USERNAME/workbook-generator.git workbook

# Masuk ke folder
cd workbook
```

> 💡 Kalau repo private, akan diminta username + password GitHub.
> Untuk password, gunakan **Personal Access Token** (bukan password login):
> 1. GitHub → Settings → Developer settings → Personal access tokens
> 2. Generate new token (classic) → centang "repo"
> 3. Copy token, gunakan sebagai password

---

## 🚀 LANGKAH 4: Install Docker

Copy-paste command ini satu per satu di server:

```bash
# Update sistem
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Cek Docker berhasil terinstall
docker --version
```

✅ Kalau muncul `Docker version 24.x.x`, **berhasil!**

---

## 🚀 LANGKAH 5: Jalankan Aplikasi (1 Command!)

Masih di folder `workbook`:

```bash
bash deploy.sh
```

⏳ Tunggu 5-10 menit (proses pertama agak lama, download + build).

Kalau berhasil, muncul:
```
🎉 BERHASIL! Aplikasi sudah jalan!
📱 Akses: http://139.59.123.456:3000
👤 Email: admin@workbookgen.app
🔒 Password: admin123
```

### Test Akses
Buka browser di komputer Anda, akses:
```
http://IP_SERVER_ANDA:3000
```

**Contoh:** `http://139.59.123.456:3000`

✅ Kalau muncul halaman login Workbook Generator, **BERHASIL!** 🎉

---

## 🚀 LANGKAH 6: Setup Domain di Cloudflare

### 6.1 Tambah Domain ke Cloudflare

1. Login ke https://cloudflare.com
2. Klik **"Add a Site"**
3. Masukkan domain Anda (contoh: `workbook-bisnis.com`)
4. Klik **"Continue"**
5. Pilih plan **"Free"** → klik **"Continue"**

### 6.2 Ganti Nameserver

Cloudflare akan kasih 2 nameserver, contoh:
```
ns1: xxx.ns.cloudflare.com
ns2: yyy.ns.cloudflare.com
```

**Ganti nameserver di tempat beli domain:**
- Login ke Niagahoster/GoDaddy/Namecheap
- Cari pengaturan **"Nameserver"** atau **"DNS"**
- Ganti nameserver default dengan nameserver Cloudflare
- Simpan

⏳ Tunggu 1-24 jam untuk propagasi DNS (biasanya 15-30 menit).

### 6.3 Tambah DNS Record

Di Cloudflare → domain Anda → **"DNS"** → **"Records"**:

Klik **"Add record"**:

**Record 1:**
| Field | Value |
|-------|-------|
| Type | `A` |
| Name | `@` |
| IPv4 address | `IP_SERVER_ANDA` (contoh: 139.59.123.456) |
| Proxy status | 🟠 **Proxied** (oranye) |
| TTL | Auto |

Klik **"Save"**

**Record 2:**
| Field | Value |
|-------|-------|
| Type | `A` |
| Name | `www` |
| IPv4 address | `IP_SERVER_ANDA` |
| Proxy status | 🟠 **Proxied** |
| TTL | Auto |

Klik **"Save"**

---

## 🚀 LANGKAH 7: Setup HTTPS (Gembok Hijau)

### 7.1 Setting SSL di Cloudflare

1. Cloudflare → domain Anda → **"SSL/TLS"**
2. Tab **"Overview"**
3. Pilih **"Flexible"** (untuk pemula)

### 7.2 Pakai Cloudflare Tunnel (Supaya Tidak Perlu Buka Port 3000)

Di server, jalankan:

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
dpkg -i cloudflared.deb

# Login (akan muncul URL, buka di browser)
cloudflared tunnel login

# Buat tunnel
cloudflared tunnel create workbook

# Hubungkan tunnel ke domain
cloudflared tunnel route dns workbook domainanda.com

# Jalan tunnel
cloudflared tunnel run workbook
```

Saat muncul link `https://dash.cloudflare.com/argotunnel?...`, buka di browser, pilih domain Anda, authorize.

### 7.3 Jalan Tunnel Otomatis Saat Server Restart

```bash
# Buat config file
mkdir -p /etc/cloudflared
cat > /etc/cloudflared/config.yml << 'EOF'
tunnel: workbook
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: domainanda.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# Install sebagai service
cloudflared service install
systemctl start cloudflared
systemctl enable cloudflared
```

Ganti `<TUNNEL_ID>` dengan ID yang muncul saat `cloudflared tunnel create`.

---

## 🚀 LANGKAH 8: Test Hasil Akhir

Buka browser, akses:
```
https://domainanda.com
```

✅ Kalau muncul halaman login dengan gembok hijau (HTTPS), **SELESAI!** 🎉

### Login dengan:
- **Email:** `admin@workbookgen.app`
- **Password:** `admin123`

⚠️ **WAJIB ganti password setelah login pertama!**

---

## 🔄 Cara Update Aplikasi (Kalau Ada Versi Baru)

```bash
# Login ke server
ssh root@IP_SERVER_ANDA

# Masuk folder
cd workbook

# Download code terbaru (kalau pakai Git)
git pull

# Rebuild + restart
docker compose up -d --build

# Cek status
docker compose ps
```

---

## 💾 Cara Backup Data

```bash
# Di server, jalankan:
cd /root/workbook
tar -czf backup-$(date +%Y%m%d).tar.gz db/

# Download backup ke komputer (jalankan di komputer, bukan server):
scp root@IP_SERVER_ANDA:/root/workbook/backup-*.tar.gz ./
```

---

## 🆘 Troubleshooting

### Masalah: Tidak bisa akses `http://IP:3000`

**Cek aplikasi jalan:**
```bash
docker compose ps
```

Kalau status "Exit", cek log:
```bash
docker compose logs -f
```

### Masalah: Domain belum bisa diakses

1. Cek DNS propagate: https://whatsmydns.net
2. Masukkan domain, cek apakah IP sudah benar
3. Tunggu maksimal 24 jam

### Masalah: HTTPS belum muncul gembok

1. Cloudflare → SSL/TLS → pastikan "Flexible"
2. Tunggu 5-10 menit
3. Clear browser cache, coba lagi

### Masalah: Aplikasi lambat

1. Upgrade droplet di DigitalOcean:
   - DigitalOcean → Droplets → Resize
   - Pilih 2 GB RAM ($12/month)
2. Restart: `docker compose restart`

---

## 📞 Cek Status Server

Command berguna di server:

```bash
# Cek aplikasi jalan
docker compose ps

# Cek log aplikasi
docker compose logs -f

# Restart aplikasi
docker compose restart

# Stop aplikasi
docker compose down

# Cek pemakaian resource
docker stats

# Cek disk space
df -h
```

---

## ✅ Checklist Final

Sebelum anggap selesai, pastikan:

- [ ] Droplet DigitalOcean jalan (status Active)
- [ ] Bisa SSH ke server
- [ ] Docker terinstall (`docker --version` jalan)
- [ ] `bash deploy.sh` berhasil
- [ ] `http://IP:3000` bisa diakses
- [ ] Domain sudah di-add ke Cloudflare
- [ ] Nameserver sudah diganti
- [ ] DNS record A sudah ditambah
- [ ] Cloudflare Tunnel sudah setup
- [ ] `https://domainanda.com` bisa diakses dengan gembok hijau
- [ ] Bisa login dengan admin@workbookgen.app
- [ ] Password sudah diganti

Kalau semua checklist ✅, **SELAMAT! Aplikasi Anda sudah online!** 🎉

---

## 💡 Tips Hemat

1. **Matikan droplet** kalau tidak dipakai sementara:
   - DigitalOcean → Droplets → Power Off
   - Tapi tetap dikenakan biaya storage
   
2. **Snapshot sebelum hapus:**
   - Kalau mau stop berbulan-bulan, buat snapshot dulu
   - Snapshot lebih murah dari droplet aktif
   - Bisa restore kapan saja

3. **Monitoring gratis:**
   - DigitalOcean punya built-in monitoring
   - Setup alert email kalau CPU/RAM tinggi

---

**Selamat mencoba! Kalau ada masalah, baca bagian Troubleshooting dulu.** 🌟
