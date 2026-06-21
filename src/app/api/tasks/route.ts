import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const assignedToId = searchParams.get('assignedToId')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (assignedToId) where.assignedToId = assignedToId

    const tasks = await db.task.findMany({
      where,
      include: {
        assignedTo: { include: { position: true } },
        process: { select: { id: true, code: true, name: true } },
        logs: {
          include: { user: { select: { name: true } }, employee: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json({ error: 'Gagal memuat data tugas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { title, description, processId, assignedToId, positionId, priority, dueDate } = body

    if (!title || !assignedToId) {
      return NextResponse.json({ error: 'Title dan penanggung jawab wajib diisi' }, { status: 400 })
    }

    const task = await db.task.create({
      data: {
        title,
        description,
        processId: processId || null,
        assignedToId,
        positionId: positionId || null,
        status: 'PENDING',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: user.id,
        logs: {
          create: {
            userId: user.id,
            action: 'CREATED',
            note: `Task dibuat oleh ${user.name}`,
          },
        },
      },
      include: {
        assignedTo: { include: { position: true } },
        process: true,
      },
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json({ error: 'Gagal membuat tugas' }, { status: 500 })
  }
}
