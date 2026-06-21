'use client'

import { useEffect, useState } from 'react'
import {
  Workflow, Loader2, ArrowRight, Play, FileText, ClipboardList,
  CheckCircle2, XCircle, CircleDot, Square, Zap,
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, type SessionUser, type Process, type Employee } from '@/lib/bpm-types'
import { toast } from 'sonner'

const stepTypeConfig: Record<string, { icon: typeof CircleDot; color: string; bg: string; border: string; label: string }> = {
  START: { icon: CircleDot, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-400', label: 'Start' },
  TASK: { icon: Square, color: 'text-amber-700', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-400', label: 'Task' },
  GATEWAY: { icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-400', label: 'Gateway' },
  END: { icon: CheckCircle2, color: 'text-stone-600', bg: 'bg-stone-100 dark:bg-stone-800/40', border: 'border-stone-400', label: 'End' },
  CORRECTION: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-400', label: 'Koreksi' },
}

export function ProcessesView({ user }: { user: SessionUser }) {
  const [processes, setProcesses] = useState<Process[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  function loadData() {
    Promise.all([
      api<{ processes: Process[] }>('/processes'),
      api<{ employees: Employee[] }>('/employees'),
    ])
      .then(([pData, eData]) => {
        setProcesses(pData.processes)
        setEmployees(eData.employees)
        if (pData.processes.length > 0 && !selectedId) {
          setSelectedId(pData.processes[0].id)
        }
      })
      .catch(() => toast.error('Gagal memuat data proses'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  async function handleAutoGenerate(processId: string) {
    setGenerating(processId)
    try {
      const result = await api<{ ok: boolean; tasksCreated: number; process: { code: string; name: string } }>('/tasks/auto-generate', {
        method: 'POST',
        body: JSON.stringify({ processId }),
      })
      toast.success(`${result.tasksCreated} tugas dibuat untuk ${result.process.code} — ${result.process.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat tugas otomatis')
    } finally {
      setGenerating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const selected = processes.find(p => p.id === selectedId)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Process selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {processes.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 transition-all text-left min-w-[180px] ${
              selectedId === p.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-card hover:border-primary/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono text-xs">{p.code}</Badge>
              {p.category && <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>}
            </div>
            <div className="text-sm font-semibold leading-tight">{p.name}</div>
          </button>
        ))}
      </div>

      {selected && (
        <ProcessDetail
          process={selected}
          employees={employees}
          canGenerate={user.role !== 'STAFF'}
          onGenerate={() => handleAutoGenerate(selected.id)}
          generating={generating === selected.id}
        />
      )}
    </div>
  )
}

function ProcessDetail({
  process, employees, canGenerate, onGenerate, generating,
}: {
  process: Process
  employees: Employee[]
  canGenerate: boolean
  onGenerate: () => void
  generating: boolean
}) {
  const lanes = process.lanes
  const steps = process.steps

  return (
    <div className="space-y-4">
      {/* Process header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono">{process.code}</Badge>
                {process.category && <Badge variant="secondary">{process.category}</Badge>}
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  SLA: {process.totalSla || '-'}
                </Badge>
              </div>
              <CardTitle className="text-xl">{process.name}</CardTitle>
              {process.description && <CardDescription className="mt-1">{process.description}</CardDescription>}
            </div>
            {canGenerate && (
              <Button onClick={onGenerate} disabled={generating} className="flex-shrink-0">
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {generating ? 'Membuat...' : 'Jalankan Autopilot'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/40 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Input / Pemicu</h4>
              <p className="text-sm">{process.inputText || '-'}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Output Utama</h4>
              <p className="text-sm">{process.outputText || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="bpmn">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="bpmn">BPMN Flow</TabsTrigger>
          <TabsTrigger value="sop">SOP & WI</TabsTrigger>
          <TabsTrigger value="forms">Form</TabsTrigger>
        </TabsList>

        {/* BPMN Flow */}
        <TabsContent value="bpmn">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Workflow className="w-5 h-5 text-primary" />
                Alur Proses BPMN 2.0
              </CardTitle>
              <CardDescription>
                Setiap kotak aktivitas = 1 langkah SOP. Gateway wajib punya dua arah: ✓ YA lanjut, ✗ TIDAK masuk koreksi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full overflow-auto">
                <BpmnFlow process={process} />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SOP & WI */}
        <TabsContent value="sop">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-5 h-5 text-primary" />
                SOP & Work Instruction
              </CardTitle>
              <CardDescription>Urutan kerja baku dan penjabaran teknis detail</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {process.sops.map((sop) => (
                  <div key={sop.id} className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {sop.order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1">{sop.instruction}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                          <div>
                            <h5 className="text-xs font-semibold text-muted-foreground mb-1">Work Instruction</h5>
                            <p className="text-sm text-muted-foreground">{sop.workInstruction}</p>
                          </div>
                          <div>
                            <h5 className="text-xs font-semibold text-muted-foreground mb-1">Output / Bukti</h5>
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-0">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {sop.output}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forms */}
        <TabsContent value="forms">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="w-5 h-5 text-primary" />
                Form & Bukti Kerja
              </CardTitle>
              <CardDescription>Form yang digunakan untuk mencatat bukti kerja</CardDescription>
            </CardHeader>
            <CardContent>
              {process.forms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada form untuk proses ini</p>
              ) : (
                <div className="space-y-3">
                  {process.forms.map(form => {
                    const fields = JSON.parse(form.fieldsJson || '[]') as Array<Record<string, string>>
                    return (
                      <div key={form.id} className="rounded-lg border p-4">
                        <h4 className="font-semibold text-sm">{form.name}</h4>
                        {form.description && <p className="text-xs text-muted-foreground mt-0.5 mb-3">{form.description}</p>}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-2 font-semibold">No</th>
                                {(fields[0] && fields[0].standard) ? (
                                  <>
                                    <th className="text-left py-2 px-2 font-semibold">Item Pengecekan</th>
                                    <th className="text-left py-2 px-2 font-semibold">Standar</th>
                                    <th className="text-center py-2 px-2 font-semibold">OK</th>
                                    <th className="text-left py-2 px-2 font-semibold">Catatan</th>
                                  </>
                                ) : (
                                  fields.map((_, i) => (
                                    <th key={i} className="text-left py-2 px-2 font-semibold">{fields[i].label || `Col ${i+1}`}</th>
                                  ))
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {(fields[0] && fields[0].standard) ? (
                                fields.map((f, i) => (
                                  <tr key={i} className="border-b border-border/50">
                                    <td className="py-2 px-2">{i + 1}</td>
                                    <td className="py-2 px-2">{f.label}</td>
                                    <td className="py-2 px-2 text-muted-foreground">{f.standard}</td>
                                    <td className="py-2 px-2 text-center">☐</td>
                                    <td className="py-2 px-2"></td>
                                  </tr>
                                ))
                              ) : (
                                <tr className="border-b border-border/50">
                                  {fields.map((_, i) => (
                                    <td key={i} className="py-2 px-2 text-muted-foreground">—</td>
                                  ))}
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BpmnFlow({ process }: { process: Process }) {
  const lanes = process.lanes
  const steps = process.steps

  return (
    <div className="min-w-max">
      {/* Lane headers */}
      <div className="flex border-b-2 border-border">
        {lanes.map(lane => {
          const laneSteps = steps.filter(s => s.laneId === lane.id)
          const position = laneSteps[0]?.position
          const empCount = position ? employeesCount(position.id, process) : 0
          return (
            <div
              key={lane.id}
              className="flex-shrink-0 border-r border-border p-2 text-center"
              style={{ minWidth: '200px' }}
            >
              <div className="text-xs font-semibold">{lane.name}</div>
              {position && (
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: position.color || '#f59e0b' }} />
                  <span className="text-[10px] text-muted-foreground">{position.title}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Steps grid */}
      <div className="flex">
        {lanes.map(lane => {
          const laneSteps = steps.filter(s => s.laneId === lane.id).sort((a, b) => a.order - b.order)
          return (
            <div
              key={lane.id}
              className="flex-shrink-0 border-r border-border p-3 space-y-3"
              style={{ minWidth: '200px' }}
            >
              {laneSteps.map(step => {
                const cfg = stepTypeConfig[step.type] || stepTypeConfig.TASK
                return (
                  <div key={step.id} className="relative">
                    <div
                      className={`rounded-lg border-2 ${cfg.border} ${cfg.bg} p-2.5 transition-all hover:shadow-md`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                        {step.sla && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">
                            {step.sla}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium leading-tight">{step.label}</p>
                      {step.branchLabel && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] mt-1 ${step.branchLabel === 'YA' ? 'text-green-600 border-green-400' : 'text-red-600 border-red-400'}`}
                        >
                          {step.branchLabel === 'YA' ? '✓ YA' : '✗ TIDAK'}
                        </Badge>
                      )}
                    </div>
                    {/* Arrow to next */}
                    <div className="flex justify-center my-1">
                      <ArrowRight className="w-3 h-3 text-muted-foreground rotate-90" />
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Helper to count employees in a position
function employeesCount(_positionId: string, _process: Process): number {
  return 0
}
