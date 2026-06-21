import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import pptxgen from 'pptxgenjs'

export const dynamic = 'force-dynamic'

type Step = {
  type: string; lane: number; label: string; sla: string; order: number
  branchLabel?: string
}
type Sop = { instruction: string; workInstruction: string; output: string }

function lines(text: string): string[] {
  return (text || '').split('\n').map(s => s.trim()).filter(Boolean)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const wb = await db.workbook.findFirst({
      where: { id, userId: user.id },
      include: { processes: { orderBy: { order: 'asc' } } },
    })
    if (!wb) return NextResponse.json({ error: 'Workbook tidak ditemukan' }, { status: 404 })

    const accentRaw = (wb.accentColor || '#b45309').replace('#', '')
    const accent = accentRaw // hex string without #
    const c = hexToRgb(accentRaw)
    const lightAccentHex = [
      Math.min(255, c.r + 80).toString(16).padStart(2, '0'),
      Math.min(255, c.g + 80).toString(16).padStart(2, '0'),
      Math.min(255, c.b + 80).toString(16).padStart(2, '0'),
    ].join('')
    const kras = JSON.parse(wb.krasJson || '[]') as Array<{ name: string; formula: string; target: string; unit: string }>

    const pptx = new pptxgen()
    pptx.defineLayout({ name: 'WB', width: 13.333, height: 7.5 })
    pptx.layout = 'WB'
    pptx.author = wb.companyName
    pptx.title = wb.title

    const W = 13.333
    const H = 7.5

    // ---- SLIDE 1: COVER ----
    const slide1 = pptx.addSlide()
    slide1.background = { color: '1A1A1A' }
    slide1.addShape('rect', { x: 0, y: 0, w: 0.15, h: H, fill: { color: accent } })
    slide1.addText(wb.companyName, { x: 0.8, y: 1.8, w: 11, h: 0.5, fontSize: 24, color: 'CCCCCC', bold: true })
    slide1.addText(wb.title, { x: 0.8, y: 2.5, w: 11.5, h: 1.4, fontSize: 44, color: 'FFFFFF', bold: true })
    slide1.addText(`Posisi: ${wb.positionTitle}`, { x: 0.8, y: 4.0, w: 11, h: 0.5, fontSize: 22, color: lightAccentHex })
    slide1.addText('Job Description • BPMN 2.0 • SOP • Work Instruction • Form • KRA', { x: 0.8, y: 5.2, w: 11, h: 0.4, fontSize: 14, color: '888888' })
    slide1.addText(wb.companyTagline || 'Employee Workbook', { x: 0.8, y: 6.5, w: 11, h: 0.4, fontSize: 12, color: '666666', italic: true })

    // ---- SLIDE 2: JOB DESCRIPTION ----
    const slide2 = pptx.addSlide()
    slide2.addText('Job Description', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 28, bold: true, color: accent })
    slide2.addShape('rect', { x: 0.5, y: 0.95, w: 12.3, h: 0.03, fill: { color: accent } })

    const jobRows = [
      ['Nama Jabatan', wb.positionTitle],
      ['Unit/Divisi', wb.department],
      ['Atasan Langsung', wb.reportsTo],
      ['Bawahan Langsung', wb.subordinates],
    ]
    jobRows.forEach(([k, v], i) => {
      const y = 1.2 + i * 0.6
      slide2.addText(k, { x: 0.5, y, w: 3, h: 0.5, fontSize: 14, bold: true, fill: { color: 'F5F5F5' }, align: 'left', valign: 'middle' })
      slide2.addText(v || '-', { x: 3.6, y, w: 9.2, h: 0.5, fontSize: 14, align: 'left', valign: 'middle' })
    })
    slide2.addText('Tujuan Jabatan', { x: 0.5, y: 3.7, w: 12, h: 0.4, fontSize: 16, bold: true, color: accent })
    slide2.addText(wb.purpose || '-', { x: 0.5, y: 4.1, w: 12.3, h: 1.5, fontSize: 14, align: 'left', valign: 'top', lineSpacingMultiple: 1.3 })

    // ---- SLIDE 3: AUTHORITY & RESPONSIBILITIES ----
    const slide3 = pptx.addSlide()
    slide3.addText('Wewenang & Tanggung Jawab', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 28, bold: true, color: accent })
    slide3.addShape('rect', { x: 0.5, y: 0.95, w: 12.3, h: 0.03, fill: { color: accent } })

    slide3.addText('Wewenang', { x: 0.5, y: 1.2, w: 6, h: 0.5, fontSize: 18, bold: true, color: 'FFFFFF', fill: { color: accent }, align: 'center' })
    slide3.addText('Tanggung Jawab', { x: 6.8, y: 1.2, w: 6, h: 0.5, fontSize: 18, bold: true, color: 'FFFFFF', fill: { color: accent }, align: 'center' })

    const authLines = lines(wb.authority)
    const respLines = lines(wb.responsibilities)
    const maxLines = Math.max(authLines.length, respLines.length, 5)
    for (let i = 0; i < maxLines; i++) {
      const y = 1.75 + i * 0.95
      if (authLines[i]) {
        slide3.addText('• ' + authLines[i], { x: 0.5, y, w: 6, h: 0.9, fontSize: 12, align: 'left', valign: 'top', lineSpacingMultiple: 1.2 })
      }
      if (respLines[i]) {
        slide3.addText('• ' + respLines[i], { x: 6.8, y, w: 6, h: 0.9, fontSize: 12, align: 'left', valign: 'top', lineSpacingMultiple: 1.2 })
      }
    }

    // ---- SLIDE 4: DUTIES ----
    const slide4 = pptx.addSlide()
    slide4.addText('Tugas Pokok, Harian, Mingguan, Bulanan', { x: 0.5, y: 0.3, w: 12.3, h: 0.6, fontSize: 26, bold: true, color: accent })
    slide4.addShape('rect', { x: 0.5, y: 0.95, w: 12.3, h: 0.03, fill: { color: accent } })

    const duties = [
      ['Tugas Pokok', wb.dutiesPrimary],
      ['Tugas Harian', wb.dutiesDaily],
      ['Tugas Mingguan', wb.dutiesWeekly],
      ['Tugas Bulanan', wb.dutiesMonthly],
    ]
    duties.forEach(([k, v], i) => {
      const y = 1.2 + i * 1.4
      slide4.addText(k, { x: 0.5, y, w: 3, h: 1.2, fontSize: 16, bold: true, color: accent, fill: { color: 'F9F9F9' }, align: 'left', valign: 'middle' })
      slide4.addText(v || '-', { x: 3.6, y, w: 9.2, h: 1.2, fontSize: 13, align: 'left', valign: 'middle', lineSpacingMultiple: 1.3 })
    })

    // ---- SLIDE 5: KRA ----
    if (kras.length > 0) {
      const slide5 = pptx.addSlide()
      slide5.addText('Key Result Area (KRA)', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 28, bold: true, color: accent })
      slide5.addShape('rect', { x: 0.5, y: 0.95, w: 12.3, h: 0.03, fill: { color: accent } })

      const kraTable = [
        [{ text: 'No', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } },
         { text: 'KRA', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } },
         { text: 'Formula / Cara Ukur', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } },
         { text: 'Target', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } }],
        ...kras.map((k, i) => [
          String(i + 1), k.name, k.formula, k.target,
        ]),
      ]
      slide5.addTable(kraTable, {
        x: 0.5, y: 1.2, w: 12.3,
        colW: [0.6, 3.2, 6.5, 2.0],
        fontSize: 12,
        border: { type: 'solid', pt: 0.5, color: 'DDDDDD' },
        rowH: 0.45,
        valign: 'middle',
      })
    }

    // ---- PROCESS SLIDES ----
    for (const proc of wb.processes) {
      const lanes = JSON.parse(proc.lanesJson || '[]') as string[]
      const steps = JSON.parse(proc.stepsJson || '[]') as Step[]
      const sops = JSON.parse(proc.sopsJson || '[]') as Sop[]

      // Process overview slide
      const ps1 = pptx.addSlide()
      ps1.addText(`${proc.code} — ${proc.name}`, { x: 0.5, y: 0.3, w: 12.3, h: 0.7, fontSize: 26, bold: true, color: accent })
      ps1.addShape('rect', { x: 0.5, y: 1.0, w: 12.3, h: 0.03, fill: { color: accent } })
      if (proc.description) {
        ps1.addText(proc.description, { x: 0.5, y: 1.2, w: 12.3, h: 0.8, fontSize: 14, italic: true, color: '666666' })
      }
      ps1.addText('INPUT / PEMICU', { x: 0.5, y: 2.1, w: 6, h: 0.4, fontSize: 14, bold: true, color: accent })
      ps1.addText(proc.inputText || '-', { x: 0.5, y: 2.5, w: 6, h: 1.5, fontSize: 13, fill: { color: 'F9F9F9' }, valign: 'top', lineSpacingMultiple: 1.3 })
      ps1.addText('OUTPUT UTAMA', { x: 6.8, y: 2.1, w: 6, h: 0.4, fontSize: 14, bold: true, color: accent })
      ps1.addText(proc.outputText || '-', { x: 6.8, y: 2.5, w: 6, h: 1.5, fontSize: 13, fill: { color: 'F9F9F9' }, valign: 'top', lineSpacingMultiple: 1.3 })
      if (proc.totalSla) {
        ps1.addText(`Total SLA: ${proc.totalSla}`, { x: 0.5, y: 4.2, w: 12, h: 0.4, fontSize: 14, italic: true, color: '888888' })
      }

      // BPMN flow slide
      if (steps.length > 0) {
        const ps2 = pptx.addSlide()
        ps2.addText(`${proc.code} — Alur Proses (BPMN 2.0)`, { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: accent })
        ps2.addShape('rect', { x: 0.5, y: 0.9, w: 12.3, h: 0.03, fill: { color: accent } })

        const stepRows = [
          [{ text: 'No', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } },
           { text: 'Tipe', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } },
           { text: 'Aktivitas', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } },
           { text: 'Lane', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } },
           { text: 'SLA', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } },
           { text: 'Cabang', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } }],
          ...steps.map(s => [
            String(s.order), s.type, s.label, lanes[s.lane] || '-', s.sla || '-', s.branchLabel || '',
          ]),
        ]
        ps2.addTable(stepRows, {
          x: 0.5, y: 1.1, w: 12.3,
          colW: [0.5, 1.3, 5.5, 2.5, 1.2, 1.3],
          fontSize: 11,
          border: { type: 'solid', pt: 0.5, color: 'DDDDDD' },
          rowH: 0.4,
          valign: 'middle',
        })
      }

      // SOP slide
      if (sops.length > 0) {
        const ps3 = pptx.addSlide()
        ps3.addText(`${proc.code} — SOP & Work Instruction`, { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: accent })
        ps3.addShape('rect', { x: 0.5, y: 0.9, w: 12.3, h: 0.03, fill: { color: accent } })

        const sopRows = [
          [{ text: 'No', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } },
           { text: 'SOP / Urutan Kerja', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } },
           { text: 'Work Instruction', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } },
           { text: 'Output', options: { bold: true, fill: { color: accent }, color: 'FFFFFF' } }],
          ...sops.map((s, i) => [String(i + 1), s.instruction, s.workInstruction, s.output]),
        ]
        ps3.addTable(sopRows, {
          x: 0.5, y: 1.1, w: 12.3,
          colW: [0.5, 3.3, 6.5, 2.0],
          fontSize: 10,
          border: { type: 'solid', pt: 0.5, color: 'DDDDDD' },
          rowH: 0.85,
          valign: 'top',
        })
      }
    }

    // ---- CLOSING SLIDE ----
    const last = pptx.addSlide()
    last.background = { color: '1A1A1A' }
    last.addShape('rect', { x: 0, y: 0, w: 0.15, h: H, fill: { color: accent } })
    last.addText('Halaman Pengesahan', { x: 0.8, y: 1.5, w: 11, h: 0.8, fontSize: 32, bold: true, color: 'FFFFFF' })
    last.addText('Dokumen kerja ini dapat disahkan setelah disesuaikan dengan struktur outlet.', { x: 0.8, y: 2.4, w: 11, h: 0.6, fontSize: 16, color: 'CCCCCC' })
    last.addText(`${wb.companyName} — ${wb.title}`, { x: 0.8, y: 5.5, w: 11, h: 0.5, fontSize: 14, color: '888888', italic: true })

    // Generate
    const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
    const safeName = wb.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${safeName}.pptx"`,
      },
    })
  } catch (error) {
    console.error('PPTX export error:', error)
    return NextResponse.json({ error: 'Gagal export PPTX: ' + (error as Error).message }, { status: 500 })
  }
}
