#!/bin/bash
# ==========================================
# SCRIPT DEPLOY OTOMATIS
# ==========================================
# Cara pakai: bash deploy.sh
# Script ini akan:
# 1. Cek dependencies (Docker)
# 2. Build aplikasi
# 3. Jalan aplikasi
# 4. Beri info akses

set -e

echo "🚀 Deploy Workbook Generator"
echo "=============================="
echo ""

# Cek Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker belum terinstall."
    echo ""
    echo "📝 Cara install Docker:"
    echo "   curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "   sudo sh get-docker.sh"
    echo ""
    exit 1
fi

# Cek Docker Compose
if ! command -v docker-compose &> /dev/null; then
    if ! docker compose version &> /dev/null; then
        echo "❌ Docker Compose belum terinstall."
        echo "   Docker Compose biasanya sudah termasuk dengan Docker."
        exit 1
    fi
fi

echo "✅ Docker terdeteksi"
echo ""

# Build dan jalan aplikasi
echo "📦 Building aplikasi (mungkin butuh 5-10 menit pertama kali)..."
docker compose up -d --build

echo ""
echo "⏳ Menunggu aplikasi siap..."
sleep 10

# Cek aplikasi jalan
if curl -s http://localhost:3000/api/auth/me > /dev/null 2>&1; then
    echo ""
    echo "🎉 BERHASIL! Aplikasi sudah jalan!"
    echo ""
    echo "════════════════════════════════════════════"
    echo "📱 Akses aplikasi:"
    echo "   http://$(curl -s ifconfig.me):3000"
    echo ""
    echo "👤 Akun Master Admin:"
    echo "   Email: admin@workbookgen.app"
    echo "   Password: admin123"
    echo "════════════════════════════════════════════"
    echo ""
    echo "🔒 UBAH PASSWORD SETELAH LOGIN PERTAMA!"
    echo ""
    echo "📖 Untuk setup domain + HTTPS, baca PANDUAN_DEPLOY.md"
    echo ""
else
    echo "⚠️  Aplikasi masih startup, tunggu 30 detik lalu coba:"
    echo "   curl http://localhost:3000/api/auth/me"
    echo ""
    echo "Untuk cek log:"
    echo "   docker compose logs -f"
fi
