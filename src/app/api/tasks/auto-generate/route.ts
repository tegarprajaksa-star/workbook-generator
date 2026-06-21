import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Auto-generate tasks from a process definition (start a workflow instance)
// This is the "autopilot" feature — given a process, create tasks for each step
// and assign them to the right role/employee automatically.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { processId, dueDate } = body

    if (!processId) {
      return NextResponse.json({ error: 'Process ID wajib diisi' }, { status: 400 })
    }

    const process = await db.process.findUnique({
      where: { id: processId },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: { position: { include: { employees: true } }, lane: true },
        },
      },
    })

    if (!process) {
      return NextResponse.json({ error: 'Proses tidak ditemukan' }, { status: 404 })
    }

    // Create tasks for all TASK-type steps (the autopilot)
    const taskSteps = process.steps.filter(s => s.type === 'TASK')
    const createdTasks = []
    const baseDue = dueDate ? new Date(dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000)

    for (let i = 0; i < taskSteps.length; i++) {
      const step = taskSteps[i]
      const assignee = step.position?.employees[0]

      const task = await db.task.create({
        data: {
          title: `${process.code} — ${step.label}`,
          description: `Langkah ${step.order}: ${step.label}${step.sla ? ` (SLA: ${step.sla})` : ''}. Lane: ${step.lane.name}.`,
          processId: process.id,
          processStepId: step.id,
          assignedToId: assignee?.id || null,
          positionId: step.positionId || null,
          status: 'PENDING',
          priority: i === 0 ? 'HIGH' : 'MEDIUM',
          dueDate: baseDue,
          createdById: user.id,
          dataJson: JSON.stringify({ stepOrder: step.order, sla: step.sla, lane: step.lane.name }),
          logs: {
            create: {
              userId: user.id,
              action: 'CREATED',
              note: `Auto-generated dari proses ${process.code} langkah ${step.order} (${step.lane.name})`,
            },
          },
        },
        include: {
          assignedTo: { include: { position: true } },
        },
      })
      createdTasks.push(task)
    }

    return NextResponse.json({
      ok: true,
      process: { code: process.code, name: process.name },
      tasksCreated: createdTasks.length,
      tasks: createdTasks,
    })
  } catch (error) {
    console.error('Auto-generate tasks error:', error)
    return NextResponse.json({ error: 'Gagal membuat tugas otomatis' }, { status: 500 })
  }
}
