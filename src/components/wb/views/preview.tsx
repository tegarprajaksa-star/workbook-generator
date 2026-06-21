'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, Download, FileText, Pencil, ArrowLeft, Sparkles,
  CheckCircle2, XCircle, CircleDot, Square, Zap, Shield, AlertTriangle,
  Crown, Workflow, ArrowRight,
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api, type Workbook, type WorkbookProcess, type BpmnStep, type Sop } from '@/lib/bpm-types'
import { toast } from 'sonner'

const stepTypeConfig: Record<string, { icon: typeof CircleDot; color: string; bg: string; border: string; label: string }> = {
  START: { icon: CircleDot, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-400', label: 'Start' },
  TASK: { icon: Square, color: 'text-amber-700', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-400', label: 'Task' },
  GATEWAY: { icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-400', label: 'Gateway' },
  END: { icon: CheckCircle2, color: 'text-stone-600', bg: 'bg-stone-100 dark:bg-stone-800/40', border: 'border-stone-400', label: 'End' },
  CORRECTION: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-400', label: 'Koreksi' },
}

function lines(text: string): string[] {
  return (text || '').split('\n').map(s => s.trim()).filter(Boolean)
}

export function PreviewView({
  workbook: initialWb, onBack, onEdit,
}: {
  workbook: Workbook
  onBack: () => void
  onEdit: () => void
}) {
  const [wb, setWb] = useState<Workbook>(initialWb)
  const [processes, setProcesses] = useState<WorkbookProcess[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const result = await api<{ workbook: Workbook }>(`/workbooks/${initialWb.id}`)
      setWb(result.workbook)
      setProcesses(result.workbook.processes || [])
    } catch {
      toast.error('Gagal memuat workbook')
    } finally {
      setLoading(false)
    }
  }, [initialWb.id])

  useEffect(() => { load() }, [load])

  async function handleExport(format: 'docx' | 'pptx') {
    setExporting(format)
    try {
      const blob = await api<Blob>(`/workbooks/${initialWb.id}/export-${format}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = wb.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_')
      a.download = `${safeName}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`File ${format.toUpperCase()} berhasil di-download`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Gagal export ${format.toUpperCase()}`)
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const kras = JSON.parse(wb.krasJson || '[]') as Array<{ name: string; formula: string; target: string; unit: string }>
  const accent = wb.accentColor || '#b45309'

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Action bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accent + '20' }}>
                <FileText className="w-5 h-5" style={{ color: accent }} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{wb.title}</h3>
                <p className="text-xs text-muted-foreground truncate">{wb.companyName} · {wb.positionTitle}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('docx')} disabled={exporting !== null}>
                {exporting === 'docx' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
                DOCX
              </Button>
              <Button size="sm" onClick={() => handleExport('pptx')} disabled={exporting !== null} style={{ backgroundColor: accent }}>
                {exporting === 'pptx' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                Export PPT
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workbook document preview */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {/* Cover */}
        <div className="relative px-8 py-16 text-center" style={{ background: `linear-gradient(135deg, ${accent}15, transparent)` }}>
          <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: accent }} />
          <p className="text-sm font-semibold tracking-wider mb-2" style={{ color: accent }}>{wb.companyName}</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{wb.title}</h1>
          <p className="text-muted-foreground">Posisi: {wb.positionTitle}</p>
          <p className="text-xs text-muted-foreground mt-4">Job Description • BPMN 2.0 • SOP • Work Instruction • Form • KRA</p>
          {wb.companyTagline && <p className="text-xs text-muted-foreground/60 mt-1 italic">{wb.companyTagline}</p>}
        </div>

        <Separator />

        {/* Content */}
        <div className="p-6 md:p-8 space-y-8">
          {/* 1. Job Description */}
          <section>
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: accent }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: accent }}>1</span>
              Job Description
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['Nama Jabatan', wb.positionTitle],
                ['Unit/Divisi', wb.department],
                ['Atasan Langsung', wb.reportsTo],
                ['Bawahan Langsung', wb.subordinates],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border p-3">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">{k}</div>
                  <div className="text-sm">{v || '-'}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border p-3 mt-3">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Tujuan Jabatan</div>
              <p className="text-sm">{wb.purpose || '-'}</p>
            </div>
          </section>

          {/* 2. Authority & Responsibilities */}
          <section>
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: accent }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: accent }}>2</span>
              Wewenang dan Tanggung Jawab
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border overflow-hidden">
                <div className="px-3 py-2 text-white text-sm font-semibold flex items-center gap-2" style={{ backgroundColor: accent }}>
                  <Shield className="w-4 h-4" /> Wewenang
                </div>
                <ul className="p-3 space-y-1.5">
                  {lines(wb.authority).map((a, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="mt-0.5" style={{ color: accent }}>▸</span>
                      <span>{a}</span>
                    </li>
                  ))}
                  {lines(wb.authority).length === 0 && <li className="text-sm text-muted-foreground">-</li>}
                </ul>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <div className="px-3 py-2 text-white text-sm font-semibold flex items-center gap-2" style={{ backgroundColor: accent }}>
                  <AlertTriangle className="w-4 h-4" /> Tanggung Jawab
                </div>
                <ul className="p-3 space-y-1.5">
                  {lines(wb.responsibilities).map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="mt-0.5" style={{ color: accent }}>▸</span>
                      <span>{r}</span>
                    </li>
                  ))}
                  {lines(wb.responsibilities).length === 0 && <li className="text-sm text-muted-foreground">-</li>}
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Duties */}
          <section>
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: accent }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: accent }}>3</span>
              Tugas Pokok, Harian, Mingguan, Bulanan
            </h2>
            <div className="space-y-2">
              {[
                ['Tugas Pokok', wb.dutiesPrimary],
                ['Tugas Harian', wb.dutiesDaily],
                ['Tugas Mingguan', wb.dutiesWeekly],
                ['Tugas Bulanan', wb.dutiesMonthly],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col sm:flex-row gap-2 rounded-lg border p-3">
                  <div className="text-sm font-semibold w-full sm:w-40 flex-shrink-0" style={{ color: accent }}>{k}</div>
                  <div className="text-sm flex-1">{v || '-'}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. KRA */}
          {kras.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: accent }}>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: accent }}>4</span>
                Key Result Area (KRA)
              </h2>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: accent }} className="text-white">
                      <th className="text-left py-2 px-3 font-semibold w-10">No</th>
                      <th className="text-left py-2 px-3 font-semibold">KRA</th>
                      <th className="text-left py-2 px-3 font-semibold">Formula / Cara Ukur</th>
                      <th className="text-left py-2 px-3 font-semibold w-28">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kras.map((k, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 px-3">{i + 1}</td>
                        <td className="py-2 px-3 font-medium">{k.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{k.formula}</td>
                        <td className="py-2 px-3 font-semibold" style={{ color: accent }}>{k.target}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 5. Processes */}
          {processes.map((proc, idx) => {
            const steps = JSON.parse(proc.stepsJson || '[]') as BpmnStep[]
            const sops = JSON.parse(proc.sopsJson || '[]') as Sop[]
            const lanes = JSON.parse(proc.lanesJson || '[]') as string[]
            return (
              <section key={proc.id}>
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: accent }}>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: accent }}>{5 + idx}</span>
                  {proc.code} — {proc.name}
                </h2>
                {proc.description && <p className="text-sm text-muted-foreground italic mb-3">{proc.description}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <div className="text-xs font-semibold mb-1" style={{ color: accent }}>INPUT / PEMICU</div>
                    <p className="text-sm">{proc.inputText || '-'}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <div className="text-xs font-semibold mb-1" style={{ color: accent }}>OUTPUT UTAMA</div>
                    <p className="text-sm">{proc.outputText || '-'}</p>
                  </div>
                </div>
                {proc.totalSla && <p className="text-xs text-muted-foreground italic mb-4">Total SLA: {proc.totalSla}</p>}

                {/* BPMN flow */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Workflow className="w-4 h-4" style={{ color: accent }} /> Alur Proses (BPMN 2.0)
                  </h4>
                  {lanes.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {lanes.map((lane, li) => {
                        const laneSteps = steps.filter(s => s.lane === li).sort((a, b) => a.order - b.order)
                        return (
                          <div key={li} className="flex-shrink-0 min-w-[180px]">
                            <div className="text-xs font-semibold text-center pb-2 border-b-2 mb-2" style={{ borderColor: accent + '40' }}>{lane}</div>
                            <div className="space-y-2">
                              {laneSteps.map(step => {
                                const cfg = stepTypeConfig[step.type] || stepTypeConfig.TASK
                                return (
                                  <div key={step.order} className={`rounded-lg border-2 ${cfg.border} ${cfg.bg} p-2`}>
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <cfg.icon className={`w-3 h-3 ${cfg.color}`} />
                                      <span className={`text-[9px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                                      {step.sla && <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">{step.sla}</Badge>}
                                    </div>
                                    <p className="text-xs font-medium leading-tight">{step.label}</p>
                                    {step.branchLabel && (
                                      <Badge variant="outline" className={`text-[9px] mt-1 ${step.branchLabel === 'YA' ? 'text-green-600 border-green-400' : 'text-red-600 border-red-400'}`}>
                                        {step.branchLabel === 'YA' ? '✓ YA' : '✗ TIDAK'}
                                      </Badge>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* SOP table */}
                {sops.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: accent }} className="text-white">
                          <th className="text-left py-2 px-3 font-semibold w-10">No</th>
                          <th className="text-left py-2 px-3 font-semibold">SOP / Urutan Kerja</th>
                          <th className="text-left py-2 px-3 font-semibold">Work Instruction</th>
                          <th className="text-left py-2 px-3 font-semibold w-32">Output / Bukti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sops.map((s, i) => (
                          <tr key={i} className="border-t align-top">
                            <td className="py-2 px-3">{i + 1}</td>
                            <td className="py-2 px-3 font-medium">{s.instruction}</td>
                            <td className="py-2 px-3 text-muted-foreground">{s.workInstruction}</td>
                            <td className="py-2 px-3"><Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-0">{s.output}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )
          })}

          {/* Closing */}
          <Separator />
          <div className="text-center py-6">
            <Crown className="w-8 h-8 mx-auto mb-2" style={{ color: accent }} />
            <h3 className="font-semibold mb-1">Halaman Pengesahan</h3>
            <p className="text-sm text-muted-foreground">Dokumen kerja ini dapat disahkan setelah disesuaikan dengan struktur organisasi.</p>
          </div>
        </div>
      </div>

      {/* Bottom export bar */}
      <Card className="sticky bottom-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground hidden sm:block">
              <Sparkles className="w-4 h-4 inline mr-1" />
              Export buku panduan ke format siap pakai
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => handleExport('docx')} disabled={exporting !== null}>
                {exporting === 'docx' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Download DOCX
              </Button>
              <Button onClick={() => handleExport('pptx')} disabled={exporting !== null} style={{ backgroundColor: accent }}>
                {exporting === 'pptx' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Download PPTX
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
