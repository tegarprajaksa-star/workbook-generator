import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// AI-powered workbook generation using Groq (FREE, fast, supports all regions)
// Model: Llama 3.3 70B — free tier, 30 req/min, 14400 req/day
// Requires GROQ_API_KEY environment variable

const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

async function callAI(prompt: string): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('AI belum dikonfigurasi. Hubungi administrator untuk set API key.')
  }

  // Random seed untuk variasi output setiap generate
  const seed = Math.floor(Math.random() * 1000000)

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: `Anda adalah konsultan HR & BPMN ahli berpengalaman 15 tahun. Anda ahli dalam menyusun Buku Kerja Karyawan, SOP, BPMN 2.0, dan KRA untuk berbagai industri.

PENTING:
- Setiap generate HARUS menghasilkan konten yang UNIK dan SPESIFIK untuk posisi & industri yang diminta
- JANGAN gunakan template generic — buat proses bisnis yang benar-benar relevan dengan pekerjaan harian posisi tersebut
- Gunakan istilah teknis yang sesuai industri (bukan istilah umum)
- Setiap proses harus punya nama yang spesifik dan deskriptif (bukan "Proses 1", "Proses 2")
- Steps BPMN harus detail dengan aktivitas yang realistis untuk posisi tersebut
- SOP/WI harus berisi langkah teknis konkret, bukan generik
- KRA harus spesifik dan measurable untuk posisi tersebut
- Variasikan struktur proses: tidak semua proses punya gateway, beberapa bisa linear
- Random creativity seed: ${seed}

Selalu kembalikan JSON valid saja, tanpa markdown atau teks lain.` },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9, // higher = more creative/varied
      max_tokens: 8000,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('Groq API error:', response.status, errText)
    if (response.status === 429) {
      throw new Error('Limit AI tercapai. Coba lagi beberapa menit lagi.')
    }
    if (response.status === 401) {
      throw new Error('API key tidak valid. Hubungi administrator.')
    }
    throw new Error('AI error: ' + response.status)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('AI tidak memberikan respons. Coba lagi.')
  return text
}

