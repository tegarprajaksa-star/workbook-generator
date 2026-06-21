'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Users, Briefcase, Workflow, ListTodo, Target, FileText,
  TrendingUp, AlertCircle, Clock, CheckCircle2, Loader2,
  ArrowRight, Zap,
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api, type SessionUser, type Task } from '@/lib/bpm-types'

type DashboardData = {
  stats: { positions: number; employees: number; processes: number; tasks: number; kras: number; forms: number }
  tasksByStatus: Record<string, number>
  tasksByPriority: Record<string, number>
  recentTasks: (Task & { process: { code: string; name: string } | null })[]
  processesWithTasks: { id: string; code: string; name: string; taskCount: number; stepCount: number; totalSla: string | null; category: string | null }[]
  employeeWorkload: { id: string; name: string; position: string; activeTasks: number; positionColor: string | null }[]
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  PENDING: { label: 'Menunggu', color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-950/40', icon: Clock },
  IN_PROGRESS: { label: 'Berjalan', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-950/40', icon: Loader2 },
  DONE: { label: 'Selesai', color: 'text-green-700', bg: 'bg-green-100 dark:bg-green-950/40', icon: CheckCircle2 },
  BLOCKED: { label: 'Terblokir', color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-950/40', icon: AlertCircle },
}

export function DashboardView({ user }: { user: SessionUser }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<DashboardData>('/dashboard')
      .then(setData)
      .catch(() => toast.error('Gagal memuat dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const { stats, tasksByStatus, recentTasks, processesWithTasks, employeeWorkload } = data
  const totalTasks = Object.values(tasksByStatus).reduce((a, b) => a + b, 0) || 1
  const completionRate = Math.round((tasksByStatus.DONE / totalTasks) * 100)

  const statCards = [
    { label: 'Jabatan', value: stats.positions, icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Karyawan', value: stats.employees, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
    { label: 'Proses Bisnis', value: stats.processes, icon: Workflow, color: 'text-stone-600', bg: 'bg-stone-100 dark:bg-stone-800/40' },
    { label: 'Tugas Aktif', value: stats.tasks, icon: ListTodo, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
    { label: 'Indikator KRA', value: stats.kras, icon: Target, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
    { label: 'Form Kerja', value: stats.forms, icon: FileText, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome banner */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-900 via-amber-800 to-stone-900 text-amber-50">
        <CardContent className="p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <p className="text-amber-200/80 text-sm mb-1">Selamat datang kembali,</p>
              <h2 className="text-2xl lg:text-3xl font-bold">{user.name}</h2>
              <p className="text-amber-100/70 mt-2 max-w-xl">
                Operasional outlet berjalan dengan standar BPMN. Pantau tugas, proses, dan performa tim dari satu dashboard.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-amber-500/15 backdrop-blur rounded-xl px-5 py-4 border border-amber-400/20">
              <div className="w-12 h-12 rounded-full bg-amber-500/30 flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="text-2xl font-bold">{completionRate}%</div>
                <div className="text-xs text-amber-200/70">Tingkat Penyelesaian</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task status overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" />
              Status Tugas Operasional
            </CardTitle>
            <CardDescription>Distribusi tugas berdasarkan status dan proses</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Status bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {Object.entries(statusConfig).map(([key, cfg]) => {
                const count = tasksByStatus[key] || 0
                const pct = Math.round((count / totalTasks) * 100)
                return (
                  <div key={key} className={`rounded-xl ${cfg.bg} p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <cfg.icon className={`w-5 h-5 ${cfg.color} ${key === 'IN_PROGRESS' ? 'animate-spin' : ''}`} />
                      <span className="text-2xl font-bold">{count}</span>
                    </div>
                    <div className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</div>
                    <Progress value={pct} className="h-1.5 mt-2" />
                  </div>
                )
              })}
            </div>

            {/* Process task distribution */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Tugas per Proses Bisnis</h4>
              {processesWithTasks.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <Badge variant="outline" className="font-mono text-xs">{p.code}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.stepCount} langkah · SLA {p.totalSla || '-'}
                    </div>
                  </div>
                  <Badge className={p.taskCount > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : ''}>
                    {p.taskCount} tugas
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Employee workload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Beban Kerja Tim
            </CardTitle>
            <CardDescription>Tugas aktif per karyawan</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-80">
              <div className="space-y-3">
                {employeeWorkload.map((e) => (
                  <div key={e.id} className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: e.positionColor || '#f59e0b' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{e.position}</div>
                    </div>
                    <Badge variant={e.activeTasks > 2 ? 'destructive' : 'secondary'}>
                      {e.activeTasks}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Tugas Terbaru
          </CardTitle>
          <CardDescription>Aktivitas tugas terbaru di seluruh proses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada tugas</p>
            ) : (
              recentTasks.map((task) => {
                const cfg = statusConfig[task.status] || statusConfig.PENDING
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <cfg.icon className={`w-4 h-4 ${cfg.color} ${task.status === 'IN_PROGRESS' ? 'animate-spin' : ''}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{task.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {task.process && (
                          <>
                            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">{task.process.code}</Badge>
                            <span>·</span>
                          </>
                        )}
                        <span>{task.assignedTo?.name || 'Unassigned'}</span>
                        <span>·</span>
                        <span>{task.assignedTo?.position?.title || '-'}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${cfg.color} ${cfg.bg} border-0`}>
                      {cfg.label}
                    </Badge>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

