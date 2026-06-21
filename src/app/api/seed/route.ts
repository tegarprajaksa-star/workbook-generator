import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Seed: creates demo user + a sample workbook (Kinikawa barista) as example output
export async function POST() {
  try {
    const existing = await db.user.count()
    if (existing > 0) {
      return NextResponse.json({ ok: true, seeded: false, message: 'Sudah ter-seed' })
    }

    // Create MASTER_ADMIN account (owner of the platform)
    const user = await db.user.create({
      data: {
        email: 'admin@workbookgen.app',
        name: 'Master Admin',
        passwordHash: hashPassword('admin123'),
        role: 'MASTER_ADMIN',
        isApproved: true,
      },
    })

    // Sample workbook: Kinikawa Barista (as example of generator output)
    const wb = await db.workbook.create({
      data: {
        userId: user.id,
        title: 'Buku Kerja Karyawan Barista',
        companyName: 'Kinikawa Coffee',
        companyTagline: 'Employee Workbook',
        positionTitle: 'Barista',
        department: 'Outlet Operations / Coffee Bar',
        reportsTo: 'Supervisor Outlet / Shift Leader',
        subordinates: 'Tidak ada, kecuali ditugaskan sebagai senior barista',
        purpose:
          'Menjalankan layanan minuman dan area coffee bar secara cepat, bersih, konsisten, ramah, dan sesuai standar resep agar pelanggan menerima produk yang tepat, aman, dan memuaskan.',
        authority:
          'Menolak penggunaan bahan, cup, susu, syrup, topping, atau es yang tidak layak pakai.\nMeminta stok tambahan kepada supervisor/inventory ketika stok minimum mendekati batas aman.\nMelakukan remake minuman sesuai kebijakan outlet ketika terjadi kesalahan produksi yang terbukti.\nMenghentikan sementara penggunaan alat jika berisiko rusak, tidak aman, atau mengganggu kualitas produk.\nMelakukan eskalasi kepada supervisor untuk komplain berat, stok kritis, selisih kas, atau kerusakan alat.',
        responsibilities:
          'Memastikan seluruh minuman dibuat sesuai resep, gramasi, urutan kerja, dan standar penyajian.\nMenjaga kebersihan mesin, grinder, steam wand, sink, meja bar, area penyajian, dan peralatan.\nMenjaga akurasi order, nama pelanggan, varian minuman, level gula, suhu minuman, dan catatan khusus.\nMencatat pemakaian bahan, waste, komplain, remake, dan laporan closing sesuai form yang berlaku.\nMenjalankan pelayanan dengan sikap sopan, responsif, tidak defensif, dan menjaga nama baik outlet.',
        dutiesPrimary:
          'Membuka area bar, menerima order, membuat minuman, menyajikan produk, menangani komplain awal, menjaga stok operasional, membersihkan area kerja, dan menutup shift.',
        dutiesDaily:
          'Opening checklist, kalibrasi rasa, order handling, produksi minuman, refill bahan, pencatatan waste, cleaning berkala, closing report, dan handover shift.',
        dutiesWeekly:
          'Deep cleaning area bar, pengecekan alat, rekap waste mingguan, review minuman yang sering remake, review stok slow/fast moving, dan usulan perbaikan layanan.',
        dutiesMonthly:
          'Evaluasi performa KRA, review kualitas layanan, review komplain pelanggan, audit stok, evaluasi SOP/WI, dan penyegaran standar resep.',
        krasJson: JSON.stringify([
          { name: 'Akurasi Order', formula: 'Order benar ÷ total order × 100%', target: '≥ 98%', unit: '%' },
          { name: 'Konsistensi Kualitas Minuman', formula: 'Minuman lolos QC/sampling ÷ total sampel × 100%', target: '≥ 95%', unit: '%' },
          { name: 'Kecepatan Layanan', formula: 'Rata-rata waktu dari order masuk sampai minuman siap', target: '≤ standar outlet', unit: 'menit' },
          { name: 'Remake Rate', formula: 'Jumlah minuman remake ÷ total minuman × 100%', target: '≤ 2%', unit: '%' },
          { name: 'Waste Rate', formula: 'Nilai bahan terbuang ÷ nilai pemakaian bahan × 100%', target: '≤ batas outlet', unit: '%' },
          { name: 'Kebersihan Area Bar', formula: 'Skor checklist kebersihan harian', target: '≥ 95', unit: 'skor' },
          { name: 'Kepatuhan Closing Report', formula: 'Closing report tepat waktu ÷ total shift × 100%', target: '100%', unit: '%' },
          { name: 'Penyelesaian Komplain Awal', formula: 'Komplain selesai di level barista ÷ total komplain × 100%', target: '≥ 80%', unit: '%' },
          { name: 'Akurasi Stok Harian', formula: 'Selisih stok fisik vs catatan', target: '≤ toleransi outlet', unit: 'selisih' },
          { name: 'Kepatuhan SOP/WI', formula: 'Temuan audit SOP yang lolos ÷ total item audit × 100%', target: '≥ 95%', unit: '%' },
        ]),
        status: 'PUBLISHED',
        accentColor: '#b45309',
      },
    })

    // Add 2 sample processes
    await db.workbookProcess.create({
      data: {
        workbookId: wb.id,
        code: 'P01',
        name: 'Opening Outlet & Station Readiness',
        description: 'Persiapan outlet, mesin, station, stok, dan kalibrasi rasa sebelum layanan dimulai.',
        inputText: 'Jadwal shift, opening checklist, standar resep, stok awal.',
        outputText: 'Outlet, mesin, station, stok, dan rasa awal siap untuk melayani pelanggan.',
        totalSla: '± 38 menit',
        category: 'Operations',
        lanesJson: JSON.stringify(['Barista', 'Supervisor / Shift Leader', 'Inventory / Storage']),
        stepsJson: JSON.stringify([
          { type: 'START', lane: 0, label: 'Absensi & grooming', sla: '3 mnt', order: 1 },
          { type: 'TASK', lane: 0, label: 'Cek area bar & alat', sla: '5 mnt', order: 2 },
          { type: 'GATEWAY', lane: 0, label: 'Area siap?', sla: '1 mnt', order: 3, branchLabel: '', yesTargetOrder: 4, noTargetOrder: 9 },
          { type: 'TASK', lane: 0, label: 'Nyalakan mesin & grinder', sla: '10 mnt', order: 4, branchLabel: 'YA' },
          { type: 'TASK', lane: 0, label: 'Cek stok minimum', sla: '5 mnt', order: 5 },
          { type: 'GATEWAY', lane: 0, label: 'Stok cukup?', sla: '1 mnt', order: 6, yesTargetOrder: 7, noTargetOrder: 10 },
          { type: 'TASK', lane: 0, label: 'Kalibrasi & tes rasa', sla: '10 mnt', order: 7 },
          { type: 'GATEWAY', lane: 0, label: 'Rasa standar?', sla: '1 mnt', order: 8, yesTargetOrder: 11, noTargetOrder: 12 },
          { type: 'CORRECTION', lane: 1, label: 'Bersihkan & rapikan ulang', sla: '10 mnt', order: 9, branchLabel: 'TIDAK' },
          { type: 'CORRECTION', lane: 2, label: 'Ambil refill / ajukan stok', sla: '15 mnt', order: 10, branchLabel: 'TIDAK' },
          { type: 'TASK', lane: 1, label: 'Outlet ready untuk layanan', sla: '2 mnt', order: 11, branchLabel: 'YA' },
          { type: 'CORRECTION', lane: 0, label: 'Adjust grind, dose, atau resep', sla: '10 mnt', order: 12, branchLabel: 'TIDAK' },
          { type: 'END', lane: 1, label: 'END', sla: '', order: 13 },
        ]),
        sopsJson: JSON.stringify([
          { instruction: 'Lakukan absensi dan pengecekan grooming.', workInstruction: 'Masuk sesuai jadwal, gunakan seragam bersih, rambut/kuku rapi, cuci tangan, dan pastikan tidak memakai aksesori yang mengganggu hygiene kerja.', output: 'Absensi & grooming OK' },
          { instruction: 'Periksa kebersihan area bar sebelum mesin digunakan.', workInstruction: 'Cek meja bar, sink, lantai, tempat sampah, portafilter, steam wand, grinder hopper, dan area pickup. Bersihkan sisa bubuk kopi, susu, tumpahan, atau sampah dari shift sebelumnya.', output: 'Opening Checklist terisi' },
          { instruction: 'Nyalakan dan panaskan peralatan utama.', workInstruction: 'Hidupkan mesin espresso sesuai urutan aman, pasang portafilter, flush group head, nyalakan grinder, cek pressure/temperature indikator, dan tunggu mesin stabil sebelum digunakan.', output: 'Mesin siap pakai' },
          { instruction: 'Cek stok operasional harian.', workInstruction: 'Hitung cup, lid, straw, napkin, beans, milk, syrup, powder, topping, es, dan bahan best seller. Bila stok di bawah par level, ambil refill atau ajukan ke supervisor.', output: 'Stok minimum terpenuhi' },
          { instruction: 'Lakukan kalibrasi awal rasa.', workInstruction: 'Buat espresso test shot atau menu standar yang ditentukan. Periksa aroma, body, crema, rasa, extraction time, dan kesesuaian resep. Jika tidak sesuai, atur grind size/dose lalu tes ulang.', output: 'Rasa awal standar' },
          { instruction: 'Minta validasi outlet ready.', workInstruction: 'Beritahu supervisor/shift leader bahwa area bar, stok, alat, dan rasa sudah siap. Jangan mulai layanan sebelum area kerja aman dan minuman test dinyatakan layak.', output: 'Outlet ready' },
        ]),
        formsJson: JSON.stringify([
          { label: 'Absensi & grooming', standard: 'Hadir tepat waktu, seragam rapi, tangan bersih' },
          { label: 'Area bar', standard: 'Meja, sink, lantai, pickup area bersih' },
          { label: 'Mesin espresso & grinder', standard: 'Menyala normal, pressure/temperature aman' },
          { label: 'Stok kritis', standard: 'Beans, milk, cup, lid, es, syrup, powder cukup' },
          { label: 'Kalibrasi rasa', standard: 'Test shot/menu standar sesuai recipe card' },
        ]),
        order: 1,
      },
    })

    await db.workbookProcess.create({
      data: {
        workbookId: wb.id,
        code: 'P02',
        name: 'Order Taking & Payment',
        description: 'Penerimaan pesanan dari pelanggan hingga order valid masuk antrean produksi.',
        inputText: 'Pelanggan datang / chat order, menu, POS, metode pembayaran.',
        outputText: 'Order valid masuk antrean produksi dan pelanggan menerima bukti bayar.',
        totalSla: '± 7,5 menit',
        category: 'Service',
        lanesJson: JSON.stringify(['Customer', 'Barista / Cashier', 'POS / Payment']),
        stepsJson: JSON.stringify([
          { type: 'START', lane: 0, label: 'Pelanggan datang', sla: '', order: 1 },
          { type: 'TASK', lane: 1, label: 'Sapa & arahkan ke menu', sla: '30 dtk', order: 2 },
          { type: 'TASK', lane: 0, label: 'Pelanggan pilih pesanan', sla: '3 mnt', order: 3 },
          { type: 'TASK', lane: 1, label: 'Input order di POS', sla: '1 mnt', order: 4 },
          { type: 'GATEWAY', lane: 1, label: 'Order jelas?', sla: '30 dtk', order: 5, yesTargetOrder: 6, noTargetOrder: 9 },
          { type: 'TASK', lane: 1, label: 'Konfirmasi total bayar', sla: '30 dtk', order: 6, branchLabel: 'YA' },
          { type: 'GATEWAY', lane: 2, label: 'Payment sukses?', sla: '1 mnt', order: 7, yesTargetOrder: 8, noTargetOrder: 10 },
          { type: 'TASK', lane: 2, label: 'Cetak/kirim order ticket', sla: '30 dtk', order: 8, branchLabel: 'YA' },
          { type: 'CORRECTION', lane: 1, label: 'Klarifikasi varian, size, sugar, ice', sla: '2 mnt', order: 9, branchLabel: 'TIDAK' },
          { type: 'CORRECTION', lane: 2, label: 'Ulang pembayaran / ubah metode', sla: '3 mnt', order: 10, branchLabel: 'TIDAK' },
          { type: 'TASK', lane: 1, label: 'Order masuk antrean', sla: '30 dtk', order: 11 },
          { type: 'END', lane: 1, label: 'END', sla: '', order: 12 },
        ]),
        sopsJson: JSON.stringify([
          { instruction: 'Sapa pelanggan dan arahkan ke menu.', workInstruction: 'Gunakan sapaan ramah, beri waktu pelanggan melihat menu, tawarkan menu best seller atau promo tanpa memaksa, dan pastikan pelanggan mengetahui pilihan hot/ice, size, topping, sugar, dan opsi susu.', output: 'Pelanggan siap memesan' },
          { instruction: 'Dengarkan dan ulangi pesanan pelanggan.', workInstruction: 'Catat nama pelanggan, menu, jumlah, varian, size, level sugar/ice, extra shot, topping, catatan alergi, atau request khusus. Ulangi order dengan suara jelas sebelum input.', output: 'Order terkonfirmasi' },
          { instruction: 'Input pesanan ke POS.', workInstruction: 'Masukkan item sesuai menu, cek harga, promo, diskon, pajak/service bila ada, lalu pastikan tidak ada item ganda atau varian yang salah.', output: 'Order masuk POS' },
          { instruction: 'Validasi kejelasan pesanan.', workInstruction: 'Jika ada informasi belum lengkap, hentikan proses pembayaran dan klarifikasi kembali. Jangan menebak pesanan pelanggan.', output: 'Order jelas' },
          { instruction: 'Proses pembayaran.', workInstruction: 'Sebutkan total bayar, pilih metode tunai/non-tunai, pastikan QR/EDC/sistem berhasil, dan berikan bukti transaksi bila diperlukan.', output: 'Pembayaran valid' },
          { instruction: 'Kirim order ticket ke bar.', workInstruction: 'Pastikan ticket tercetak/terkirim, urutan antrean terbaca, dan nama pelanggan jelas agar produksi tidak tertukar.', output: 'Order siap diproduksi' },
        ]),
        formsJson: JSON.stringify([
          { label: 'Tanggal' }, { label: 'Jam' }, { label: 'No Order' },
          { label: 'Menu' }, { label: 'Masalah' }, { label: 'Tindakan' },
          { label: 'PIC' }, { label: 'Status' },
        ]),
        order: 2,
      },
    })

    return NextResponse.json({
      ok: true,
      seeded: true,
      credentials: { email: 'admin@workbookgen.app', password: 'admin123', role: 'MASTER_ADMIN' },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Seed gagal: ' + (error as Error).message }, { status: 500 })
  }
}