function extractJSON(text: string): unknown {
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
  // Find the first { or [ and last } or ]
  const firstBrace = cleaned.search(/[{[]/)
  const lastBrace = cleaned.lastIndexOf('}') > cleaned.lastIndexOf(']') ? cleaned.lastIndexOf('}') : cleaned.lastIndexOf(']')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }
  return JSON.parse(cleaned)
}

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

      const content = await callAI(prompt)
      const parsed = extractJSON(content) as Record<string, string>
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

      const content = await callAI(prompt)
      const parsed = extractJSON(content) as Record<string, string>
      return NextResponse.json({ section: 'duties', data: parsed })
    }

    if (section === 'kra') {
      const prompt = `Anda adalah konsultan HR ahli. Buat 8-10 Key Result Area (KRA) untuk posisi "${pos}" di "${comp}" (industri: ${ind}).
Setiap KRA punya: name, formula (cara ukur), target, unit.

Kembalikan HANYA JSON valid (array):
[
  { "name": "...", "formula": "...", "target": "...", "unit": "%" }
]`

      const content = await callAI(prompt)
      const parsed = extractJSON(content) as Array<{ name: string; formula: string; target: string; unit: string }>
      return NextResponse.json({ section: 'kra', data: parsed })
    }

    if (section === 'processes') {
      const prompt = `Buat 4-6 PROSES BISNIS yang SPESIFIK dan UNIK untuk posisi "${pos}" di perusahaan "${comp}" (industri: ${ind}).

PENTING — buat proses yang BENAR-BENAR relevan dengan pekerjaan harian "${pos}", bukan template generic!

Contoh pendekatan (JANGAN copy — buat yang sesuai posisi "${pos}"):
- Proses yang berkaitan dengan awal/menutup shift kerja
- Proses penanganan transaksi/layanan utama
- Proses penanganan masalah/komplain/exception
- Proses pelaporan/kontrol kualitas/audit
- Proses koordinasi dengan departemen lain
- Proses maintenance/perawatan/stock

Setiap proses HARUS:
1. Punya NAMA spesifik (bukan "Proses 1") — contoh: "Penanganan Pesanan Online", "Prosedur Closing Harian", dll
2. Punya lanes (peran terlibat) yang realistis untuk posisi "${pos}"
3. Steps BPMN dengan aktivitas KONKRIT yang dilakukan "${pos}" di lapangan
4. SOP dengan instruksi teknis detail (bukan generik seperti "lakukan tugas")
5. SLA yang realistis
6. Variasikan: beberapa proses linear, beberapa dengan gateway (decision point), beberapa dengan correction branch

Total 4-6 proses. Gunakan kode P01, P02, dst.

JSON format:
[
  {
    "code": "P01",
    "name": "nama proses spesifik",
    "description": "deskripsi 1-2 kalimat",
    "inputText": "apa yang memicu proses ini",
    "outputText": "apa hasil akhir proses",
    "totalSla": "± X menit",
    "category": "Operations/Service/Quality/Admin",
    "lanes": ["Peran1", "Peran2"],
    "steps": [
      {"type":"START","lane":0,"label":"pemicu","sla":"","order":1},
      {"type":"TASK","lane":0,"label":"aktivitas konkret","sla":"X mnt","order":2},
      {"type":"GATEWAY","lane":0,"label":"pertanyaan konkret?","sla":"1 mnt","order":3,"branchLabel":"","yesTargetOrder":4,"noTargetOrder":8},
      {"type":"CORRECTION","lane":1,"label":"aksi koreksi spesifik","sla":"X mnt","order":8,"branchLabel":"TIDAK"},
      {"type":"END","lane":1,"label":"END","sla":"","order":9}
    ],
    "sops": [
      {"instruction":"langkah konkret","workInstruction":"detail teknis cara melakukannya","output":"hasil/bukti"}
    ],
    "forms": [
      {"label":"field","standard":"standar"}
    ]
  }
]`

      const content = await callAI(prompt)
      const parsed = extractJSON(content) as Array<Record<string, unknown>>

      // Save processes to DB
      await db.workbookProcess.deleteMany({ where: { workbookId: id } })
      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i] as Record<string, unknown>
        await db.workbookProcess.create({
          data: {
            workbookId: id,
            code: String(p.code || `P${i + 1}`),
            name: String(p.name || ''),
            description: String(p.description || ''),
            inputText: String(p.inputText || ''),
            outputText: String(p.outputText || ''),
            totalSla: String(p.totalSla || ''),
            category: String(p.category || ''),
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

    // ---------- FULL GENERATION ----------
    const prompt = `Buat Buku Kerja Karyawan LENGKAP untuk posisi "${pos}" di perusahaan "${comp}" (industri: ${ind}).
${ctx ? `Konteks tambahan: ${ctx}` : ''}

Buat konten yang SPESIFIK dan UNIK untuk posisi "${pos}" — bukan template generic!

STRUKTUR YANG DIBUTUHKAN:

1. JOB DESCRIPTION:
- Department, reportsTo, subordinates yang sesuai industri ${ind}
- Purpose yang spesifik untuk "${pos}"
- 5 wewenang konkret (bukan generic)
- 5 tanggung jawab konkret yang dilakukan "${pos}" sehari-hari

2. TUGAS:
- Pokok: ringkasan 1 kalimat tugas utama
- Harian/Mingguan/Bulanan: spesifik untuk "${pos}"

3. KRA (8-10):
- Buat indikator yang MEASURABLE dan spesifik untuk "${pos}"
- Bukan generic seperti "akurasi" — buat "akurasi pencatatan transaksi" dll

4. PROSES BISNIS (4-6):
- Buat proses yang BENAR-BENAR relevan dengan pekerjaan harian "${pos}"
- Contoh area: opening/closing shift, transaksi utama, penanganan masalah, quality control, koordinasi tim, maintenance
- Setiap proses punya NAMA spesifik (bukan "Proses 1")
- Variasikan: beberapa linear, beberapa dengan gateway + correction
- SOP dengan instruksi teknis konkret
- Lanes yang realistis untuk posisi "${pos}"

JSON format:
{
  "title": "Buku Kerja Karyawan ${pos}",
  "department": "...",
  "reportsTo": "...",
  "subordinates": "...",
  "purpose": "...",
  "authority": "5 butir dipisah \\n",
  "responsibilities": "5 butir dipisah \\n",
  "dutiesPrimary": "...",
  "dutiesDaily": "...",
  "dutiesWeekly": "...",
  "dutiesMonthly": "...",
  "kras": [{"name":"...","formula":"...","target":"...","unit":"%"}],
  "processes": [
    {
      "code":"P01","name":"nama spesifik","description":"...","inputText":"...","outputText":"...",
      "totalSla":"± X menit","category":"Operations/Service/Quality",
      "lanes":["Peran1","Peran2"],
      "steps":[{"type":"START","lane":0,"label":"...","sla":"","order":1},{"type":"TASK","lane":0,"label":"aktivitas konkret","sla":"X mnt","order":2},{"type":"GATEWAY","lane":0,"label":"pertanyaan konkret?","sla":"1 mnt","order":3,"yesTargetOrder":4,"noTargetOrder":7},{"type":"CORRECTION","lane":1,"label":"koreksi spesifik","sla":"X mnt","order":7,"branchLabel":"TIDAK"},{"type":"END","lane":1,"label":"END","sla":"","order":8}],
      "sops":[{"instruction":"langkah konkret","workInstruction":"detail teknis","output":"hasil/bukti"}],
      "forms":[{"label":"field","standard":"standar"}]
    }
  ]
}

Buat 4-6 proses. Setiap gateway WAJIB dua arah. SOP 5-7 langkah per proses.`

    const content = await callAI(prompt)
    const parsed = extractJSON(content) as Record<string, unknown>

    // Save everything to DB
    await db.workbook.update({
      where: { id },
      data: {
        title: String(parsed.title || `Buku Kerja ${pos}`),
        department: String(parsed.department || ''),
        reportsTo: String(parsed.reportsTo || ''),
        subordinates: String(parsed.subordinates || ''),
        purpose: String(parsed.purpose || ''),
        authority: String(parsed.authority || ''),
        responsibilities: String(parsed.responsibilities || ''),
        dutiesPrimary: String(parsed.dutiesPrimary || ''),
        dutiesDaily: String(parsed.dutiesDaily || ''),
        dutiesWeekly: String(parsed.dutiesWeekly || ''),
        dutiesMonthly: String(parsed.dutiesMonthly || ''),
        krasJson: JSON.stringify(parsed.kras || []),
        companyName: comp,
      },
    })

    if (parsed.processes && Array.isArray(parsed.processes)) {
      await db.workbookProcess.deleteMany({ where: { workbookId: id } })
      for (let i = 0; i < parsed.processes.length; i++) {
        const p = parsed.processes[i] as Record<string, unknown>
        await db.workbookProcess.create({
          data: {
            workbookId: id,
            code: String(p.code || `P${i + 1}`),
            name: String(p.name || ''),
            description: String(p.description || ''),
            inputText: String(p.inputText || ''),
            outputText: String(p.outputText || ''),
            totalSla: String(p.totalSla || ''),
            category: String(p.category || ''),
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
      processesCount: Array.isArray(parsed.processes) ? parsed.processes.length : 0,
      krasCount: Array.isArray(parsed.kras) ? parsed.kras.length : 0,
    })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: 'Gagal generate: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
