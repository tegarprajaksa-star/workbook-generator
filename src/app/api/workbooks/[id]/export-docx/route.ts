import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, Header, Footer, PageNumber, ImageRun,
} from 'docx'
import sharp from 'sharp'
import { generateBpmnSvg, type BpmnStep as BpmnStepT } from '@/lib/bpmn-svg'

export const dynamic = 'force-dynamic'

type Step = {
  type: string; lane: number; label: string; sla: string; order: number
  branchLabel?: string
}
type Sop = { instruction: string; workInstruction: string; output: string }

function lines(text: string): string[] {
  return (text || '').split('\n').map(s => s.trim()).filter(Boolean)
}

// Convert BPMN SVG to PNG buffer for embedding in DOCX
async function bpmnSvgToPng(lanes: string[], steps: Step[], accentColor: string): Promise<Buffer | null> {
  if (steps.length === 0 || lanes.length === 0) return null
  try {
    const svg = generateBpmnSvg(lanes, steps as unknown as BpmnStepT[], accentColor)
    // Render at 2x density for crisp text, then resize to target width
    const pngBuffer = await sharp(Buffer.from(svg), { density: 192 })
      .resize({ width: 1600, fit: 'inside' })
      .png()
      .toBuffer()
    return pngBuffer
  } catch (err) {
    console.error('BPMN SVG to PNG error:', err)
    return null
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

    const accent = wb.accentColor.replace('#', '')
    const kras = JSON.parse(wb.krasJson || '[]') as Array<{ name: string; formula: string; target: string; unit: string }>
    const children: (Paragraph | Table)[] = []

    // ---- COVER ----
    children.push(new Paragraph({ children: [], spacing: { before: 3000 } }))
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: wb.companyName || '', size: 32, bold: true, color: accent })],
    }))
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: wb.companyTagline || 'Employee Workbook', size: 20, color: '888888' })],
      spacing: { after: 600 },
    }))
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: wb.title, size: 48, bold: true })],
      spacing: { after: 200 },
    }))
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Posisi: ${wb.positionTitle}`, size: 24, color: '555555' })],
    }))
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Job Description • BPMN 2.0 • SOP • Work Instruction • Form • KRA', size: 18, color: '888888' })],
      spacing: { before: 400 },
    }))
    children.push(new Paragraph({ children: [], spacing: { before: 2400 } }))
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Developed by Arah Daya Consulting', size: 18, color: accent, bold: true })],
    }))
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Coach Tegar Prajaksa, MBA', size: 16, color: '888888', italics: true })],
      spacing: { after: 200 },
    }))
    children.push(new Paragraph({ children: [new PageBreak()] }))

    // ---- 1. JOB DESCRIPTION ----
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: '1. Job Description', color: accent })],
    }))
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: wb.positionTitle })],
    }))

    const jobRows = [
      ['Nama Jabatan', wb.positionTitle],
      ['Unit/Divisi', wb.department],
      ['Atasan Langsung', wb.reportsTo],
      ['Bawahan Langsung', wb.subordinates],
      ['Tujuan Jabatan', wb.purpose],
    ]
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: jobRows.map(([k, v]) => new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F5F5F5' },
            children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: v || '-', size: 20 })] })],
          }),
        ],
      })),
    }))

    children.push(new Paragraph({ children: [], spacing: { before: 300 } }))

    // ---- 2. AUTHORITY & RESPONSIBILITIES ----
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: '2. Wewenang dan Tanggung Jawab', color: accent })],
    }))

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: accent },
              children: [new Paragraph({ children: [new TextRun({ text: 'Wewenang', bold: true, color: 'FFFFFF', size: 22 })] })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: accent },
              children: [new Paragraph({ children: [new TextRun({ text: 'Tanggung Jawab', bold: true, color: 'FFFFFF', size: 22 })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: lines(wb.authority).map(a => new Paragraph({
                children: [new TextRun({ text: '• ' + a, size: 20 })],
                spacing: { after: 80 },
              })),
            }),
            new TableCell({
              children: lines(wb.responsibilities).map(r => new Paragraph({
                children: [new TextRun({ text: '• ' + r, size: 20 })],
                spacing: { after: 80 },
              })),
            }),
          ],
        }),
      ],
    }))

    // ---- 3. DUTIES ----
    children.push(new Paragraph({ children: [], spacing: { before: 400 } }))
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: '3. Tugas Pokok, Harian, Mingguan, Bulanan', color: accent })],
    }))
    const dutiesRows = [
      ['Tugas Pokok', wb.dutiesPrimary],
      ['Tugas Harian', wb.dutiesDaily],
      ['Tugas Mingguan', wb.dutiesWeekly],
      ['Tugas Bulanan', wb.dutiesMonthly],
    ]
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: dutiesRows.map(([k, v]) => new TableRow({
        children: [
          new TableCell({
            width: { size: 22, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F5F5F5' },
            children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: v || '-', size: 20 })] })],
          }),
        ],
      })),
    }))

    // ---- 4. KRA ----
    children.push(new Paragraph({ children: [], spacing: { before: 400 } }))
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: '4. Key Result Area (KRA)', color: accent })],
    }))
    if (kras.length > 0) {
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: ['No', 'KRA', 'Formula / Cara Ukur', 'Target'].map((h, i) => new TableCell({
              width: { size: [8, 25, 47, 20][i], type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: accent },
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20 })] })],
            })),
          }),
          ...kras.map((k, i) => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k.name, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k.formula, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k.target, size: 20, bold: true })] })] }),
            ],
          })),
        ],
      }))
    }

    // ---- 5. PROCESSES ----
    for (const proc of wb.processes) {
      children.push(new Paragraph({ children: [new PageBreak()] }))
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: `${proc.code} — ${proc.name}`, color: accent })],
      }))
      if (proc.description) {
        children.push(new Paragraph({ children: [new TextRun({ text: proc.description, size: 20, italics: true, color: '666666' })] }))
      }

      // Input / Output
      children.push(new Paragraph({ children: [], spacing: { before: 200 } }))
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: 'F9F9F9' },
                children: [
                  new Paragraph({ children: [new TextRun({ text: 'INPUT', bold: true, size: 18, color: accent })] }),
                  new Paragraph({ children: [new TextRun({ text: proc.inputText || '-', size: 20 })] }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: 'F9F9F9' },
                children: [
                  new Paragraph({ children: [new TextRun({ text: 'OUTPUT', bold: true, size: 18, color: accent })] }),
                  new Paragraph({ children: [new TextRun({ text: proc.outputText || '-', size: 20 })] }),
                ],
              }),
            ],
          }),
        ],
      }))
      if (proc.totalSla) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `Total SLA: ${proc.totalSla}`, size: 18, italics: true, color: '888888' })],
          spacing: { before: 100 },
        }))
      }

      // BPMN flow chart IMAGE (embedded PNG)
      children.push(new Paragraph({ children: [], spacing: { before: 300 } }))
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Alur Proses (BPMN 2.0)', size: 24 })],
      }))
      const steps = JSON.parse(proc.stepsJson || '[]') as Step[]
      const lanes = JSON.parse(proc.lanesJson || '[]') as string[]
      if (steps.length > 0 && lanes.length > 0) {
        const pngBuffer = await bpmnSvgToPng(lanes, steps, wb.accentColor || '#b45309')
        if (pngBuffer) {
          // Get actual image dimensions to preserve aspect ratio
          const meta = await sharp(pngBuffer).metadata()
          const targetWidth = 600 // points (~ page content width)
          const ratio = (meta.height || 400) / (meta.width || 1400)
          const targetHeight = Math.round(targetWidth * ratio)
          children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({
              data: pngBuffer,
              transformation: { width: targetWidth, height: targetHeight },
              type: 'png',
            })],
          }))
        }
      }

      // SOP & WI table
      children.push(new Paragraph({ children: [], spacing: { before: 300 } }))
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'SOP & Work Instruction', size: 24 })],
      }))
      const sops = JSON.parse(proc.sopsJson || '[]') as Sop[]
      if (sops.length > 0) {
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: ['No', 'SOP / Urutan Kerja', 'Work Instruction', 'Output / Bukti'].map((h) => new TableCell({
                shading: { type: ShadingType.CLEAR, fill: accent },
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })] })],
              })),
            }),
            ...sops.map((s, i) => new TableRow({
              children: [
                new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), size: 18 })] })] }),
                new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: s.instruction, size: 18, bold: true })] })] }),
                new TableCell({ width: { size: 46, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: s.workInstruction, size: 18 })] })] }),
                new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: s.output, size: 18, color: '008800' })] })] }),
              ],
            })),
          ],
        }))
      }
    }

    // Build document
    const doc = new Document({
      sections: [{
        properties: {},
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: `${wb.companyName} — ${wb.title}`, size: 16, color: 'AAAAAA' })],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Halaman ', size: 16, color: 'AAAAAA' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: 'AAAAAA' }),
              ],
            })],
          }),
        },
        children,
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const safeName = wb.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}.docx"`,
      },
    })
  } catch (error) {
    console.error('DOCX export error:', error)
    return NextResponse.json({ error: 'Gagal export DOCX: ' + (error as Error).message }, { status: 500 })
  }
}
