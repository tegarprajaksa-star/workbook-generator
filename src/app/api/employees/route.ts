import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const employees = await db.employee.findMany({
      include: {
        position: { include: { department: true, reportsTo: true } },
        _count: {
          select: {
            tasks: { where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ employees })
  } catch (error) {
    console.error('Get employees error:', error)
    return NextResponse.json({ error: 'Gagal memuat data karyawan' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role === 'STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, email, phone, positionId, status } = body

    if (!name || !email || !positionId) {
      return NextResponse.json({ error: 'Nama, email, dan jabatan wajib diisi' }, { status: 400 })
    }

    const existing = await db.employee.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
    }

    const employee = await db.employee.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        phone,
        positionId,
        status: status || 'ACTIVE',
      },
      include: { position: { include: { department: true } } },
    })

    return NextResponse.json({ employee })
  } catch (error) {
    console.error('Create employee error:', error)
    return NextResponse.json({ error: 'Gagal membuat karyawan' }, { status: 500 })
  }
}
