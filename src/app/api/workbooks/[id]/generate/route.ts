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

async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('AI belum dikonfigurasi. Hubungi administrator untuk set API key.')
  }

  const seed = Math.floor(Math.random() * 1000000)
  const sys = systemPrompt || `Anda adalah Senior Business Process Consultant bersertifikasi BPMN 2.0 dengan pengalaman 20 tahun di berbagai industri (F&B, retail, healthcare, manufacturing, service, tech). Anda ahli dalam:
- Business Process Modeling (BPMN 2.0)
- Standard Operating Procedures (SOP)
- Work Instructions (WI)
- Risk Assessment & Mitigation
- Key Result Areas (KRA)

ATURAN MUTLAK:
1. Setiap generate HARUS menghasilkan konten UNIK — JANGAN ulang struktur yang sama
2. Aktivitas BPMN harus KONKRIT dan spesifik untuk posisi tersebut (bukan "lakukan tugas")
3. Setiap proses HARUS punya minimal 5-7 SOP steps (JANGAN kurang dari 5!)
4. Gateway correction WAJIB lintas lane (beda peran yang menangani)
5. Gunakan istilah teknis industri yang sesuai
6. Prediksi risiko nyata yang bisa terjadi di posisi tersebut
7. Random seed ${seed} — pastikan variasi maksimal

ATURAN BAHASA INDONESIA (SANGAT PENTING):
- Gunakan tata bahasa Indonesia yang BENAR dan NATURAL
- Pertanyaan gateway HARUS diawali dengan "Apakah..." atau langsung kata tanya
- Contoh BENAR: "Apakah keluhan dapat diselesaikan?", "Apakah stok mencukupi?", "Apakah dokumen valid?"
- Contoh SALAH (terbalik): "diselesaikan dapat apakah keluhan?", "mencukupi apakah stok?"
- Struktur kalimat: Subjek + Predikat + Objek (S-P-O), bukan terbalik
- Hindari kata-kata robotik, gunakan bahasa natural seperti percakapan profesional

Kembalikan HANYA JSON valid, tanpa markdown.`

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: prompt },
      ],
      temperature: 0.95,
      max_tokens: 8000,
      top_p: 0.9,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('Groq API error:', response.status, errText)
    if (response.status === 429) throw new Error('Limit AI tercapai. Coba lagi beberapa menit lagi.')
    if (response.status === 401) throw new Error('API key tidak valid. Hubungi administrator.')
    throw new Error('AI error: ' + response.status)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('AI tidak memberikan respons. Coba lagi.')
  return text
}

