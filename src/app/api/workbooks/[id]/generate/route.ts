import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// AI-powered workbook generation.
// Input: { positionTitle, companyName, industry, context }
// Output: complete workbook structure (job desc, duties, processes, SOPs, KRAs)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const workbook = await db.workbook.findFirst({ where: { id, userId: user.id } })
    if (!workbook) {
      return NextResponse.json({ error: 'Workbook tidak ditemukan' }, { status: 404 })
    }

    const body = await req.json()
    const { section, positionTitle, companyName, industry, context } = body

    // Dynamically import the SDK (backend only)
    const ZAIModule = await import('z-ai-web-dev-sdk')
    const ZAI = ZAIModule.default
    const zai = await ZAI.create()

    const pos = positionTitle || workbook.positionTitle
    const comp = companyName || workbook.companyName
    const ind = industry || 'umum'
    const ctx = context || ''

    // ---------- SECTION-SPECIFIC GENERATION ----------
    if (section === 'jobdesc') {
      const prompt = `Anda adalah konsultan HR ahli yang menyusun Buku Kerja Karyawan.
Buat Job Description lengkap untuk posisi "${pos}" di perusahaan "${comp}" (industri: ${ind}).
${ctx ? `Konteks tambahan: ${ctx}` : ''}

Kembalikan HANYA JSON valid (tanpa markdown, tanpa penjelasan) dengan struktur:
{
  "department": "unit/divisi",
  "reportsTo": "atasan langsung",
  "subordinates": "bawahan langsung (atau 'Tidak ada')",
  "purpose": "tujuan jabatan 1-2 kalimat",
  "authority": "5 butir wewenang, dipisah newline (\\n)",
  "responsibilities": "5 butir tanggung jawab, dipisah newline (\\n)"
}`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'Anda adalah konsultan HR ahli yang menghasilkan JSON valid saja.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })
      const content = completion.choices[0]?.message?.content || '{}'
      const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)

      return NextResponse.json({ section: 'jobdesc', data: parsed })
    }

    if (section === 'duties') {
      const prompt = `Anda adalah konsultan HR ahli. Buat pembagian tugas untuk posisi "${pos}" di "${comp}" (industri: ${ind}).

Kembalikan HANYA JSON valid:
{
  "dutiesPrimary": "tugas pokok 1 kalimat",
  "dutiesDaily": "tugas harian 1 kalimat",
  "dutiesWeekly": "tugas mingguan 1 kalimat",
  "dutiesMonthly": "tugas bulanan 1 kalimat"
}`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'Anda menghasilkan JSON valid saja, tanpa markdown.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })
      const content = completion.choices[0]?.message?.content || '{}'
      const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)

      return NextResponse.json({ section: 'duties', data: parsed })
    }

    if (section === 'kra') {
      const prompt = `Anda adalah konsultan HR ahli. Buat 8-10 Key Result Area (KRA) untuk posisi "${pos}" di "${comp}" (industri: ${ind}).
Setiap KRA punya: name, formula (cara ukur), target, unit.

Kembalikan HANYA JSON valid (array):
[
  { "name": "...", "formula": "...", "target": "...", "unit": "%" }
]`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'Anda menghasilkan JSON array valid saja, tanpa markdown.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })
      const content = completion.choices[0]?.message?.content || '[]'
      const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)

      return NextResponse.json({ section: 'kra', data: parsed })
    }

    if (section === 'processes') {
      const prompt = `Anda adalah konsultan BPMN ahli. Buat 4-6 proses bisnis penting untuk posisi "${pos}" di "${comp}" (industri: ${ind}).
Untuk setiap proses, buat: kode (P01, P02...), nama, deskripsi, input, output, totalSla, kategori, lanes (3-4 nama), steps (BPMN dengan type START/TASK/GATEWAY/END/CORRECTION, lane index, label, sla, order, branchLabel YA/TIDAK), sops (6 langkah dengan instruction, workInstruction, output), dan forms.

Gunakan standar BPMN 2.0: setiap gateway WAJIB punya dua arah (YA lanjut, TIDAK koreksi).

Kembalikan HANYA JSON valid (array of proses):
[
  {
    "code": "P01",
    "name": "...",
    "description": "...",
    "inputText": "...",
    "outputText": "...",
    "totalSla": "± X menit",
    "category": "Operations",
    "lanes": ["Role1", "Role2", "Role3"],
    "steps": [
      {"type":"START","lane":0,"label":"...","sla":"","order":1},
      {"type":"TASK","lane":0,"label":"...","sla":"X mnt","order":2},
      {"type":"GATEWAY","lane":0,"label":"...?","sla":"1 mnt","order":3,"branchLabel":"","yesTargetOrder":4,"noTargetOrder":8},
      {"type":"CORRECTION","lane":1,"label":"...","sla":"X mnt","order":8,"branchLabel":"TIDAK"},
      {"type":"END","lane":1,"label":"END","sla":"","order":9}
    ],
    "sops": [
      {"instruction":"...","workInstruction":"...","output":"..."}
    ],
    "forms": [
      {"label":"Item","standard":"Standar"}
    ]
  }
]`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'Anda menghasilkan JSON array valid saja, tanpa markdown atau penjelasan.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })
      const content = completion.choices[0]?.message?.content || '[]'
      const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)

      // Save processes to DB (replace existing)
      await db.workbookProcess.deleteMany({ where: { workbookId: id } })
      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i]
        await db.workbookProcess.create({
          data: {
            workbookId: id,
            code: p.code,
            name: p.name,
            description: p.description || '',
            inputText: p.inputText || '',
            outputText: p.outputText || '',
            totalSla: p.totalSla || '',
            category: p.category || '',
            lanesJson: JSON.stringify(p.lanes || []),
            stepsJson: JSON.stringify(p.steps || []),
            sopsJson: JSON.stringify(p.sops || []),
            formsJson: JSON.stringify(p.forms || []),
            order: i + 1,
          },
        })
      }

      return NextResponse.json({ section: 'processes', data: parsed, count: parsed.length })
    }

    // ---------- FULL GENERATION (all sections) ----------
    const prompt = `Anda adalah konsultan HR & BPMN ahli yang menyusun Buku Kerja Karyawan lengkap.
Buat Buku Kerja lengkap untuk posisi "${pos}" di perusahaan "${comp}" (industri: ${ind}).
${ctx ? `Konteks: ${ctx}` : ''}

Kembalikan HANYA JSON valid (tanpa markdown) dengan struktur:
{
  "title": "Buku Kerja Karyawan ${pos}",
  "department": "...",
  "reportsTo": "...",
  "subordinates": "...",
  "purpose": "tujuan jabatan",
  "authority": "5 butir wewenang dipisah \\n",
  "responsibilities": "5 butir tanggung jawab dipisah \\n",
  "dutiesPrimary": "...",
  "dutiesDaily": "...",
  "dutiesWeekly": "...",
  "dutiesMonthly": "...",
  "kras": [{"name":"...","formula":"...","target":"...","unit":"%"}],
  "processes": [
    {
      "code":"P01","name":"...","description":"...","inputText":"...","outputText":"...",
      "totalSla":"± X menit","category":"Operations",
      "lanes":["Role1","Role2"],
      "steps":[{"type":"START","lane":0,"label":"...","sla":"","order":1},{"type":"TASK","lane":0,"label":"...","sla":"X mnt","order":2},{"type":"GATEWAY","lane":0,"label":"...?","sla":"1 mnt","order":3,"yesTargetOrder":4,"noTargetOrder":7},{"type":"CORRECTION","lane":1,"label":"...","sla":"X mnt","order":7,"branchLabel":"TIDAK"},{"type":"END","lane":1,"label":"END","sla":"","order":8}],
      "sops":[{"instruction":"...","workInstruction":"...","output":"..."}],
      "forms":[{"label":"Item","standard":"Standar"}]
    }
  ]
}

Buat 4-6 proses. Setiap gateway WAJIB dua arah. SOP 5-7 langkah per proses.`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'Anda menghasilkan JSON valid lengkap saja, tanpa markdown atau teks lain.' },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    })
    const content = completion.choices[0]?.message?.content || '{}'
    const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    // Save everything to DB
    await db.workbook.update({
      where: { id },
      data: {
        title: parsed.title || `Buku Kerja ${pos}`,
        department: parsed.department || '',
        reportsTo: parsed.reportsTo || '',
        subordinates: parsed.subordinates || '',
        purpose: parsed.purpose || '',
        authority: parsed.authority || '',
        responsibilities: parsed.responsibilities || '',
        dutiesPrimary: parsed.dutiesPrimary || '',
        dutiesDaily: parsed.dutiesDaily || '',
        dutiesWeekly: parsed.dutiesWeekly || '',
        dutiesMonthly: parsed.dutiesMonthly || '',
        krasJson: JSON.stringify(parsed.kras || []),
        companyName: comp,
      },
    })

    if (parsed.processes && parsed.processes.length > 0) {
      await db.workbookProcess.deleteMany({ where: { workbookId: id } })
      for (let i = 0; i < parsed.processes.length; i++) {
        const p = parsed.processes[i]
        await db.workbookProcess.create({
          data: {
            workbookId: id,
            code: p.code,
            name: p.name,
            description: p.description || '',
            inputText: p.inputText || '',
            outputText: p.outputText || '',
            totalSla: p.totalSla || '',
            category: p.category || '',
            lanesJson: JSON.stringify(p.lanes || []),
            stepsJson: JSON.stringify(p.steps || []),
            sopsJson: JSON.stringify(p.sops || []),
            formsJson: JSON.stringify(p.forms || []),
            order: i + 1,
          },
        })
      }
    }

    return NextResponse.json({
      ok: true,
      section: 'full',
      processesCount: parsed.processes?.length || 0,
      krasCount: parsed.kras?.length || 0,
    })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: 'Gagal generate: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
