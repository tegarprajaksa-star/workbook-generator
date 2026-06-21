'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, Plus, Trash2, Pencil, X, ChevronUp, ChevronDown,
  Workflow, Save, Sparkles, CircleDot, Square, Zap, CheckCircle2, AlertCircle,
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { api, type BpmnStep, type Sop } from '@/lib/bpm-types'
import { BpmnDiagram } from '@/components/wb/bpmn-diagram'
import { toast } from 'sonner'

type ProcessData = {
  id: string
  code: string
  name: string
  description: string
  inputText: string
  outputText: string
  totalSla: string
  category: string
  lanesJson: string
  stepsJson: string
  sopsJson: string
  formsJson: string
  order: number
}

const STEP_TYPES = [
  { value: 'START', label: 'Start', icon: CircleDot, color: 'text-green-600' },
  { value: 'TASK', label: 'Task', icon: Square, color: 'text-amber-700' },
  { value: 'GATEWAY', label: 'Gateway', icon: Zap, color: 'text-orange-600' },
  { value: 'END', label: 'End', icon: CheckCircle2, color: 'text-stone-600' },
  { value: 'CORRECTION', label: 'Koreksi', icon: AlertCircle, color: 'text-red-600' },
]

export function ProcessEditor({ workbookId, accentColor, onGenerating, reloadKey }: {
  workbookId: string
  accentColor: string
  onGenerating: (g: boolean) => void
  reloadKey: string
}) {
  const [processes, setProcesses] = useState<ProcessData[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<ProcessData | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await api<{ workbook: { processes: ProcessData[] } }>(`/workbooks/${workbookId}`)
      setProcesses(result.workbook.processes || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [workbookId])

  useEffect(() => { load() }, [load, reloadKey])

  async function handleGenerateAI() {
    onGenerating(true)
    try {
      const result = await api<{ ok: boolean; count?: number }>(`/workbooks/${workbookId}/generate`, {
        method: 'POST',
        body: JSON.stringify({ section: 'processes' }),
      })
      toast.success(`${result.count || ''} proses di-generate oleh AI!`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal generate')
    } finally {
      onGenerating(false)
    }
  }

  function openNewProcess() {
    const newProc: ProcessData = {
      id: '',
      code: `P${String(processes.length + 1).padStart(2, '0')}`,
      name: '',
      description: '',
      inputText: '',
      outputText: '',
      totalSla: '',
      category: '',
      lanesJson: JSON.stringify(['Role 1', 'Role 2']),
      stepsJson: JSON.stringify([
        { type: 'START', lane: 0, label: 'Mulai', sla: '', order: 1 },
        { type: 'TASK', lane: 0, label: 'Tugas pertama', sla: '5 mnt', order: 2 },
        { type: 'END', lane: 0, label: 'Selesai', sla: '', order: 3 },
      ]),
      sopsJson: JSON.stringify([
        { instruction: 'Langkah pertama', workInstruction: 'Detail cara kerja', output: 'Hasil/bukti' },
      ]),
      formsJson: JSON.stringify([]),
      order: processes.length + 1,
    }
    setEditing(newProc)
    setEditOpen(true)
  }

  function openEditProcess(p: ProcessData) {
    setEditing(p)
    setEditOpen(true)
  }

  async function deleteProcess(p: ProcessData) {
    if (!confirm(`Hapus proses ${p.code}?`)) return
    try {
      if (p.id) {
        await api(`/workbooks/${workbookId}/processes/${p.id}`, { method: 'DELETE' })
      }
      toast.success('Proses dihapus')
      load()
    } catch {
      toast.error('Gagal menghapus')
    }
  }

  if (loading) {
    return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {processes.length} proses bisnis. Edit manual atau generate dengan AI.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateAI}>
            <Sparkles className="w-4 h-4 mr-1" /> Generate AI
          </Button>
          <Button size="sm" onClick={openNewProcess} style={{ backgroundColor: accentColor }}>
            <Plus className="w-4 h-4 mr-1" /> Tambah Manual
          </Button>
        </div>
      </div>

      {/* Process list with BPMN diagrams */}
      {processes.length === 0 ? (
        <div className="text-center py-10 rounded-lg border border-dashed">
          <Workflow className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Belum ada proses bisnis</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={handleGenerateAI}>
              <Sparkles className="w-4 h-4 mr-1" /> Generate dengan AI
            </Button>
            <Button size="sm" onClick={openNewProcess} style={{ backgroundColor: accentColor }}>
              <Plus className="w-4 h-4 mr-1" /> Buat Manual
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {processes.map((p) => {
            const lanes = JSON.parse(p.lanesJson || '[]') as string[]
            const steps = JSON.parse(p.stepsJson || '[]') as BpmnStep[]
            const sops = JSON.parse(p.sopsJson || '[]') as Sop[]
            return (
              <Card key={p.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono">{p.code}</Badge>
                        {p.category && <Badge variant="secondary" className="text-xs">{p.category}</Badge>}
                        {p.totalSla && <Badge variant="outline" className="text-xs">SLA {p.totalSla}</Badge>}
                      </div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      {p.description && <CardDescription className="text-xs mt-0.5">{p.description}</CardDescription>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditProcess(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => deleteProcess(p)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {steps.length > 0 && (
                    <div className="rounded-lg border bg-white p-3 mb-3">
                      <BpmnDiagram lanes={lanes} steps={steps} accentColor={accentColor} compact />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{lanes.length} lane</Badge>
                    <Badge variant="outline">{steps.length} langkah</Badge>
                    <Badge variant="outline">{sops.length} SOP</Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Process editor dialog */}
      {editing && (
        <ProcessEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          process={editing}
          workbookId={workbookId}
          accentColor={accentColor}
          onSaved={() => { setEditOpen(false); load() }}
        />
      )}
    </div>
  )
}

// ---------- Process Edit Dialog (manual editor) ----------
function ProcessEditDialog({
  open, onOpenChange, process, workbookId, accentColor, onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  process: ProcessData
  workbookId: string
  accentColor: string
  onSaved: () => void
}) {
  const [form, setForm] = useState(process)
  const [lanes, setLanes] = useState<string[]>(JSON.parse(process.lanesJson || '[]'))
  const [steps, setSteps] = useState<BpmnStep[]>(JSON.parse(process.stepsJson || '[]'))
  const [sops, setSops] = useState<Sop[]>(JSON.parse(process.sopsJson || '[]'))
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'detail' | 'flow' | 'sop'>('flow')

  useEffect(() => {
    setForm(process)
    setLanes(JSON.parse(process.lanesJson || '[]'))
    setSteps(JSON.parse(process.stepsJson || '[]'))
    setSops(JSON.parse(process.sopsJson || '[]'))
  }, [process])

  async function handleSave() {
    if (!form.code || !form.name) {
      toast.error('Code dan name wajib diisi')
      return
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code,
        name: form.name,
        description: form.description,
        inputText: form.inputText,
        outputText: form.outputText,
        totalSla: form.totalSla,
        category: form.category,
        lanes,
        steps,
        sops,
      }
      if (form.id) {
        await api(`/workbooks/${workbookId}/processes/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await api(`/workbooks/${workbookId}/processes`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      toast.success('Proses disimpan')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  // Lane management
  function addLane() { setLanes([...lanes, `Role ${lanes.length + 1}`]) }
  function updateLane(i: number, val: string) {
    const next = [...lanes]; next[i] = val; setLanes(next)
  }
  function removeLane(i: number) {
    if (lanes.length <= 1) { toast.error('Minimal 1 lane'); return }
    setLanes(lanes.filter((_, idx) => idx !== i))
    // Adjust step.lane indices
    setSteps(steps.map(s => s.lane > i ? { ...s, lane: s.lane - 1 } : s).filter(s => s.lane < lanes.length - 1))
  }

  // Step management
  function addStep() {
    const maxOrder = steps.length > 0 ? Math.max(...steps.map(s => s.order)) : 0
    setSteps([...steps, {
      type: 'TASK',
      lane: 0,
      label: 'Tugas baru',
      sla: '5 mnt',
      order: maxOrder + 1,
      branchLabel: '',
    }])
  }
  function updateStep(i: number, patch: Partial<BpmnStep>) {
    setSteps(steps.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }
  function removeStep(i: number) {
    const removed = steps[i]
    const next = steps.filter((_, idx) => idx !== i)
    // Re-number orders
    setSteps(next.map((s, idx) => ({ ...s, order: idx + 1 })))
  }
  function moveStep(i: number, dir: -1 | 1) {
    if (i + dir < 0 || i + dir >= steps.length) return
    const next = [...steps]
    const tmp = next[i]
    next[i] = next[i + dir]
    next[i + dir] = tmp
    setSteps(next.map((s, idx) => ({ ...s, order: idx + 1 })))
  }

  // SOP management
  function addSop() {
    setSops([...sops, { instruction: '', workInstruction: '', output: '' }])
  }
  function updateSop(i: number, patch: Partial<Sop>) {
    setSops(sops.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }
  function removeSop(i: number) {
    setSops(sops.filter((_, idx) => idx !== i))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5" style={{ color: accentColor }} />
            {form.id ? 'Edit Proses' : 'Buat Proses Baru'}
          </DialogTitle>
          <DialogDescription>
            Edit detail proses, lane, langkah BPMN, dan SOP secara manual
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {([
            { key: 'flow', label: 'Diagram BPMN', icon: Workflow },
            { key: 'detail', label: 'Detail Proses', icon: Pencil },
            { key: 'sop', label: 'SOP & WI', icon: Save },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === t.key ? 'border-current' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              style={activeTab === t.key ? { color: accentColor, borderColor: accentColor } : {}}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-1">
          {/* FLOW TAB */}
          {activeTab === 'flow' && (
            <div className="space-y-4">
              {/* Lanes editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Swim Lane (peran)</Label>
                  <Button variant="outline" size="sm" onClick={addLane}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Lane
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lanes.map((lane, i) => (
                    <div key={i} className="flex items-center gap-1 rounded-lg border p-1 pl-2 bg-muted/30">
                      <span className="w-5 h-5 rounded text-xs flex items-center justify-center font-bold" style={{ backgroundColor: accentColor + '30', color: accentColor }}>{i}</span>
                      <Input
                        value={lane}
                        onChange={(e) => updateLane(i, e.target.value)}
                        className="h-7 w-36 text-xs border-0 bg-transparent"
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLane(i)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* BPMN preview */}
              {steps.length > 0 && lanes.length > 0 && (
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-xs text-muted-foreground mb-2">Preview Diagram:</p>
                  <BpmnDiagram lanes={lanes} steps={steps} accentColor={accentColor} compact />
                </div>
              )}

              {/* Steps editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Langkah Proses ({steps.length})</Label>
                  <Button variant="outline" size="sm" onClick={addStep}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Langkah
                  </Button>
                </div>
                <div className="space-y-2">
                  {steps.map((step, i) => {
                    const cfg = STEP_TYPES.find(t => t.value === step.type) || STEP_TYPES[1]
                    return (
                      <div key={i} className="rounded-lg border p-2.5 bg-card">
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{step.order}</span>
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Tipe</Label>
                              <Select value={step.type} onValueChange={(v) => updateStep(i, { type: v as BpmnStep['type'] })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {STEP_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value} className="text-xs">
                                      <t.icon className={`w-3 h-3 mr-1 inline ${t.color}`} /> {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Lane</Label>
                              <Select value={String(step.lane)} onValueChange={(v) => updateStep(i, { lane: parseInt(v) })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {lanes.map((l, idx) => (
                                    <SelectItem key={idx} value={String(idx)} className="text-xs">{idx}: {l}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-[10px] text-muted-foreground">Label Aktivitas</Label>
                              <Input value={step.label} onChange={(e) => updateStep(i, { label: e.target.value })} className="h-8 text-xs" />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">SLA</Label>
                              <Input value={step.sla} onChange={(e) => updateStep(i, { sla: e.target.value })} className="h-8 text-xs" placeholder="5 mnt" />
                            </div>
                            {step.type === 'GATEWAY' && (
                              <>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">YA → Langkah #</Label>
                                  <Input
                                    type="number"
                                    value={step.yesTargetOrder || ''}
                                    onChange={(e) => updateStep(i, { yesTargetOrder: e.target.value ? parseInt(e.target.value) : undefined })}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">TIDAK → Langkah #</Label>
                                  <Input
                                    type="number"
                                    value={step.noTargetOrder || ''}
                                    onChange={(e) => updateStep(i, { noTargetOrder: e.target.value ? parseInt(e.target.value) : undefined })}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </>
                            )}
                            {(step.type === 'CORRECTION' || step.branchLabel) && (
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Cabang</Label>
                                <Select value={step.branchLabel || ''} onValueChange={(v) => updateStep(i, { branchLabel: v })}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="YA" className="text-xs">✓ YA</SelectItem>
                                    <SelectItem value="TIDAK" className="text-xs">✗ TIDAK</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStep(i, -1)} disabled={i === 0}>
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}>
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600" onClick={() => removeStep(i)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* DETAIL TAB */}
          {activeTab === 'detail' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Kode</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="P01" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Kategori</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Operations" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nama Proses</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Deskripsi</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Input / Pemicu</Label>
                  <Textarea rows={3} value={form.inputText} onChange={(e) => setForm({ ...form, inputText: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Output Utama</Label>
                  <Textarea rows={3} value={form.outputText} onChange={(e) => setForm({ ...form, outputText: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total SLA</Label>
                <Input value={form.totalSla} onChange={(e) => setForm({ ...form, totalSla: e.target.value })} placeholder="± 38 menit" />
              </div>
            </div>
          )}

          {/* SOP TAB */}
          {activeTab === 'sop' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">SOP & Work Instruction ({sops.length})</Label>
                <Button variant="outline" size="sm" onClick={addSop}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> SOP
                </Button>
              </div>
              {sops.map((sop, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: accentColor }}>{i + 1}</span>
                    <Input value={sop.instruction} onChange={(e) => updateSop(i, { instruction: e.target.value })} placeholder="SOP / Urutan Kerja" className="text-sm font-medium" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => removeSop(i)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Textarea rows={2} value={sop.workInstruction} onChange={(e) => updateSop(i, { workInstruction: e.target.value })} placeholder="Work Instruction (detail teknis)" className="text-xs" />
                  <Input value={sop.output} onChange={(e) => updateSop(i, { output: e.target.value })} placeholder="Output / Bukti" className="text-xs" />
                </div>
              ))}
              {sops.length === 0 && (
                <p className="text-center py-6 text-sm text-muted-foreground">Belum ada SOP. Klik "SOP" untuk menambah.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: accentColor }}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Proses
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
