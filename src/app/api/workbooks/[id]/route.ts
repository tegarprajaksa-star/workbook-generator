import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const workbook = await db.workbook.findFirst({
      where: { id, userId: user.id },
      include: { processes: { orderBy: { order: 'asc' } } },
    })

    if (!workbook) {
      return NextResponse.json({ error: 'Workbook tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ workbook })
  } catch (error) {
    console.error('Get workbook error:', error)
    return NextResponse.json({ error: 'Gagal memuat workbook' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const existing = await db.workbook.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Workbook tidak ditemukan' }, { status: 404 })
    }

    const body = await req.json()
    const allowedFields = [
      'title', 'companyName', 'companyTagline', 'positionTitle', 'department',
      'reportsTo', 'subordinates', 'purpose', 'authority', 'responsibilities',
      'dutiesPrimary', 'dutiesDaily', 'dutiesWeekly', 'dutiesMonthly',
      'krasJson', 'status', 'accentColor',
    ]
    const data: Record<string, unknown> = {}
    for (const f of allowedFields) {
      if (f in body) data[f] = body[f]
    }

    const workbook = await db.workbook.update({
      where: { id },
      data,
    })

    return NextResponse.json({ workbook })
  } catch (error) {
    console.error('Update workbook error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui workbook' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const existing = await db.workbook.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Workbook tidak ditemukan' }, { status: 404 })
    }

    await db.workbook.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete workbook error:', error)
    return NextResponse.json({ error: 'Gagal menghapus workbook' }, { status: 500 })
  }
}
