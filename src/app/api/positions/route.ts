import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const positions = await db.position.findMany({
      include: {
        department: true,
        reportsTo: true,
        subordinates: true,
        employees: true,
        kras: { orderBy: { order: 'asc' } },
        _count: { select: { processSteps: true } },
      },
      orderBy: { title: 'asc' },
    })

    return NextResponse.json({ positions })
  } catch (error) {
    console.error('Get positions error:', error)
    return NextResponse.json({ error: 'Gagal memuat data jabatan' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role === 'STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { title, departmentId, reportsToId, purpose, authority, responsibilities, dutiesPrimary, dutiesDaily, dutiesWeekly, dutiesMonthly, color } = body

    if (!title || !departmentId) {
      return NextResponse.json({ error: 'Title dan department wajib diisi' }, { status: 400 })
    }

    const position = await db.position.create({
      data: {
        title,
        departmentId,
        reportsToId: reportsToId || null,
        purpose,
        authority,
        responsibilities,
        dutiesPrimary,
        dutiesDaily,
        dutiesWeekly,
        dutiesMonthly,
        color: color || '#f59e0b',
      },
      include: { department: true, reportsTo: true },
    })

    return NextResponse.json({ position })
  } catch (error) {
    console.error('Create position error:', error)
    return NextResponse.json({ error: 'Gagal membuat jabatan' }, { status: 500 })
  }
}
