import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const kras = await db.kra.findMany({
      include: {
        position: { include: { department: true, employees: true } },
      },
      orderBy: [{ positionId: 'asc' }, { order: 'asc' }],
    })

    return NextResponse.json({ kras })
  } catch (error) {
    console.error('Get KRA error:', error)
    return NextResponse.json({ error: 'Gagal memuat data KRA' }, { status: 500 })
  }
}
