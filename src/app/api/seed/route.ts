import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// Seed endpoint — populates the database with Kinikawa Coffee data
// from the Buku Kerja Barista workbook.
export async function POST() {
  try {
    // Check if already seeded
    const existingUsers = await db.user.count()
    if (existingUsers > 0) {
      return NextResponse.json({
        ok: true,
        message: 'Database sudah ter-seed sebelumnya',
        seeded: false,
      })
    }

    // ============================================================
    // 1. DEPARTMENTS
    // ============================================================
    const outletOps = await db.department.create({
      data: { name: 'Outlet Operations', description: 'Operasional outlet & coffee bar' },
    })
    const management = await db.department.create({
      data: { name: 'Management', description: 'Manajemen outlet & kebijakan' },
    })
    const inventory = await db.department.create({
      data: { name: 'Inventory & Storage', description: 'Stok, gudang, dan pembelian' },
    })

    // ============================================================
    // 2. POSITIONS (with hierarchy)
    // ============================================================
    const owner = await db.position.create({
      data: {
        title: 'Owner / Operations Manager',
        departmentId: management.id,
        purpose: 'Memastikan seluruh operasional outlet berjalan sesuai standar dan target bisnis tercapai.',
        authority: 'Menetapkan kebijakan outlet\nMenyetujui kompensasi pelanggan di luar standar\nMengangkat & memberhentikan karyawan\nMenyetujui pengadaan besar',
        responsibilities: 'Menjaga kualitas layanan keseluruhan\nMenyetujui SOP dan perubahan resep\nMenangani eskalasi berat\nReview performa KRA bulanan',
        dutiesPrimary: 'Pengawasan operasional, pengambilan keputusan strategis, approval kebijakan',
        dutiesDaily: 'Review laporan closing, cek KPI harian',
        dutiesWeekly: 'Review komplain & waste mingguan, rapat tim',
        dutiesMonthly: 'Evaluasi KRA, audit SOP, review stok slow/fast moving',
        color: '#b45309',
      },
    })

    const supervisor = await db.position.create({
      data: {
        title: 'Supervisor / Shift Leader',
        departmentId: outletOps.id,
        reportsToId: owner.id,
        purpose: 'Mengawasi shift operasional, memastikan standar layanan terpenuhi, dan menangani eskalasi.',
        authority: 'Menyetujui remake di luar kewenangan barista\nMengesahkan closing report\nMemutuskan recovery komplain\nMenyetujui refill stok mendesak',
        responsibilities: 'Mengawasi barista & cashier selama shift\nMemvalidasi outlet ready\nApprove closing & handover\nMenangani komplain yang dieskalasi\nVerifikasi waste',
        dutiesPrimary: 'Supervisi shift, validasi standar, eskalasi handling, approval laporan',
        dutiesDaily: 'Opening/closing validation, cek antrean, approve remake, review handover',
        dutiesWeekly: 'Deep cleaning supervision, rekap waste, review minuman sering remake',
        dutiesMonthly: 'Evaluasi performa tim, audit stok, penyegaran standar resep',
        color: '#d97706',
      },
    })

    const barista = await db.position.create({
      data: {
        title: 'Barista',
        departmentId: outletOps.id,
        reportsToId: supervisor.id,
        purpose: 'Menjalankan layanan minuman dan area coffee bar secara cepat, bersih, konsisten, ramah, dan sesuai standar resep agar pelanggan menerima produk yang tepat, aman, dan memuaskan.',
        authority: 'Menolak penggunaan bahan/cup/susu/syrup/topping/es yang tidak layak pakai\nMeminta stok tambahan ketika stok minimum mendekati batas aman\nMelakukan remake minuman sesuai kebijakan outlet\nMenghentikan sementara penggunaan alat jika berisiko rusak/tidak aman',
        responsibilities: 'Memastikan minuman dibuat sesuai resep, gramasi, urutan kerja, dan standar penyajian\nMenjaga kebersihan mesin, grinder, steam wand, sink, meja bar\nMenjaga akurasi order, nama pelanggan, varian, level gula\nMencatat pemakaian bahan, waste, komplain, remake\nMelakukan eskalasi kepada supervisor untuk komplain berat/stok kritis',
        dutiesPrimary: 'Membuka area bar, menerima order, membuat minuman, menyajikan produk, menangani komplain awal, menjaga stok, membersihkan area, menutup shift',
        dutiesDaily: 'Opening checklist, kalibrasi rasa, order handling, produksi minuman, refill bahan, pencatatan waste, cleaning berkala, closing report, handover shift',
        dutiesWeekly: 'Deep cleaning area bar, pengecekan alat, rekap waste mingguan, review minuman sering remake, review stok slow/fast moving',
        dutiesMonthly: 'Evaluasi performa KRA, review kualitas layanan, review komplain, audit stok, evaluasi SOP/WI, penyegaran standar resep',
        color: '#f59e0b',
      },
    })

    const cashier = await db.position.create({
      data: {
        title: 'Cashier',
        departmentId: outletOps.id,
        reportsToId: supervisor.id,
        purpose: 'Menangani transaksi pembayaran, ketepatan order, dan settlement kas dengan akurat.',
        authority: 'Menolak transaksi jika pembayaran tidak valid\nMelakukan void/refund sesuai kebijakan\nMenghentikan penerimaan order setelah last call',
        responsibilities: 'Input order ke POS dengan akurat\nMemproses pembayaran tunai/non-tunai\nMencocokkan kas & settlement\nMengelola antrean pelanggan',
        dutiesPrimary: 'Penerimaan order, pembayaran, cetak ticket, settlement kas',
        dutiesDaily: 'Opening POS, transaksi harian, closing kas, handover',
        dutiesWeekly: 'Rekap transaksi, review void/refund',
        dutiesMonthly: 'Audit kas, review akurasi order',
        color: '#ea580c',
      },
    })

    const inventoryStaff = await db.position.create({
      data: {
        title: 'Inventory Staff',
        departmentId: inventory.id,
        reportsToId: supervisor.id,
        purpose: 'Mengelola stok bahan, melakukan refill, dan memastikan ketersediaan bahan operasional.',
        authority: 'Mengajukan pembelian stok\nMenolak bahan yang tidak layak saat receiving\nMengatur penyimpanan FIFO/FEFO',
        responsibilities: 'Mencatat stok masuk/keluar\nMelakukan refill sesuai request\nMengelola gudang penyimpanan\nVerifikasi waste',
        dutiesPrimary: 'Pengelolaan stok, refill, pencatatan waste, audit inventory',
        dutiesDaily: 'Cek stok kritis, proses refill, catat pemakaian',
        dutiesWeekly: 'Stok opname, review slow/fast moving',
        dutiesMonthly: 'Audit stok, evaluasi par level',
        color: '#92400e',
      },
    })

    // ============================================================
    // 3. EMPLOYEES
    // ============================================================
    const empTegar = await db.employee.create({
      data: { name: 'Tegar Prajaksa', email: 'owner@kinikawa.test', phone: '081200000001', positionId: owner.id, status: 'ACTIVE' },
    })
    const empSari = await db.employee.create({
      data: { name: 'Sari Wulandari', email: 'supervisor@kinikawa.test', phone: '081200000002', positionId: supervisor.id, status: 'ACTIVE' },
    })
    const empBudi = await db.employee.create({
      data: { name: 'Budi Santoso', email: 'barista@kinikawa.test', phone: '081200000003', positionId: barista.id, status: 'ACTIVE' },
    })
    const empMaya = await db.employee.create({
      data: { name: 'Maya Putri', email: 'cashier@kinikawa.test', phone: '081200000004', positionId: cashier.id, status: 'ACTIVE' },
    })
    const empDoni = await db.employee.create({
      data: { name: 'Doni Kurniawan', email: 'inventory@kinikawa.test', phone: '081200000005', positionId: inventoryStaff.id, status: 'ACTIVE' },
    })
    const empRina = await db.employee.create({
      data: { name: 'Rina Maharani', email: 'barista2@kinikawa.test', phone: '081200000006', positionId: barista.id, status: 'ACTIVE' },
    })

    // ============================================================
    // 4. USERS (login accounts)
    // ============================================================
    await db.user.create({
      data: { email: 'owner@kinikawa.test', name: 'Tegar Prajaksa', passwordHash: hashPassword('kinikawa123'), role: 'ADMIN', employeeId: empTegar.id },
    })
    await db.user.create({
      data: { email: 'supervisor@kinikawa.test', name: 'Sari Wulandari', passwordHash: hashPassword('kinikawa123'), role: 'MANAGER', employeeId: empSari.id },
    })
    await db.user.create({
      data: { email: 'barista@kinikawa.test', name: 'Budi Santoso', passwordHash: hashPassword('kinikawa123'), role: 'STAFF', employeeId: empBudi.id },
    })

    // ============================================================
    // 5. KRAs for Barista
    // ============================================================
    const baristaKras = [
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
    ]
    for (let i = 0; i < baristaKras.length; i++) {
      await db.kra.create({ data: { ...baristaKras[i], positionId: barista.id, order: i + 1 } })
    }

    // KRAs for Supervisor
    const supKras = [
      { name: 'Outlet Readiness Compliance', formula: 'Hari outlet ready tepat waktu ÷ total hari × 100%', target: '≥ 95%', unit: '%' },
      { name: 'Komplain Teresolusi', formula: 'Komplain selesai ÷ total komplain × 100%', target: '≥ 90%', unit: '%' },
      { name: 'Akurasi Settlement Kas', formula: 'Shift kas cocok ÷ total shift × 100%', target: '≥ 98%', unit: '%' },
      { name: 'Timeliness Closing Approval', formula: 'Approval closing tepat waktu ÷ total closing × 100%', target: '100%', unit: '%' },
    ]
    for (let i = 0; i < supKras.length; i++) {
      await db.kra.create({ data: { ...supKras[i], positionId: supervisor.id, order: i + 1 } })
    }

    // KRAs for Cashier
    const cashierKras = [
      { name: 'Akurasi Input Order', formula: 'Order benar ÷ total order × 100%', target: '≥ 99%', unit: '%' },
      { name: 'Akurasi Settlement', formula: 'Selisih kas ≤ toleransi', target: '0 selisih', unit: 'selisih' },
      { name: 'Kecepatan Transaksi', formula: 'Rata-rata waktu per transaksi', target: '≤ 90 dtk', unit: 'detik' },
    ]
    for (let i = 0; i < cashierKras.length; i++) {
      await db.kra.create({ data: { ...cashierKras[i], positionId: cashier.id, order: i + 1 } })
    }

    // ============================================================
    // 6. BUSINESS PROCESSES (P01 - P06)
    // ============================================================
    const processes = [
      {
        code: 'P01', name: 'Opening Outlet & Station Readiness',
        description: 'Persiapan outlet, mesin, station, stok, dan kalibrasi rasa sebelum layanan dimulai.',
        inputText: 'Jadwal shift, opening checklist, standar resep, stok awal.',
        outputText: 'Outlet, mesin, station, stok, dan rasa awal siap untuk melayani pelanggan.',
        totalSla: '± 38 menit', category: 'Operations',
        lanes: ['Barista', 'Supervisor / Shift Leader', 'Inventory / Storage'],
        steps: [
          { type: 'START', lane: 0, label: 'Absensi & grooming', sla: '3 mnt', order: 1 },
          { type: 'TASK', lane: 0, label: 'Cek area bar & alat', sla: '5 mnt', order: 2 },
          { type: 'GATEWAY', lane: 0, label: 'Area siap?', sla: '1 mnt', order: 3, yesTargetOrder: 4, noTargetOrder: 9 },
          { type: 'TASK', lane: 0, label: 'Nyalakan mesin & grinder', sla: '10 mnt', order: 4 },
          { type: 'TASK', lane: 0, label: 'Cek stok minimum', sla: '5 mnt', order: 5 },
          { type: 'GATEWAY', lane: 0, label: 'Stok cukup?', sla: '1 mnt', order: 6, yesTargetOrder: 7, noTargetOrder: 10 },
          { type: 'TASK', lane: 0, label: 'Kalibrasi & tes rasa', sla: '10 mnt', order: 7 },
          { type: 'GATEWAY', lane: 0, label: 'Rasa standar?', sla: '1 mnt', order: 8, yesTargetOrder: 11, noTargetOrder: 12 },
          { type: 'CORRECTION', lane: 1, label: 'Bersihkan & rapikan ulang', sla: '10 mnt', order: 9, branchLabel: 'TIDAK' },
          { type: 'CORRECTION', lane: 2, label: 'Ambil refill / ajukan stok', sla: '15 mnt', order: 10, branchLabel: 'TIDAK' },
          { type: 'TASK', lane: 1, label: 'Outlet ready untuk layanan', sla: '2 mnt', order: 11, branchLabel: 'YA' },
          { type: 'CORRECTION', lane: 0, label: 'Adjust grind, dose, atau resep', sla: '10 mnt', order: 12, branchLabel: 'TIDAK' },
          { type: 'END', lane: 1, label: 'END', sla: '', order: 13 },
        ],
        sops: [
          { instruction: 'Lakukan absensi dan pengecekan grooming.', workInstruction: 'Masuk sesuai jadwal, gunakan seragam bersih, rambut/kuku rapi, cuci tangan, dan pastikan tidak memakai aksesori yang mengganggu hygiene kerja.', output: 'Absensi & grooming OK' },
          { instruction: 'Periksa kebersihan area bar sebelum mesin digunakan.', workInstruction: 'Cek meja bar, sink, lantai, tempat sampah, portafilter, steam wand, grinder hopper, dan area pickup. Bersihkan sisa bubuk kopi, susu, tumpahan, atau sampah dari shift sebelumnya.', output: 'Opening Checklist terisi' },
          { instruction: 'Nyalakan dan panaskan peralatan utama.', workInstruction: 'Hidupkan mesin espresso sesuai urutan aman, pasang portafilter, flush group head, nyalakan grinder, cek pressure/temperature indikator, dan tunggu mesin stabil sebelum digunakan.', output: 'Mesin siap pakai' },
          { instruction: 'Cek stok operasional harian.', workInstruction: 'Hitung cup, lid, straw, napkin, beans, milk, syrup, powder, topping, es, dan bahan best seller. Bila stok di bawah par level, ambil refill atau ajukan ke supervisor.', output: 'Stok minimum terpenuhi' },
          { instruction: 'Lakukan kalibrasi awal rasa.', workInstruction: 'Buat espresso test shot atau menu standar yang ditentukan. Periksa aroma, body, crema, rasa, extraction time, dan kesesuaian resep. Jika tidak sesuai, atur grind size/dose lalu tes ulang.', output: 'Rasa awal standar' },
          { instruction: 'Minta validasi outlet ready.', workInstruction: 'Beritahu supervisor/shift leader bahwa area bar, stok, alat, dan rasa sudah siap. Jangan mulai layanan sebelum area kerja aman dan minuman test dinyatakan layak.', output: 'Outlet ready' },
        ],
      },
      {
        code: 'P02', name: 'Order Taking & Payment',
        description: 'Penerimaan pesanan dari pelanggan hingga order valid masuk antrean produksi.',
        inputText: 'Pelanggan datang / chat order, menu, POS, metode pembayaran.',
        outputText: 'Order valid masuk antrean produksi dan pelanggan menerima bukti bayar.',
        totalSla: '± 7,5 menit', category: 'Service',
        lanes: ['Customer', 'Barista / Cashier', 'POS / Payment'],
        steps: [
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
        ],
        sops: [
          { instruction: 'Sapa pelanggan dan arahkan ke menu.', workInstruction: 'Gunakan sapaan ramah, beri waktu pelanggan melihat menu, tawarkan menu best seller atau promo tanpa memaksa, dan pastikan pelanggan mengetahui pilihan hot/ice, size, topping, sugar, dan opsi susu.', output: 'Pelanggan siap memesan' },
          { instruction: 'Dengarkan dan ulangi pesanan pelanggan.', workInstruction: 'Catat nama pelanggan, menu, jumlah, varian, size, level sugar/ice, extra shot, topping, catatan alergi, atau request khusus. Ulangi order dengan suara jelas sebelum input.', output: 'Order terkonfirmasi' },
          { instruction: 'Input pesanan ke POS.', workInstruction: 'Masukkan item sesuai menu, cek harga, promo, diskon, pajak/service bila ada, lalu pastikan tidak ada item ganda atau varian yang salah.', output: 'Order masuk POS' },
          { instruction: 'Validasi kejelasan pesanan.', workInstruction: 'Jika ada informasi belum lengkap, hentikan proses pembayaran dan klarifikasi kembali. Jangan menebak pesanan pelanggan.', output: 'Order jelas' },
          { instruction: 'Proses pembayaran.', workInstruction: 'Sebutkan total bayar, pilih metode tunai/non-tunai, pastikan QR/EDC/sistem berhasil, dan berikan bukti transaksi bila diperlukan.', output: 'Pembayaran valid' },
          { instruction: 'Kirim order ticket ke bar.', workInstruction: 'Pastikan ticket tercetak/terkirim, urutan antrean terbaca, dan nama pelanggan jelas agar produksi tidak tertukar.', output: 'Order siap diproduksi' },
        ],
      },
      {
        code: 'P03', name: 'Beverage Production & Quality Control',
        description: 'Produksi minuman sesuai resep hingga lolos QC dan siap disajikan.',
        inputText: 'Order ticket, resep, bahan, mesin, alat, cup, standar penyajian.',
        outputText: 'Minuman sesuai pesanan, standar rasa, tampilan, suhu, dan siap disajikan.',
        totalSla: '± 8,75 menit per minuman', category: 'Operations',
        lanes: ['Barista', 'QC / Supervisor', 'Customer'],
        steps: [
          { type: 'START', lane: 0, label: 'Order ticket masuk', sla: '', order: 1 },
          { type: 'TASK', lane: 0, label: 'Baca order ticket', sla: '30 dtk', order: 2 },
          { type: 'TASK', lane: 0, label: 'Siapkan cup, bahan & alat', sla: '1 mnt', order: 3 },
          { type: 'TASK', lane: 0, label: 'Buat minuman sesuai resep', sla: '4 mnt', order: 4 },
          { type: 'GATEWAY', lane: 0, label: 'Resep sesuai?', sla: '30 dtk', order: 5, yesTargetOrder: 6, noTargetOrder: 10 },
          { type: 'TASK', lane: 0, label: 'Finishing & label nama', sla: '45 dtk', order: 6, branchLabel: 'YA' },
          { type: 'TASK', lane: 1, label: 'Cek rasa, suhu, tampilan', sla: '1 mnt', order: 7 },
          { type: 'GATEWAY', lane: 1, label: 'Lolos QC?', sla: '30 dtk', order: 8, yesTargetOrder: 9, noTargetOrder: 11 },
          { type: 'TASK', lane: 2, label: 'Panggil nama & sajikan', sla: '30 dtk', order: 9, branchLabel: 'YA' },
          { type: 'CORRECTION', lane: 0, label: 'Koreksi gramasi / ulang proses', sla: '4 mnt', order: 10, branchLabel: 'TIDAK' },
          { type: 'CORRECTION', lane: 1, label: 'Remake / perbaiki sajian', sla: '5 mnt', order: 11, branchLabel: 'TIDAK' },
          { type: 'END', lane: 2, label: 'END', sla: '', order: 12 },
        ],
        sops: [
          { instruction: 'Ambil dan baca order ticket.', workInstruction: 'Periksa nama pelanggan, urutan antrean, menu, hot/ice, size, sugar, ice level, topping, extra shot, dan catatan khusus sebelum menyentuh bahan.', output: 'Order dipahami' },
          { instruction: 'Siapkan cup, bahan, dan alat.', workInstruction: 'Pilih cup sesuai size, tempel label/nama bila digunakan, siapkan beans, susu, syrup/powder/topping, es, scale, timer, pitcher, shaker, dan lap bersih.', output: 'Station siap produksi' },
          { instruction: 'Produksi minuman sesuai resep.', workInstruction: 'Ikuti urutan recipe card. Gunakan takaran, waktu ekstraksi, suhu susu, teknik steaming, teknik pouring, dan takaran es sesuai standar. Jangan mengganti bahan tanpa persetujuan.', output: 'Minuman dibuat' },
          { instruction: 'Periksa kesesuaian resep.', workInstruction: 'Bandingkan ticket dengan minuman yang dibuat. Jika varian, ukuran, topping, sugar, atau gramasi salah, lakukan koreksi atau remake sebelum minuman keluar dari bar.', output: 'Sesuai order' },
          { instruction: 'Lakukan finishing.', workInstruction: 'Bersihkan sisi cup, tutup cup dengan rapat, beri garnish/topping sesuai standar, pastikan label terbaca, dan area pickup tidak basah.', output: 'Tampilan rapi' },
          { instruction: 'Lakukan QC sebelum penyajian.', workInstruction: 'Cek suhu, aroma, tampilan, volume, kebocoran cup, dan rasa sampling bila menu training/QC ditentukan. Catat remake jika produk harus dibuat ulang.', output: 'Lolos QC' },
          { instruction: 'Sajikan kepada pelanggan.', workInstruction: 'Panggil nama dengan jelas, ulangi nama menu, serahkan dengan sopan, dan ucapkan terima kasih.', output: 'Minuman diterima' },
        ],
      },
      {
        code: 'P04', name: 'Complaint Handling',
        description: 'Penanganan keluhan pelanggan, dari dengar hingga recovery atau eskalasi.',
        inputText: 'Keluhan pelanggan, bukti order, produk, kebijakan recovery.',
        outputText: 'Komplain tertangani, pelanggan dikonfirmasi, dan complaint log terisi.',
        totalSla: '± 12,5 menit', category: 'Service',
        lanes: ['Customer', 'Barista', 'Supervisor / Manager'],
        steps: [
          { type: 'START', lane: 0, label: 'Pelanggan komplain', sla: '', order: 1 },
          { type: 'TASK', lane: 1, label: 'Dengar, tenang, minta maaf', sla: '1 mnt', order: 2 },
          { type: 'TASK', lane: 1, label: 'Identifikasi jenis komplain', sla: '2 mnt', order: 3 },
          { type: 'GATEWAY', lane: 1, label: 'Bisa selesai di barista?', sla: '1 mnt', order: 4, yesTargetOrder: 5, noTargetOrder: 9 },
          { type: 'TASK', lane: 1, label: 'Berikan recovery sesuai policy', sla: '5 mnt', order: 5, branchLabel: 'YA' },
          { type: 'GATEWAY', lane: 0, label: 'Pelanggan puas?', sla: '1 mnt', order: 6, yesTargetOrder: 7, noTargetOrder: 9 },
          { type: 'TASK', lane: 1, label: 'Catat complaint log', sla: '2 mnt', order: 7, branchLabel: 'YA' },
          { type: 'TASK', lane: 1, label: 'Tutup dengan ucapan baik', sla: '30 dtk', order: 8 },
          { type: 'CORRECTION', lane: 2, label: 'Eskalasi ke supervisor', sla: '3 mnt', order: 9, branchLabel: 'TIDAK' },
          { type: 'CORRECTION', lane: 2, label: 'Putuskan recovery lanjutan', sla: '10 mnt', order: 10 },
          { type: 'END', lane: 1, label: 'END', sla: '', order: 11 },
        ],
        sops: [
          { instruction: 'Dengarkan keluhan tanpa menyela.', workInstruction: 'Jaga nada suara rendah, kontak mata sopan, jangan membantah, jangan menyalahkan pelanggan, dan ucapkan permintaan maaf atas ketidaknyamanan yang dirasakan.', output: 'Pelanggan tenang' },
          { instruction: 'Identifikasi jenis komplain.', workInstruction: 'Tentukan apakah keluhan terkait rasa, suhu, pesanan salah, pelayanan, waktu tunggu, kebersihan, pembayaran, atau kerusakan produk. Minta struk/foto bila diperlukan.', output: 'Jenis masalah jelas' },
          { instruction: 'Tentukan apakah barista boleh menyelesaikan.', workInstruction: 'Selesaikan langsung bila masuk batas kewenangan: remake karena salah order, minuman tumpah saat diserahkan, atau kualitas tidak sesuai standar. Eskalasi bila menyangkut refund, pelanggan marah berat, media sosial, atau kerugian besar.', output: 'Keputusan penanganan' },
          { instruction: 'Berikan recovery sesuai kebijakan.', workInstruction: 'Tawarkan remake, koreksi minuman, penggantian cup, atau solusi lain yang diizinkan. Jelaskan dengan singkat dan tidak defensif.', output: 'Recovery diberikan' },
          { instruction: 'Konfirmasi kepuasan pelanggan.', workInstruction: 'Tanyakan apakah solusi sudah membantu. Bila belum, hubungi supervisor dan jangan membuat janji kompensasi di luar kebijakan.', output: 'Status puas/tidak puas' },
          { instruction: 'Catat complaint log.', workInstruction: 'Isi tanggal, jam, nama/nomor order, jenis komplain, penyebab, solusi, PIC, dan status akhir. Tambahkan foto bila diperlukan.', output: 'Complaint log terisi' },
        ],
      },
      {
        code: 'P05', name: 'Stock Usage, Refill & Waste',
        description: 'Pencatatan penggunaan stok, refill, dan waste selama shift.',
        inputText: 'Stok awal, par level, bahan yang dipakai, waste/expired, form stok.',
        outputText: 'Stok harian tercatat, refill dilakukan, waste diketahui, dan selisih bisa ditelusuri.',
        totalSla: '± 9,5 menit + SLA produksi per order', category: 'Operations',
        lanes: ['Barista', 'Supervisor', 'Inventory / Storage'],
        steps: [
          { type: 'START', lane: 0, label: 'Awal shift', sla: '', order: 1 },
          { type: 'TASK', lane: 0, label: 'Cek stok kritis awal shift', sla: '5 mnt', order: 2 },
          { type: 'GATEWAY', lane: 0, label: 'Stok cukup?', sla: '1 mnt', order: 3, yesTargetOrder: 4, noTargetOrder: 9 },
          { type: 'TASK', lane: 0, label: 'Gunakan bahan sesuai resep', sla: 'per order', order: 4, branchLabel: 'YA' },
          { type: 'GATEWAY', lane: 0, label: 'Ada waste?', sla: '30 dtk', order: 5, yesTargetOrder: 6, noTargetOrder: 8 },
          { type: 'TASK', lane: 0, label: 'Catat waste / expired + foto', sla: '3 mnt', order: 6, branchLabel: 'YA' },
          { type: 'TASK', lane: 1, label: 'Supervisor verifikasi', sla: '10 mnt', order: 7 },
          { type: 'CORRECTION', lane: 0, label: 'Update sisa stok tanpa waste', sla: '3 mnt', order: 8, branchLabel: 'TIDAK' },
          { type: 'CORRECTION', lane: 2, label: 'Ajukan refill / ambil stock', sla: '10 mnt', order: 9, branchLabel: 'TIDAK' },
          { type: 'TASK', lane: 0, label: 'Update form stok', sla: '5 mnt', order: 10 },
          { type: 'END', lane: 0, label: 'END', sla: '', order: 11 },
        ],
        sops: [
          { instruction: 'Cek stok kritis sebelum layanan ramai.', workInstruction: 'Hitung bahan utama dan perlengkapan cepat habis: beans, milk, syrup, powder, topping, cup, lid, straw, napkin, es. Bandingkan dengan par level shift.', output: 'Stok awal diketahui' },
          { instruction: 'Putuskan kebutuhan refill.', workInstruction: 'Jika stok di bawah minimum, ajukan refill kepada supervisor/inventory. Tuliskan item, jumlah, alasan, dan jam kebutuhan agar tidak mengganggu layanan.', output: 'Refill request' },
          { instruction: 'Gunakan bahan sesuai resep.', workInstruction: 'Ambil bahan dengan FIFO/FEFO, tutup kembali kemasan, jangan mencampur bahan lama dengan baru tanpa aturan, dan gunakan alat takar yang benar.', output: 'Pemakaian terkendali' },
          { instruction: 'Identifikasi waste atau expired.', workInstruction: 'Pisahkan bahan tumpah, basi, expired, rusak kemasan, salah racik, atau remake. Jangan membuang tanpa pencatatan.', output: 'Waste teridentifikasi' },
          { instruction: 'Catat waste dengan bukti.', workInstruction: 'Isi nama item, jumlah, satuan, penyebab, jam kejadian, PIC, dan foto bila diminta. Simpan barang rusak di area yang ditentukan sampai diverifikasi.', output: 'Waste Log lengkap' },
          { instruction: 'Update sisa stok akhir shift.', workInstruction: 'Hitung sisa fisik, tulis selisih, jelaskan penyebab bila ada, dan serahkan catatan ke supervisor untuk review.', output: 'Stock Form selesai' },
        ],
      },
      {
        code: 'P06', name: 'Closing, Cleaning & Handover',
        description: 'Penutupan operasional, cleaning, settlement kas, dan handover shift.',
        inputText: 'Jam operasional selesai, transaksi harian, checklist cleaning, laporan stok.',
        outputText: 'Kas/settlement cocok, area bersih, alat aman, dan laporan shift diterima.',
        totalSla: '± 55 menit', category: 'Operations',
        lanes: ['Barista', 'Cashier / POS', 'Supervisor'],
        steps: [
          { type: 'START', lane: 0, label: 'Jam operasional selesai', sla: '', order: 1 },
          { type: 'TASK', lane: 0, label: 'Last call & stop order', sla: '5 mnt', order: 2 },
          { type: 'TASK', lane: 1, label: 'Tutup POS & hitung transaksi', sla: '10 mnt', order: 3 },
          { type: 'GATEWAY', lane: 1, label: 'Kas/POS cocok?', sla: '2 mnt', order: 4, yesTargetOrder: 5, noTargetOrder: 10 },
          { type: 'TASK', lane: 0, label: 'Cleaning mesin, bar & alat', sla: '20 mnt', order: 5, branchLabel: 'YA' },
          { type: 'GATEWAY', lane: 0, label: 'Area bersih & alat off?', sla: '3 mnt', order: 6, yesTargetOrder: 7, noTargetOrder: 11 },
          { type: 'TASK', lane: 0, label: 'Submit closing & handover', sla: '5 mnt', order: 7, branchLabel: 'YA' },
          { type: 'TASK', lane: 2, label: 'Supervisor approve', sla: '10 mnt', order: 8 },
          { type: 'END', lane: 2, label: 'END', sla: '', order: 9 },
          { type: 'CORRECTION', lane: 1, label: 'Recount & jelaskan selisih', sla: '15 mnt', order: 10, branchLabel: 'TIDAK' },
          { type: 'CORRECTION', lane: 0, label: 'Re-clean / matikan ulang', sla: '10 mnt', order: 11, branchLabel: 'TIDAK' },
        ],
        sops: [
          { instruction: 'Lakukan last call dan hentikan order baru.', workInstruction: 'Ikuti jam operasional. Informasikan last order dengan sopan, selesaikan semua antrean, dan pastikan tidak ada order menggantung sebelum POS ditutup.', output: 'Order selesai' },
          { instruction: 'Tutup POS dan cocokkan transaksi.', workInstruction: 'Rekap tunai, QR, EDC, transfer, voucher, refund, dan void. Bandingkan total POS dengan uang fisik/settlement. Jika selisih, recount dan jelaskan penyebabnya.', output: 'Cash/POS match' },
          { instruction: 'Bersihkan mesin dan alat.', workInstruction: 'Backflush bila dijadwalkan, bersihkan portafilter, basket, steam wand, grinder area, pitcher, shaker, spoon, sink, dan tempat sampah. Gunakan chemical sesuai instruksi aman.', output: 'Alat bersih' },
          { instruction: 'Bersihkan area bar dan pickup.', workInstruction: 'Lap meja, lantai, area display, tempat pickup, chiller luar, dan area pelanggan sekitar bar. Pastikan tidak ada susu/bubuk kopi/topping tercecer.', output: 'Area bersih' },
          { instruction: 'Matikan alat sesuai urutan aman.', workInstruction: 'Matikan mesin/peralatan sesuai standar outlet, cabut alat yang wajib dicabut, cek chiller/freezer tetap hidup jika diperlukan, dan pastikan gas/listrik/air aman.', output: 'Peralatan aman' },
          { instruction: 'Lengkapi closing report dan handover.', workInstruction: 'Isi total transaksi, stok akhir, waste, komplain, remake, kerusakan alat, pekerjaan tertunda, dan kebutuhan stok esok hari. Kirim ke supervisor.', output: 'Closing & handover selesai' },
        ],
      },
    ]

    for (const p of processes) {
      const process = await db.process.create({
        data: {
          code: p.code,
          name: p.name,
          description: p.description,
          inputText: p.inputText,
          outputText: p.outputText,
          totalSla: p.totalSla,
          category: p.category,
          status: 'ACTIVE',
        },
      })

      // Create lanes
      const laneMap: Record<string, string> = {}
      for (let i = 0; i < p.lanes.length; i++) {
        const lane = await db.processLane.create({
          data: { processId: process.id, name: p.lanes[i], order: i },
        })
        laneMap[p.lanes[i]] = lane.id
      }

      // Assign lanes to positions based on lane name
      const lanePositionMap: Record<string, string | undefined> = {
        'Barista': barista.id,
        'Barista / Cashier': barista.id,
        'QC / Supervisor': supervisor.id,
        'Supervisor': supervisor.id,
        'Supervisor / Shift Leader': supervisor.id,
        'Supervisor / Manager': supervisor.id,
        'Cashier / POS': cashier.id,
        'POS / Payment': cashier.id,
        'Inventory / Storage': inventoryStaff.id,
        'Customer': undefined,
      }

      // Create steps
      for (const step of p.steps) {
        const laneName = p.lanes[step.lane]
        const laneId = laneMap[laneName]
        const positionId = lanePositionMap[laneName]
        await db.processStep.create({
          data: {
            processId: process.id,
            laneId,
            type: step.type,
            label: step.label,
            sla: step.sla || null,
            order: step.order,
            branchLabel: (step as { branchLabel?: string }).branchLabel || null,
            yesTargetOrder: (step as { yesTargetOrder?: number }).yesTargetOrder || null,
            noTargetOrder: (step as { noTargetOrder?: number }).noTargetOrder || null,
            positionId: positionId || null,
          },
        })
      }

      // Create SOP steps
      for (let i = 0; i < p.sops.length; i++) {
        const sop = p.sops[i]
        await db.sopStep.create({
          data: {
            processId: process.id,
            order: i + 1,
            instruction: sop.instruction,
            workInstruction: sop.workInstruction,
            output: sop.output,
          },
        })
      }
    }

    // ============================================================
    // 7. FORM TEMPLATES
    // ============================================================
    const forms = [
      {
        name: 'Opening Checklist',
        description: 'Form ini digunakan setiap awal shift sebelum layanan dimulai.',
        processCode: 'P01',
        fields: [
          { label: 'Absensi & grooming', standard: 'Hadir tepat waktu, seragam rapi, tangan bersih' },
          { label: 'Area bar', standard: 'Meja, sink, lantai, pickup area bersih' },
          { label: 'Mesin espresso & grinder', standard: 'Menyala normal, pressure/temperature aman' },
          { label: 'Stok kritis', standard: 'Beans, milk, cup, lid, es, syrup, powder cukup' },
          { label: 'Kalibrasi rasa', standard: 'Test shot/menu standar sesuai recipe card' },
        ],
      },
      {
        name: 'Order Accuracy & QC Log',
        description: 'Form untuk mencatat error order, QC, dan remake.',
        processCode: 'P02',
        fields: [
          { label: 'Tanggal' }, { label: 'Jam' }, { label: 'No Order' },
          { label: 'Menu' }, { label: 'Masalah' }, { label: 'Tindakan' },
          { label: 'PIC' }, { label: 'Status' },
        ],
      },
      {
        name: 'Complaint Log',
        description: 'Form untuk memastikan komplain tidak hilang dan penyelesaiannya dapat diaudit.',
        processCode: 'P04',
        fields: [
          { label: 'Tanggal' }, { label: 'Jam' }, { label: 'Nama/No Order' },
          { label: 'Jenis Komplain' }, { label: 'Penyebab' }, { label: 'Solusi/Recovery' },
          { label: 'PIC' }, { label: 'Status Akhir' },
        ],
      },
      {
        name: 'Stock & Waste Form',
        description: 'Form untuk mencatat stok awal, refill, pemakaian, waste, dan stok akhir.',
        processCode: 'P05',
        fields: [
          { label: 'Tanggal' }, { label: 'Shift' }, { label: 'Item' },
          { label: 'Stok Awal' }, { label: 'Refill' }, { label: 'Terpakai' },
          { label: 'Waste' }, { label: 'Stok Akhir' }, { label: 'Selisih' }, { label: 'PIC' },
        ],
      },
      {
        name: 'Closing & Handover Report',
        description: 'Form untuk memastikan pergantian shift/hari berikutnya tidak kehilangan informasi.',
        processCode: 'P06',
        fields: [
          { label: 'Kas/POS/settlement', detail: 'Sesuai / Selisih' },
          { label: 'Cleaning mesin & alat', detail: 'Selesai / belum' },
          { label: 'Stok akhir & kebutuhan besok', detail: 'Catatan item kritis' },
          { label: 'Waste / remake / komplain', detail: 'Ringkasan kejadian' },
          { label: 'Kerusakan alat / kendala shift', detail: 'Detail kendala' },
        ],
      },
    ]

    for (const f of forms) {
      const proc = await db.process.findUnique({ where: { code: f.processCode } })
      await db.formTemplate.create({
        data: {
          name: f.name,
          description: f.description,
          processId: proc?.id || null,
          fieldsJson: JSON.stringify(f.fields),
        },
      })
    }

    // ============================================================
    // 8. SAMPLE TASKS
    // ============================================================
    const adminUser = await db.user.findUnique({ where: { email: 'owner@kinikawa.test' } })
    const p01 = await db.process.findUnique({ where: { code: 'P01' } })
    const p03 = await db.process.findUnique({ where: { code: 'P03' } })
    const p06 = await db.process.findUnique({ where: { code: 'P06' } })

    if (adminUser && p01) {
      await db.task.create({
        data: {
          title: 'Opening Shift Pagi - Outlet Senayan',
          description: 'Jalankan opening checklist dan pastikan outlet ready sebelum jam buka 07:00.',
          processId: p01.id,
          assignedToId: empBudi.id,
          positionId: barista.id,
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
          createdById: adminUser.id,
          logs: {
            create: { userId: adminUser.id, employeeId: empBudi.id, action: 'CREATED', note: 'Task dibuat untuk opening shift pagi' },
          },
        },
      })
    }

    if (adminUser && p03) {
      await db.task.create({
        data: {
          title: 'QC Minuman - Espresso Test Shot',
          description: 'Lakukan kalibrasi rasa dengan espresso test shot, pastikan extraction time dan crema sesuai standar.',
          processId: p03.id,
          assignedToId: empRina.id,
          positionId: barista.id,
          status: 'PENDING',
          priority: 'MEDIUM',
          dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
          createdById: adminUser.id,
        },
      })
    }

    if (adminUser && p06) {
      await db.task.create({
        data: {
          title: 'Closing & Handover Shift Sore',
          description: 'Tutup POS, cleaning area bar, matikan alat, submit closing report ke supervisor.',
          processId: p06.id,
          assignedToId: empBudi.id,
          positionId: barista.id,
          status: 'PENDING',
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
          createdById: adminUser.id,
        },
      })
      await db.task.create({
        data: {
          title: 'Settlement Kas - Closing Shift Sore',
          description: 'Cocokkan tunai, QR, EDC dengan total POS. Jelaskan selisih bila ada.',
          processId: p06.id,
          assignedToId: empMaya.id,
          positionId: cashier.id,
          status: 'PENDING',
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
          createdById: adminUser.id,
        },
      })
      await db.task.create({
        data: {
          title: 'Approval Closing Report Shift Sore',
          description: 'Review dan approve closing report dari barista & cashier. Pastikan kas cocok dan area bersih.',
          processId: p06.id,
          assignedToId: empSari.id,
          positionId: supervisor.id,
          status: 'PENDING',
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 9 * 60 * 60 * 1000),
          createdById: adminUser.id,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      seeded: true,
      message: 'Database berhasil di-seed dengan data Kinikawa Coffee',
      credentials: {
        admin: { email: 'owner@kinikawa.test', password: 'kinikawa123' },
        manager: { email: 'supervisor@kinikawa.test', password: 'kinikawa123' },
        staff: { email: 'barista@kinikawa.test', password: 'kinikawa123' },
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Gagal seed database: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
