#!/bin/bash
# ==========================================
# SCRIPT DEPLOY OTOMATIS - DIGITALOCEAN
# ==========================================
# Cara pakai: bash deploy.sh
# 
# Script ini akan:
# 1. Cek Docker terinstall
# 2. Build aplikasi jadi container
# 3. Jalan aplikasi
# 4. Setup auto-restart saat server reboot
# 5. Beri info akses

set -e

echo ""
echo "🚀 ======================================== 🚀"
echo "   DEPLOY WORKBOOK GENERATOR"
echo "🚀 ======================================== 🚀"
echo ""

# Cek Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker belum terinstall."
    echo ""
    echo "📝 Install Docker dulu dengan command:"
    echo ""
    echo "   curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "   sh get-docker.sh"
    echo ""
    echo "Setelah itu, jalankan lagi: bash deploy.sh"
    echo ""
    exit 1
fi

echo "✅ Docker terdeteksi: $(docker --version)"
echo ""

# Cek docker compose
COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose tidak ditemukan."
    echo "   Install Docker Compose plugin atau docker-compose."
    exit 1
fi

echo "✅ Docker Compose siap"
echo ""

# Build dan jalan aplikasi
echo "📦 Building aplikasi..."
echo "   (Proses pertama butuh 5-10 menit, sabar ya)"
echo ""

$COMPOSE_CMD up -d --build

echo ""
echo "⏳ Menunggu aplikasi siap..."

# Tunggu aplikasi siap (max 60 detik)
for i in $(seq 1 12); do
    if curl -s http://localhost:3000/api/auth/me > /dev/null 2>&1; then
        echo ""
        echo "🎉 ======================================== 🎉"
        echo "   BERHASIL! Aplikasi sudah jalan!"
        echo "🎉 ======================================== 🎉"
        echo ""
        
        # Dapatkan IP publik
        PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "IP_SERVER_ANDA")
        
        echo "📱 Akses sementara (tanpa domain):"
        echo "   http://$PUBLIC_IP:3000"
        echo ""
        echo "👤 Akun Master Admin:"
        echo "   Email:    admin@workbookgen.app"
        echo "   Password: admin123"
        echo ""
        echo "⚠️  WAJIB ganti password setelah login pertama!"
        echo ""
        echo "🔒 Untuk setup domain + HTTPS:"
        echo "   Baca PANDUAN_DIGITALOCEAN.md (Langkah 6-7)"
        echo ""
        echo "📝 Command berguna:"
        echo "   Cek status:  $COMPOSE_CMD ps"
        echo "   Cek log:     $COMPOSE_CMD logs -f"
        echo "   Restart:     $COMPOSE_CMD restart"
        echo "   Stop:        $COMPOSE_CMD down"
        echo ""
        
        # Setup auto-restart saat server reboot
        echo "⚙️  Setup auto-restart saat server reboot..."
        $COMPOSE_CMD enable 2>/dev/null || true
        systemctl enable docker 2>/dev/null || true
        
        echo "✅ Auto-restart sudah aktif"
        echo ""
        echo "🎉 Selesai! Aplikasi Anda sudah online!"
        echo ""
        exit 0
    fi
    echo "   Menunggu... ($i/12)"
    sleep 5
done

echo ""
echo "⚠️  Aplikasi masih startup. Cek status:"
echo ""
echo "   $COMPOSE_CMD ps"
echo "   $COMPOSE_CMD logs -f"
echo ""
echo "Kalau ada error, kirim log ke developer."