function extractJSON(text: string): unknown {
  let cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
  const firstBrace = cleaned.search(/[{[]/)
  const lastBrace = cleaned.lastIndexOf('}') > cleaned.lastIndexOf(']') ? cleaned.lastIndexOf('}') : cleaned.lastIndexOf(']')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }
  return JSON.parse(cleaned)
}

// Auto-fix: ensure gateway corrections cross lanes + ensure 5+ SOPs
function autoFixProcess(p: Record<string, unknown>): Record<string, unknown> {
  const lanes = (p.lanes as string[]) || []
  const steps = (p.steps as Array<Record<string, unknown>>) || []

  // Fix gateway corrections to cross lanes
  if (lanes.length >= 2) {
    const gateways = steps.filter(s => s.type === 'GATEWAY')
    for (const gw of gateways) {
      const gwLane = Number(gw.lane)
      const noTarget = Number(gw.noTargetOrder)
      const correction = steps.find(s => Number(s.order) === noTarget)
      if (correction && Number(correction.lane) === gwLane) {
        correction.lane = (gwLane + 1) % lanes.length
      }
    }
  }

  // Ensure at least 5 SOPs — if less, generate generic fillers
  const sops = (p.sops as Array<Record<string, string>>) || []
  const processName = String(p.name || 'proses')
  while (sops.length < 5) {
    const idx = sops.length + 1
    sops.push({
      instruction: `Langkah ${idx}: Verifikasi hasil langkah sebelumnya`,
      workInstruction: `Pastikan output dari langkah sebelumnya sesuai standar. Jika ada deviasi, catat dan laporkan ke supervisor. Dokumentasikan dalam log aktivitas.`,
      output: `Verifikasi tercatat`,
    })
  }
  p.sops = sops
  p.steps = steps
  return p
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
    if (!workbook) return NextResponse.json({ error: 'Workbook tidak ditemukan' }, { status: 404 })

    const body = await req.json()
    const { section, positionTitle, companyName, industry, context } = body

    const pos = positionTitle || workbook.positionTitle
    const comp = companyName || workbook.companyName
    const ind = industry || 'umum'
    const ctx = context || ''

    // ---------- JOB DESC ----------
    if (section === 'jobdesc') {
      const prompt = `Sebagai konsultan HR, analisis posisi "${pos}" di perusahaan "${comp}" (industri: ${ind}).

Pertama, identifikasi 3 RISIKO UTAMA yang bisa terjadi jika posisi ini tidak dijalankan dengan baik.
Kedua, buat Job Description yang mengatasi risiko tersebut.

Kembalikan JSON:
{
  "department": "spesifik untuk industri ${ind}",
  "reportsTo": "atasan langsung yang realistis",
  "subordinates": "bawahan atau 'Tidak ada'",
  "purpose": "tujuan jabatan 1-2 kalimat yang spesifik",
  "authority": "5 wewenang konkret (dipisah \\n) — pikirkan keputusan yang sering dihadapi",
  "responsibilities": "5 tanggung jawab (dipisah \\n) — fokus pada area berisiko tinggi"
}`

      const content = await callAI(prompt)
      const parsed = extractJSON(content) as Record<string, string>
      return NextResponse.json({ section: 'jobdesc', data: parsed })
    }

    // ---------- DUTIES ----------
    if (section === 'duties') {
      const prompt = `Untuk posisi "${pos}" di industri ${ind}, buat pembagian tugas yang SPESIFIK.

Pikirkan: apa yang dilakukan orang ini di jam pertama kerja? Apa yang dilakukan di akhir minggu? Apa evaluasi bulanan?

JSON:
{
  "dutiesPrimary": "ringkasan 1 kalimat tugas inti",
  "dutiesDaily": "3-4 aktivitas harian konkret (dalam 1 kalimat)",
  "dutiesWeekly": "2-3 aktivitas mingguan konkret",
  "dutiesMonthly": "2-3 aktivitas bulanan konkret"
}`

      const content = await callAI(prompt)
      const parsed = extractJSON(content) as Record<string, string>
      return NextResponse.json({ section: 'duties', data: parsed })
    }

    // ---------- KRA ----------
    if (section === 'kra') {
      const prompt = `Buat 8-10 KRA untuk "${pos}" di industri ${ind}.

Setiap KRA harus:
- Spesifik untuk tugas nyata posisi ini (bukan generic "akurasi")
- Measurable (bisa diukur dengan angka)
- Mencakup: kualitas, kecepatan, kepatuhan, kepuasan, efisiensi

Contoh KRA yang BURUK (jangan buat): "Akurasi", "Kualitas", "Kepatuhan"
Contoh KRA yang BAIK: "Akurasi input data transaksi", "Waktu respon keluhan pelanggan"

JSON array:
[{"name":"spesifik","formula":"cara ukur","target":"angka","unit":"%"}]`

      const content = await callAI(prompt)
      const parsed = extractJSON(content) as Array<{ name: string; formula: string; target: string; unit: string }>
      return NextResponse.json({ section: 'kra', data: parsed })
    }

    // ---------- PROCESSES ----------
    if (section === 'processes') {
      const prompt = `Anda adalah expert BPMN consultant. Buat 4-6 PROSES BISNIS untuk posisi "${pos}" di "${comp}" (industri: ${ind}).

LANGKAH BERPIKIR (lakukan sebelum generate):
1. Apa saja aktivitas UTAMA yang dilakukan "${pos}" setiap hari?
2. Di mana titik-titik RISIKO di setiap aktivitas? (error, delay, kehilangan, salah)
3. Siapa yang terlibat selain "${pos}"? (supervisor, customer, departemen lain)
4. Apa konsekuensi jika terjadi error di tiap titik risiko?
5. Bagaimana alur eskalasi jika terjadi masalah?

Berdasarkan analisis di atas, buat proses bisnis yang:
- Setiap proses fokus pada 1 area kerja yang BERBEDA (jangan overlap)
- Setiap proses punya NAMA spesifik dan deskriptif
- Gateway muncul di TITIK RISIKO (bukan random) — di mana decision penting harus dibuat
- Correction branch = eskalasi ke peran lain (lintas lane WAJIB)
- Setiap proses MINIMAL 5 SOP steps (HARUS 5-7, jangan kurang!)
- SOP harus berisi langkah TEKNIS KONKRIT (apa yang dilakukan, bagaimana, dengan alat apa)

CONTOH PROSES YANG BAGUS:
- P01: "Penerimaan dan Pemeriksaan Barang" → gateway: "Apakah barang sesuai spesifikasi?" → TIDAK: eskalasi ke supervisor quality (lane beda)
- P02: "Penanganan Komplain Pelanggan" → gateway: "Apakah komplain bisa diselesaikan di level frontliner?" → TIDAK: eskalasi ke manager (lane beda)
- P03: "Prosedur Closing Kas Harian" → linear, tanpa gateway (tidak semua proses perlu gateway)
- P04: "Maintenance Pencegahan Alat" → gateway: "Apakah alat perlu perbaikan?" → TIDAK: jadwalkan service teknisi (lane beda)

ATURAN GATEWAY:
- GATEWAY di lane X → YA: lanjut di lane X | TIDAK: CORRECTION di lane Y (Y ≠ X)
- Minimum 3 dari proses harus punya gateway
- Sisanya boleh linear

JSON array:
[
  {
    "code":"P01",
    "name":"nama spesifik (bukan 'Proses 1')",
    "description":"1-2 kalimat",
    "inputText":"pemicu",
    "outputText":"hasil akhir",
    "totalSla":"± X menit",
    "category":"Operations/Service/Quality/Admin",
    "lanes":["Peran1","Peran2","Peran3"],
    "steps":[
      {"type":"START","lane":0,"label":"pemicu konkret","sla":"","order":1},
      {"type":"TASK","lane":0,"label":"aktivitas konkret","sla":"X mnt","order":2},
      {"type":"GATEWAY","lane":0,"label":"pertanyaan risiko?","sla":"1 mnt","order":3,"branchLabel":"","yesTargetOrder":4,"noTargetOrder":7},
      {"type":"TASK","lane":0,"label":"aktivitas YA","sla":"X mnt","order":4,"branchLabel":"YA"},
      {"type":"END","lane":0,"label":"END","sla":"","order":5},
      {"type":"CORRECTION","lane":1,"label":"eskalasi ke peran lain","sla":"X mnt","order":7,"branchLabel":"TIDAK"},
      {"type":"END","lane":1,"label":"END","sla":"","order":8}
    ],
    "sops":[
      {"instruction":"langkah konkret 1","workInstruction":"detail teknis","output":"hasil"},
      {"instruction":"langkah konkret 2","workInstruction":"detail teknis","output":"hasil"},
      {"instruction":"langkah konkret 3","workInstruction":"detail teknis","output":"hasil"},
      {"instruction":"langkah konkret 4","workInstruction":"detail teknis","output":"hasil"},
      {"instruction":"langkah konkret 5","workInstruction":"detail teknis","output":"hasil"}
    ],
    "forms":[{"label":"field","standard":"standar"}]
  }
]`

      const content = await callAI(prompt)
      let parsed = extractJSON(content) as Array<Record<string, unknown>>

      // Auto-fix: cross-lane corrections + ensure 5+ SOPs
      parsed = parsed.map(p => autoFixProcess(p))

      // Save to DB
      await db.workbookProcess.deleteMany({ where: { workbookId: id } })
      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i]
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
    const prompt = `Buat Buku Kerja Karyawan LENGKAP untuk "${pos}" di "${comp}" (industri: ${ind}).
${ctx ? `Konteks: ${ctx}` : ''}

ANALISIS RISIKO (lakukan dulu sebelum generate):
- Identifikasi 5 risiko utama yang bisa terjadi di posisi "${pos}"
- Buat Job Desc, KRA, dan Proses yang mengatasi risiko tersebut
- Setiap gateway di BPMN harus berada di titik risiko (bukan random)

STRUKTUR LENGKAP:

1. JOB DESCRIPTION:
- Wewenang: 5 keputusan konkret yang sering dihadapi "${pos}"
- Tanggung jawab: 5 area yang berisiko tinggi jika tidak dilakukan

2. KRA (8-10): Spesifik & measurable untuk "${pos}"

3. PROSES BISNIS (4-6):
- Setiap proses fokus pada area kerja BERBEDA
- Gateway di titik risiko → correction lintas lane (eskalasi)
- MINIMAL 5 SOP per proses (HARUS 5-7!)
- SOP teknis konkret (apa, bagaimana, dengan apa)
- Variasikan: beberapa linear, beberapa dengan gateway

JSON:
{
  "title":"Buku Kerja Karyawan ${pos}",
  "department":"...",
  "reportsTo":"...",
  "subordinates":"...",
  "purpose":"...",
  "authority":"5 butir \\n",
  "responsibilities":"5 butir \\n",
  "dutiesPrimary":"...",
  "dutiesDaily":"...",
  "dutiesWeekly":"...",
  "dutiesMonthly":"...",
  "kras":[{"name":"...","formula":"...","target":"...","unit":"%"}],
  "processes":[
    {
      "code":"P01","name":"spesifik","description":"...","inputText":"...","outputText":"...",
      "totalSla":"± X menit","category":"...",
      "lanes":["Peran1","Peran2"],
      "steps":[{"type":"START","lane":0,"label":"...","sla":"","order":1},{"type":"TASK","lane":0,"label":"...","sla":"X mnt","order":2},{"type":"GATEWAY","lane":0,"label":"risiko?","sla":"1 mnt","order":3,"yesTargetOrder":4,"noTargetOrder":7},{"type":"CORRECTION","lane":1,"label":"eskalasi","sla":"X mnt","order":7,"branchLabel":"TIDAK"},{"type":"END","lane":1,"label":"END","sla":"","order":8}],
      "sops":[
        {"instruction":"...","workInstruction":"...","output":"..."},
        {"instruction":"...","workInstruction":"...","output":"..."},
        {"instruction":"...","workInstruction":"...","output":"..."},
        {"instruction":"...","workInstruction":"...","output":"..."},
        {"instruction":"...","workInstruction":"...","output":"..."}
      ],
      "forms":[{"label":"...","standard":"..."}]
    }
  ]
}`

    const content = await callAI(prompt)
    const parsed = extractJSON(content) as Record<string, unknown>

    // Auto-fix processes
    if (parsed.processes && Array.isArray(parsed.processes)) {
      parsed.processes = (parsed.processes as Array<Record<string, unknown>>).map(p => autoFixProcess(p))
    }

    // Save to DB
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
      const procs = parsed.processes as Array<Record<string, unknown>>
      for (let i = 0; i < procs.length; i++) {
        const p = procs[i]
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
      processesCount: Array.isArray(parsed.processes) ? (parsed.processes as unknown[]).length : 0,
      krasCount: Array.isArray(parsed.kras) ? (parsed.kras as unknown[]).length : 0,
    })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: 'Gagal generate: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
