import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const processes = await db.process.findMany({
      include: {
        lanes: { orderBy: { order: 'asc' } },
        steps: {
          orderBy: { order: 'asc' },
          include: { lane: true, position: true },
        },
        sops: { orderBy: { order: 'asc' } },
        forms: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { code: 'asc' },
    })

    return NextResponse.json({ processes })
  } catch (error) {
    console.error('Get processes error:', error)
    return NextResponse.json({ error: 'Gagal memuat data proses' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role === 'STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { code, name, description, inputText, outputText, totalSla, category } = body

    if (!code || !name) {
      return NextResponse.json({ error: 'Code dan name wajib diisi' }, { status: 400 })
    }

    const existing = await db.process.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: 'Kode proses sudah ada' }, { status: 400 })
    }

    const process = await db.process.create({
      data: {
        code, name, description, inputText, outputText, totalSla, category,
        status: 'ACTIVE',
      },
      include: { lanes: true, sops: true },
    })

    return NextResponse.json({ process })
  } catch (error) {
    console.error('Create process error:', error)
    return NextResponse.json({ error: 'Gagal membuat proses' }, { status: 500 })
  }
}
