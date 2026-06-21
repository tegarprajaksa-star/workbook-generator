import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [positions, employees, processes, tasks, kras, forms] = await Promise.all([
      db.position.count(),
      db.employee.count(),
      db.process.count(),
      db.task.findMany({
        include: { assignedTo: { include: { position: true } }, process: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.kra.count(),
      db.formTemplate.count(),
    ])

    const tasksByStatus = {
      PENDING: tasks.filter(t => t.status === 'PENDING').length,
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      DONE: tasks.filter(t => t.status === 'DONE').length,
      BLOCKED: tasks.filter(t => t.status === 'BLOCKED').length,
    }

    const tasksByPriority = {
      URGENT: tasks.filter(t => t.priority === 'URGENT').length,
      HIGH: tasks.filter(t => t.priority === 'HIGH').length,
      MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
      LOW: tasks.filter(t => t.priority === 'LOW').length,
    }

    // Tasks per process
    const processesWithTasks = await db.process.findMany({
      include: {
        _count: { select: { tasks: true } },
        steps: { where: { type: 'TASK' } },
      },
    })

    // Tasks per employee (workload distribution - role overlap check)
    const employeesWithTasks = await db.employee.findMany({
      include: {
        position: true,
        _count: {
          select: {
            tasks: { where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } },
          },
        },
      },
    })

    return NextResponse.json({
      stats: {
        positions,
        employees,
        processes,
        tasks: tasks.length,
        kras,
        forms,
      },
      tasksByStatus,
      tasksByPriority,
      recentTasks: tasks.slice(0, 8),
      processesWithTasks: processesWithTasks.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        taskCount: p._count.tasks,
        stepCount: p.steps.length,
        totalSla: p.totalSla,
        category: p.category,
      })),
      employeeWorkload: employeesWithTasks.map(e => ({
        id: e.id,
        name: e.name,
        position: e.position.title,
        activeTasks: e._count.tasks,
        positionColor: e.position.color,
      })),
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Gagal memuat dashboard' }, { status: 500 })
  }
}
