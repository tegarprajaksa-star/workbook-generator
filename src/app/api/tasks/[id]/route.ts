import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Update task status (the "autopilot" flow controller)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { status, note } = body

    const { pathname } = new URL(req.url)
    const id = pathname.split('/').pop()

    if (!id || !status) {
      return NextResponse.json({ error: 'ID dan status wajib diisi' }, { status: 400 })
    }

    const task = await db.task.findUnique({
      where: { id },
      include: { process: { include: { steps: { orderBy: { order: 'asc' } } } } },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task tidak ditemukan' }, { status: 404 })
    }

    const actionMap: Record<string, string> = {
      IN_PROGRESS: 'STARTED',
      DONE: 'COMPLETED',
      BLOCKED: 'BLOCKED',
      PENDING: 'REOPENED',
      CANCELLED: 'CANCELLED',
    }

    const updated = await db.task.update({
      where: { id },
      data: {
        status,
        logs: {
          create: {
            userId: user.id,
            employeeId: task.assignedToId,
            action: actionMap[status] || 'UPDATED',
            note: note || `Status diubah ke ${status}`,
          },
        },
      },
      include: {
        assignedTo: { include: { position: true } },
        process: true,
        logs: {
          include: { user: { select: { name: true } }, employee: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    return NextResponse.json({ task: updated })
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui tugas' }, { status: 500 })
  }
}

// Delete task
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role === 'STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { pathname } = new URL(req.url)
    const id = pathname.split('/').pop()

    if (!id) {
      return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })
    }

    await db.task.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json({ error: 'Gagal menghapus tugas' }, { status: 500 })
  }
}
