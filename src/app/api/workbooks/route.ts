import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const workbooks = await db.workbook.findMany({
      where: { userId: user.id },
      include: { _count: { select: { processes: true } } },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ workbooks })
  } catch (error) {
    console.error('Get workbooks error:', error)
    return NextResponse.json({ error: 'Gagal memuat workbook' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      title, companyName, companyTagline, positionTitle, department,
      reportsTo, subordinates, purpose, authority, responsibilities,
      dutiesPrimary, dutiesDaily, dutiesWeekly, dutiesMonthly,
      krasJson, accentColor,
    } = body

    if (!positionTitle) {
      return NextResponse.json({ error: 'Position title wajib diisi' }, { status: 400 })
    }

    const workbook = await db.workbook.create({
      data: {
        userId: user.id,
        title: title || `Buku Kerja ${positionTitle}`,
        companyName: companyName || '',
        companyTagline: companyTagline || 'Employee Workbook',
        positionTitle,
        department: department || '',
        reportsTo: reportsTo || '',
        subordinates: subordinates || '',
        purpose: purpose || '',
        authority: authority || '',
        responsibilities: responsibilities || '',
        dutiesPrimary: dutiesPrimary || '',
        dutiesDaily: dutiesDaily || '',
        dutiesWeekly: dutiesWeekly || '',
        dutiesMonthly: dutiesMonthly || '',
        krasJson: krasJson || '[]',
        accentColor: accentColor || '#b45309',
        status: 'DRAFT',
      },
    })

    return NextResponse.json({ workbook })
  } catch (error) {
    console.error('Create workbook error:', error)
    return NextResponse.json({ error: 'Gagal membuat workbook' }, { status: 500 })
  }
}
