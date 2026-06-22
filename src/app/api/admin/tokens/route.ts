import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

// GET — list all tokens
export async function GET() {
  try {
    const user = await requireAdmin()
    const tokens = await db.registrationToken.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { name: true } },
      },
    })
    return NextResponse.json({ tokens })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
    console.error('Admin list tokens error:', error)
    return NextResponse.json({ error: 'Gagal memuat token' }, { status: 500 })
  }
}

// POST — generate new token(s)
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const body = await req.json()
    const { count = 1, note = '' } = body

    const tokensToCreate = Math.min(Math.max(parseInt(count) || 1, 1), 50)
    const created = []

    for (let i = 0; i < tokensToCreate; i++) {
      const token = 'WB-' + randomBytes(8).toString('hex').toUpperCase()
      const record = await db.registrationToken.create({
        data: {
          token,
          note: note || '',
          createdById: user.id,
        },
      })
      created.push(record)
    }

    return NextResponse.json({ tokens: created, count: created.length })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
    console.error('Admin create token error:', error)
    return NextResponse.json({ error: 'Gagal membuat token' }, { status: 500 })
  }
}

// PATCH — toggle token active/inactive
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { id, isActive } = body

    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'ID dan isActive wajib diisi' }, { status: 400 })
    }

    const updated = await db.registrationToken.update({
      where: { id },
      data: { isActive },
    })

    return NextResponse.json({ token: updated })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
    console.error('Admin toggle token error:', error)
    return NextResponse.json({ error: 'Gagal mengubah token' }, { status: 500 })
  }
}
