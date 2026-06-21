import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Create a sample workbook for the current user (so new users have an example to reference)
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if user already has workbooks — if so, don't create a duplicate sample
    const existingCount = await db.workbook.count({ where: { userId: user.id } })
    if (existingCount > 0) {
      return NextResponse.json({ ok: true, created: false, message: 'User already has workbooks' })
    }

    // Create a sample "Customer Service" workbook as a reference example
    const wb = await db.workbook.create({
      data: {
        userId: user.id,
        title: 'Buku Kerja Customer Service Representative',
        companyName: 'Contoh Perusahaan',
        companyTagline: 'Employee Workbook',
        positionTitle: 'Customer Service Representative',
        department: 'Customer Service / Support',
        reportsTo: 'Customer Service Supervisor',
        subordinates: 'Tidak ada',
        purpose: 'Memberikan layanan pelanggan yang responsif, akurat, dan ramah untuk menangani pertanyaan, keluhan, dan permintaan pelanggan dengan standar kualitas tertinggi.',
        authority:
          'Menawarkan kompensasi/refund sesuai kebijakan perusahaan hingga nilai tertentu.\nEskalasi kasus kompleks ke supervisor atau departemen terkait.\nMenolak layanan kepada pelanggan yang tidak patuh dengan kebijakan.\nMengakses sistem CRM dan database pelanggan untuk keperluan layanan.\nMemberikan diskon promo sesuai program yang berlaku.',
        responsibilities:
          'Menangani panggilan, chat, dan email pelanggan dengan responsif.\nMencatat setiap interaksi pelanggan di sistem CRM secara akurat.\nMenyelesaikan keluhan pelanggan di tingkat pertama (first-call resolution).\nMenyediakan informasi produk, harga, dan kebijakan yang benar.\nMenjaga sikap profesional dan empati dalam setiap interaksi.\nMencapai target KPI: response time, satisfaction score, resolution rate.',
        dutiesPrimary:
          'Menerima dan menangani kontak pelanggan (telepon, chat, email), menyelesaikan keluhan, memberikan informasi, dan mencatat interaksi di sistem.',
        dutiesDaily:
          'Login ke sistem, cek antrian tiket, tangani panggilan/chat masuk, update CRM, follow-up kasus tertunda, handover shift.',
        dutiesWeekly:
          'Review tiket belum terselesaikan, analisis pola keluhan, briefing tim, update knowledge base, evaluasi KPI mingguan.',
        dutiesMonthly:
          'Evaluasi performa KRA, review kepuasan pelanggan, training produk baru, refresh SOP, usulan perbaikan layanan.',
        krasJson: JSON.stringify([
          { name: 'First Call Resolution Rate', formula: 'Keluhan selesai di panggilan pertama ÷ total panggilan × 100%', target: '≥ 80%', unit: '%' },
          { name: 'Customer Satisfaction Score', formula: 'Rata-rata skor survei kepuasan pelanggan', target: '≥ 4.5/5', unit: 'skor' },
          { name: 'Average Response Time', formula: 'Rata-rata waktu dari kontak masuk ke respons pertama', target: '≤ 30 detik', unit: 'detik' },
          { name: 'Average Handling Time', formula: 'Rata-rata durasi penanganan per kasus', target: '≤ 5 menit', unit: 'menit' },
          { name: 'Akurasi Informasi', formula: 'Informasi benar ÷ total informasi diberikan × 100%', target: '≥ 95%', unit: '%' },
          { name: 'Kepatuhan Schedule', formula: 'Waktu online sesuai jadwal ÷ total jam kerja × 100%', target: '≥ 95%', unit: '%' },
          { name: 'Eskalasi Rate', formula: 'Kasus dieskalasi ÷ total kasus × 100%', target: '≤ 15%', unit: '%' },
          { name: 'Quality Assurance Score', formula: 'Skor audit QA terhadap sampel interaksi', target: '≥ 90', unit: 'skor' },
        ]),
        status: 'PUBLISHED',
        accentColor: '#0f766e',
      },
    })

    // Add 2 sample processes
    await db.workbookProcess.create({
      data: {
        workbookId: wb.id,
        code: 'P01',
        name: 'Inbound Customer Inquiry Handling',
        description: 'Menangani pertanyaan/permintaan pelanggan yang masuk via telepon atau chat.',
        inputText: 'Kontak masuk dari pelanggan (telepon/chat/email), sistem CRM, knowledge base.',
        outputText: 'Pertanyaan terjawab, masalah terselesaikan, interaksi tercatat di CRM.',
        totalSla: '± 5 menit',
        category: 'Service',
        lanesJson: JSON.stringify(['Customer', 'CS Representative', 'Supervisor']),
        stepsJson: JSON.stringify([
          { type: 'START', lane: 0, label: 'Pelanggan menghubungi', sla: '', order: 1 },
          { type: 'TASK', lane: 1, label: 'Sapa & identifikasi pelanggan', sla: '30 dtk', order: 2 },
          { type: 'TASK', lane: 1, label: 'Dengarkan & pahami kebutuhan', sla: '1 mnt', order: 3 },
          { type: 'GATEWAY', lane: 1, label: 'Bisa jawab?', sla: '30 dtk', order: 4, yesTargetOrder: 5, noTargetOrder: 7 },
          { type: 'TASK', lane: 1, label: 'Berikan informasi/solusi', sla: '2 mnt', order: 5, branchLabel: 'YA' },
          { type: 'TASK', lane: 1, label: 'Catat di CRM & konfirmasi', sla: '30 dtk', order: 6 },
          { type: 'CORRECTION', lane: 2, label: 'Eskalasi ke supervisor', sla: '2 mnt', order: 7, branchLabel: 'TIDAK' },
          { type: 'END', lane: 1, label: 'END', sla: '', order: 8 },
        ]),
        sopsJson: JSON.stringify([
          { instruction: 'Sapa pelanggan dengan ramah.', workInstruction: 'Gunakan script sapaan standar, sebut nama perusahaan dan nama Anda, tanyakan bagaimana bisa membantu.', output: 'Sapaan tercatat' },
          { instruction: 'Identifikasi pelanggan di CRM.', workInstruction: 'Minta nama dan nomor akun/email, cari di sistem CRM, verifikasi identitas sesuai prosedur keamanan.', output: 'Pelanggan teridentifikasi' },
          { instruction: 'Dengarkan dan pahami kebutuhan.', workInstruction: 'Beri perhatian penuh, catat poin penting, jangan menyela, tanyakan klarifikasi jika perlu.', output: 'Kebutuhan terpahami' },
          { instruction: 'Cek apakah bisa menjawab.', workInstruction: 'Rujuk knowledge base, cek kebijakan, pastikan informasi yang akan diberikan akurat dan terkini.', output: 'Keputusan penanganan' },
          { instruction: 'Berikan informasi atau solusi.', workInstruction: 'Jelaskan dengan jelas, gunakan bahasa yang dipahami pelanggan, tawarkan opsi jika ada, hindari janji di luar kewenangan.', output: 'Solusi diberikan' },
          { instruction: 'Catat interaksi di CRM.', workInstruction: 'Isi tiket dengan ringkasan, kategori, status, dan tindak lanjut. Konfirmasi ke pelanggan bahwa masalah sudah diselesaikan.', output: 'Tiket CRM terisi' },
        ]),
        formsJson: JSON.stringify([
          { label: 'Tanggal', standard: '' }, { label: 'Jam', standard: '' }, { label: 'No Tiket', standard: '' },
          { label: 'Nama Pelanggan', standard: '' }, { label: 'Kategori', standard: '' }, { label: 'Status', standard: '' },
        ]),
        order: 1,
      },
    })

    await db.workbookProcess.create({
      data: {
        workbookId: wb.id,
        code: 'P02',
        name: 'Complaint Resolution',
        description: 'Menangani keluhan pelanggan hingga diselesaikan atau dieskalasi.',
        inputText: 'Keluhan pelanggan, riwayat akun, kebijakan kompensasi, sistem CRM.',
        outputText: 'Keluhan terselesaikan atau dieskalasi, pelanggan diupdate, tiket tercatat.',
        totalSla: '± 10 menit',
        category: 'Service',
        lanesJson: JSON.stringify(['Customer', 'CS Representative', 'Supervisor']),
        stepsJson: JSON.stringify([
          { type: 'START', lane: 0, label: 'Pelanggan komplain', sla: '', order: 1 },
          { type: 'TASK', lane: 1, label: 'Dengar & empati', sla: '1 mnt', order: 2 },
          { type: 'TASK', lane: 1, label: 'Identifikasi masalah', sla: '2 mnt', order: 3 },
          { type: 'GATEWAY', lane: 1, label: 'Bisa selesai di CS?', sla: '1 mnt', order: 4, yesTargetOrder: 5, noTargetOrder: 8 },
          { type: 'TASK', lane: 1, label: 'Berikan solusi/kompensasi', sla: '3 mnt', order: 5, branchLabel: 'YA' },
          { type: 'GATEWAY', lane: 0, label: 'Pelanggan puas?', sla: '1 mnt', order: 6, yesTargetOrder: 7, noTargetOrder: 8 },
          { type: 'TASK', lane: 1, label: 'Catat & tutup tiket', sla: '1 mnt', order: 7, branchLabel: 'YA' },
          { type: 'CORRECTION', lane: 2, label: 'Eskalasi ke supervisor', sla: '2 mnt', order: 8, branchLabel: 'TIDAK' },
          { type: 'END', lane: 1, label: 'END', sla: '', order: 9 },
        ]),
        sopsJson: JSON.stringify([
          { instruction: 'Dengarkan keluhan dengan empati.', workInstruction: 'Jaga nada suara tenang, akui perasaan pelanggan, minta maaf atas ketidaknyamanan, jangan defensif.', output: 'Pelanggan tenang' },
          { instruction: 'Identifikasi jenis dan penyebab masalah.', workInstruction: 'Tanyakan detail kejadian, cek riwayat akun, tentukan kategori keluhan dan akar penyebab.', output: 'Masalah teridentifikasi' },
          { instruction: 'Tentukan apakah bisa diselesaikan di level CS.', workInstruction: 'Cek kebijakan kompensasi, jika dalam kewenangan (refund kecil, info salah, keterlambatan ringan) selesaikan langsung. Jika besar/menyangkut policy, eskalasi.', output: 'Keputusan penanganan' },
          { instruction: 'Berikan solusi atau kompensasi.', workInstruction: 'Tawarkan solusi sesuai kebijakan, jelaskan prosesnya, pastikan pelanggan mengerti dan setuju.', output: 'Solusi diberikan' },
          { instruction: 'Konfirmasi kepuasan pelanggan.', workInstruction: 'Tanyakan apakah solusi memuaskan, jika belum tawarkan opsi lain atau eskalasi.', output: 'Status puas/tidak' },
          { instruction: 'Catat dan tutup tiket.', workInstruction: 'Update CRM dengan solusi, status closed, dan feedback. Kirim email konfirmasi jika perlu.', output: 'Tiket tertutup' },
        ]),
        formsJson: JSON.stringify([
          { label: 'Tanggal', standard: '' }, { label: 'No Tiket', standard: '' }, { label: 'Nama Pelanggan', standard: '' },
          { label: 'Jenis Keluhan', standard: '' }, { label: 'Solusi', standard: '' }, { label: 'Status Akhir', standard: '' },
        ]),
        order: 2,
      },
    })

    return NextResponse.json({ ok: true, created: true, workbookId: wb.id })
  } catch (error) {
    console.error('Create sample workbook error:', error)
    return NextResponse.json({ error: 'Gagal membuat contoh workbook' }, { status: 500 })
  }
}
