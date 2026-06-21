import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const departments = await db.department.findMany({
      include: {
        positions: {
          include: {
            employees: true,
            _count: { select: { kras: true, processSteps: true } },
          },
          orderBy: { title: 'asc' },
        },
        _count: { select: { positions: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ departments })
  } catch (error) {
    console.error('Get departments error:', error)
    return NextResponse.json({ error: 'Gagal memuat data departemen' }, { status: 500 })
  }
}
