'use client'

import { useEffect, useState } from 'react'
import {
  ListTodo, Loader2, Plus, Clock, CheckCircle2, AlertCircle,
  Play, Pause, XCircle, Filter, Zap, History,
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api, type SessionUser, type Task, type Employee, type Process } from '@/lib/bpm-types'
import { toast } from 'sonner'

const statusConfig: Record<string, {
  label: string; color: string; bg: string; icon: typeof Clock; action?: string
}> = {
  PENDING: { label: 'Menunggu', color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-950/40', icon: Clock, action: 'IN_PROGRESS' },
  IN_PROGRESS: { label: 'Berjalan', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-950/40', icon: Play, action: 'DONE' },
  DONE: { label: 'Selesai', color: 'text-green-700', bg: 'bg-green-100 dark:bg-green-950/40', icon: CheckCircle2 },
  BLOCKED: { label: 'Terblokir', color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-950/40', icon: AlertCircle, action: 'IN_PROGRESS' },
  CANCELLED: { label: 'Dibatalkan', color: 'text-stone-700', bg: 'bg-stone-100 dark:bg-stone-800/40', icon: XCircle },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  URGENT: { label: 'Mendesak', color: 'bg-red-500 text-white' },
  HIGH: { label: 'Tinggi', color: 'bg-orange-500 text-white' },
  MEDIUM: { label: 'Sedang', color: 'bg-amber-500 text-white' },
  LOW: { label: 'Rendah', color: 'bg-stone-400 text-white' },
}

const actionLabels: Record<string, string> = {
  STARTED: 'Memulai tugas',
  COMPLETED: 'Menyelesaikan tugas',
  BLOCKED: 'Memblokir tugas',
  REOPENED: 'Membuka kembali tugas',
  CANCELLED: 'Membatalkan tugas',
  CREATED: 'Membuat tugas',
  UPDATED: 'Memperbarui tugas',
  ASSIGNED: 'Menugaskan',
  REASSIGNED: 'Menugaskan ulang',
  COMMENTED: 'Berkomentar',
}

export function TasksView({ user }: { user: SessionUser }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [processes, setProcesses] = useState<Process[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [form, setForm] = useState({ title: '', description: '', assignedToId: '', processId: '', priority: 'MEDIUM' })

  function loadData() {
    Promise.all([
      api<{ tasks: Task[] }>('/tasks'),
      api<{ employees: Employee[] }>('/employees'),
      api<{ processes: Process[] }>('/processes'),
    ])
      .then(([tData, eData, pData]) => {
        setTasks(tData.tasks)
        setEmployees(eData.employees)
        setProcesses(pData.processes)
      })
      .catch(() => toast.error('Gagal memuat data tugas'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  async function updateTaskStatus(task: Task, newStatus: string) {
    try {
      const result = await api<{ task: Task }>(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      toast.success(`Tugas: ${statusConfig[newStatus]?.label || newStatus}`)
      setTasks(prev => prev.map(t => t.id === task.id ? result.task : t))
      if (selectedTask?.id === task.id) setSelectedTask(result.task)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui tugas')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api('/tasks', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('Tugas berhasil dibuat')
      setDialogOpen(false)
      setForm({ title: '', description: '', assignedToId: '', processId: '', priority: 'MEDIUM' })
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat tugas')
    }
  }

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus)
  const grouped: Record<string, Task[]> = {}
  for (const t of filtered) {
    if (!grouped[t.status]) grouped[t.status] = []
    grouped[t.status].push(t)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44">
              <Filter className="w-4 h-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="PENDING">Menunggu</SelectItem>
              <SelectItem value="IN_PROGRESS">Berjalan</SelectItem>
              <SelectItem value="DONE">Selesai</SelectItem>
              <SelectItem value="BLOCKED">Terblokir</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">{filtered.length} tugas</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-1" />
              Tambah Tugas
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Tugas Baru</DialogTitle>
              <DialogDescription>Tugaskan pekerjaan ke karyawan tertentu</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Judul Tugas</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Deskripsi</Label>
                <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="assignee">Penanggung Jawab</Label>
                  <Select value={form.assignedToId} onValueChange={(v) => setForm({ ...form, assignedToId: v })}>
                    <SelectTrigger id="assignee">
                      <SelectValue placeholder="Pilih karyawan" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name} — {e.position.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="process">Proses (opsional)</Label>
                  <Select value={form.processId} onValueChange={(v) => setForm({ ...form, processId: v })}>
                    <SelectTrigger id="process">
                      <SelectValue placeholder="Pilih proses" />
                    </SelectTrigger>
                    <SelectContent>
                      {processes.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioritas</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Rendah</SelectItem>
                    <SelectItem value="MEDIUM">Sedang</SelectItem>
                    <SelectItem value="HIGH">Tinggi</SelectItem>
                    <SelectItem value="URGENT">Mendesak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button type="submit">Buat Tugas</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban-style board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED'].map(status => {
          const cfg = statusConfig[status]
          const colTasks = grouped[status] || []
          return (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                    <cfg.icon className={`w-4 h-4 ${cfg.color} ${status === 'IN_PROGRESS' ? 'animate-spin' : ''}`} />
                  </div>
                  <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                </div>
                <Badge variant="outline" className="text-xs">{colTasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTask(task)}
                    onAction={(s) => updateTaskStatus(task, s)}
                    canManage={user.role !== 'STAFF'}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg">
                    Tidak ada tugas
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Task detail dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {selectedTask.process && (
                    <Badge variant="outline" className="font-mono text-xs">{selectedTask.process.code}</Badge>
                  )}
                  <Badge className={priorityConfig[selectedTask.priority].color}>
                    {priorityConfig[selectedTask.priority].label}
                  </Badge>
                  <Badge variant="outline" className={`${statusConfig[selectedTask.status].color} ${statusConfig[selectedTask.status].bg} border-0`}>
                    {statusConfig[selectedTask.status].label}
                  </Badge>
                </div>
                <DialogTitle className="text-lg">{selectedTask.title}</DialogTitle>
                {selectedTask.description && (
                  <DialogDescription>{selectedTask.description}</DialogDescription>
                )}
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 py-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <h5 className="text-xs font-semibold text-muted-foreground mb-1">Penanggung Jawab</h5>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedTask.assignedTo?.position?.color || '#f59e0b' }} />
                    <span className="text-sm font-medium">{selectedTask.assignedTo?.name || 'Unassigned'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{selectedTask.assignedTo?.position?.title}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <h5 className="text-xs font-semibold text-muted-foreground mb-1">Proses</h5>
                  <p className="text-sm font-medium">{selectedTask.process?.name || '-'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Dibuat oleh {selectedTask.createdBy?.name || '-'}</p>
                </div>
              </div>

              {/* Action buttons */}
              {statusConfig[selectedTask.status].action && (
                <div className="flex gap-2 py-2">
                  <Button
                    size="sm"
                    onClick={() => updateTaskStatus(selectedTask, statusConfig[selectedTask.status].action!)}
                    className="flex-1"
                  >
                    {selectedTask.status === 'PENDING' && <><Play className="w-4 h-4 mr-1" /> Mulai</>}
                    {selectedTask.status === 'IN_PROGRESS' && <><CheckCircle2 className="w-4 h-4 mr-1" /> Selesai</>}
                    {selectedTask.status === 'BLOCKED' && <><Play className="w-4 h-4 mr-1" /> Lanjutkan</>}
                  </Button>
                  {selectedTask.status !== 'BLOCKED' && selectedTask.status !== 'DONE' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTaskStatus(selectedTask, 'BLOCKED')}
                    >
                      <Pause className="w-4 h-4 mr-1" /> Blokir
                    </Button>
                  )}
                  {selectedTask.status !== 'DONE' && selectedTask.status !== 'CANCELLED' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateTaskStatus(selectedTask, 'CANCELLED')}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Batal
                    </Button>
                  )}
                </div>
              )}

              <Separator />

              {/* Activity log */}
              <div className="flex-1 overflow-hidden">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <History className="w-4 h-4 text-primary" />
                  Riwayat Aktivitas
                </h4>
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {selectedTask.logs.map(log => (
                      <div key={log.id} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium">{actionLabels[log.action] || log.action}</span>
                          {log.note && <span className="text-muted-foreground"> — {log.note}</span>}
                          <div className="text-xs text-muted-foreground">
                            {log.user?.name || log.employee?.name || 'System'} · {new Date(log.createdAt).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TaskCard({
  task, onClick, onAction, canManage,
}: {
  task: Task
  onClick: () => void
  onAction: (status: string) => void
  canManage: boolean
}) {
  const cfg = statusConfig[task.status]
  const prio = priorityConfig[task.priority]

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className={`text-[10px] px-1.5 py-0.5 rounded ${prio.color}`}>
            {prio.label}
          </div>
          {task.process && (
            <Badge variant="outline" className="text-[10px] font-mono">{task.process.code}</Badge>
          )}
        </div>
        <h4 className="text-sm font-medium leading-snug mb-2">{task.title}</h4>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.assignedTo?.position?.color || '#999' }} />
          <span className="truncate">{task.assignedTo?.name || 'Unassigned'}</span>
        </div>
        {cfg.action && canManage && (
          <Button
            size="sm"
            variant="ghost"
            className="w-full mt-2 h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onAction(cfg.action!)
            }}
          >
            {task.status === 'PENDING' && 'Mulai'}
            {task.status === 'IN_PROGRESS' && 'Selesai'}
            {task.status === 'BLOCKED' && 'Lanjutkan'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
