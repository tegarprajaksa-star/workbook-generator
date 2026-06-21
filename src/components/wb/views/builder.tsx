'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, Wand2, Save, ArrowLeft, Sparkles, Briefcase, ListChecks,
  Workflow, Target, FileText, CheckCircle2, ChevronRight, Info,
  Plus, Trash2, Pencil, X,
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { api, type SessionUser, type Workbook, type Kra } from '@/lib/bpm-types'
import { toast } from 'sonner'
import { ProcessEditor } from '@/components/wb/process-editor'

const STEPS = [
  { key: 'identity', label: 'Identitas', icon: Briefcase, desc: 'Perusahaan & posisi' },
  { key: 'jobdesc', label: 'Job Desc', icon: ListChecks, desc: 'Wewenang & tanggung jawab' },
  { key: 'duties', label: 'Tugas', icon: ListChecks, desc: 'Pokok, harian, mingguan, bulanan' },
  { key: 'kra', label: 'KRA', icon: Target, desc: 'Indikator hasil kerja' },
  { key: 'processes', label: 'Proses', icon: Workflow, desc: 'BPMN, SOP, Work Instruction' },
] as const

type StepKey = typeof STEPS[number]['key']

export function BuilderView({
  user: _user, workbook, onSaved, onCancel,
}: {
  user: SessionUser
  workbook: Workbook | null
  onSaved: (wb: Workbook) => void
  onCancel: () => void
}) {
  const [step, setStep] = useState<StepKey>('identity')
  const [data, setData] = useState<Partial<Workbook>>(workbook || {})
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [kraDialogOpen, setKraDialogOpen] = useState(false)
  const [kraEditingIdx, setKraEditingIdx] = useState<number>(-1)
  const [kraForm, setKraForm] = useState<Kra>({ name: '', formula: '', target: '', unit: '%' })

  const load = useCallback(async () => {
    if (!workbook) return
    try {
      const result = await api<{ workbook: Workbook }>(`/workbooks/${workbook.id}`)
      setData(result.workbook)
    } catch {
      toast.error('Gagal memuat workbook')
    }
  }, [workbook])

  useEffect(() => { load() }, [load])

  async function saveField(fields: Partial<Workbook>) {
    if (!workbook) return
    try {
      const result = await api<{ workbook: Workbook }>(`/workbooks/${workbook.id}`, {
        method: 'PUT',
        body: JSON.stringify(fields),
      })
      setData(result.workbook)
      return result.workbook
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
    }
  }

  async function generate(section: string, extra?: Record<string, string>) {
    if (!workbook) return
    setGenerating(section)
    try {
      const body: Record<string, string> = { section, ...extra }
      const result = await api<{ section: string; data?: Record<string, unknown>; ok?: boolean }>(
        `/workbooks/${workbook.id}/generate`,
        { method: 'POST', body: JSON.stringify(body) }
      )

      if (section === 'full') {
        toast.success('Workbook lengkap berhasil di-generate!')
        await load()
      } else if (section === 'jobdesc' && result.data) {
        const d = result.data as Record<string, string>
        const updated = await saveField({
          department: d.department || '',
          reportsTo: d.reportsTo || '',
          subordinates: d.subordinates || '',
          purpose: d.purpose || '',
          authority: d.authority || '',
          responsibilities: d.responsibilities || '',
        })
        if (updated) toast.success('Job description di-generate!')
      } else if (section === 'duties' && result.data) {
        const d = result.data as Record<string, string>
        const updated = await saveField({
          dutiesPrimary: d.dutiesPrimary || '',
          dutiesDaily: d.dutiesDaily || '',
          dutiesWeekly: d.dutiesWeekly || '',
          dutiesMonthly: d.dutiesMonthly || '',
        })
        if (updated) toast.success('Tugas di-generate!')
      } else if (section === 'kra' && result.data) {
        const arr = result.data as Array<{ name: string; formula: string; target: string; unit: string }>
        await saveField({ krasJson: JSON.stringify(arr) })
        toast.success(`${arr.length} KRA di-generate!`)
      } else if (section === 'processes') {
        toast.success(`${(result as { count?: number }).count || ''} proses bisnis di-generate!`)
        await load()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal generate')
    } finally {
      setGenerating(null)
    }
  }

  async function handleSaveAndPreview() {
    setSaving(true)
    const finalWb = await saveField({ status: 'PUBLISHED' })
    setSaving(false)
    if (finalWb) {
      toast.success('Workbook disimpan!')
      onSaved(finalWb)
    }
  }

  // ---- KRA manual management ----
  function addKra() {
    setKraForm({ name: '', formula: '', target: '', unit: '%' })
    setKraEditingIdx(-1)
    setKraDialogOpen(true)
  }

  function editKra(idx: number) {
    const current = JSON.parse(data.krasJson || '[]') as Kra[]
    setKraForm(current[idx])
    setKraEditingIdx(idx)
    setKraDialogOpen(true)
  }

  function deleteKra(idx: number) {
    const current = JSON.parse(data.krasJson || '[]') as Kra[]
    const next = current.filter((_, i) => i !== idx)
    saveField({ krasJson: JSON.stringify(next) })
    toast.success('KRA dihapus')
  }

  async function saveKra(e: React.FormEvent) {
    e.preventDefault()
    if (!kraForm.name || !kraForm.formula) {
      toast.error('Nama dan formula wajib diisi')
      return
    }
    const current = JSON.parse(data.krasJson || '[]') as Kra[]
    if (kraEditingIdx >= 0) {
      current[kraEditingIdx] = kraForm
    } else {
      current.push(kraForm)
    }
    await saveField({ krasJson: JSON.stringify(current) })
    setKraDialogOpen(false)
    toast.success(kraEditingIdx >= 0 ? 'KRA diperbarui' : 'KRA ditambahkan')
  }

  if (!workbook) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">Memuat workbook...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const kras = (() => { try { return JSON.parse(data.krasJson || '[]') as Array<{ name: string; formula: string; target: string; unit: string }> } catch { return [] } })()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* AI Quick Generate banner */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Generate Seluruh Workbook dengan AI</h3>
                <p className="text-sm text-muted-foreground">
                  Cukup isi posisi & perusahaan di langkah 1, lalu klik tombol ini.
                  AI akan mengisi Job Desc, Tugas, KRA, dan seluruh proses bisnis.
                </p>
              </div>
            </div>
            <Button
              onClick={() => generate('full', {
                positionTitle: data.positionTitle || '',
                companyName: data.companyName || '',
                industry: 'umum',
              })}
              disabled={generating !== null}
              className="flex-shrink-0"
            >
              {generating === 'full' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              {generating === 'full' ? 'Generating...' : 'Generate Semua'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stepper */}
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
        {STEPS.map((s, i) => {
          const active = step === s.key
          return (
            <button
              key={s.key}
              onClick={() => setStep(s.key)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all flex-shrink-0',
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'
              )}
            >
              <s.icon className="w-4 h-4" />
              <span className="font-medium">{s.label}</span>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 opacity-50" />}
            </button>
          )
        })}
      </div>

      {/* Step content */}
      {step === 'identity' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> Identitas Workbook</CardTitle>
            <CardDescription>Informasi dasar perusahaan & posisi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Posisi / Jabatan</Label>
                <Input value={data.positionTitle || ''} onChange={(e) => setData({ ...data, positionTitle: e.target.value })} onBlur={() => saveField({ positionTitle: data.positionTitle })} />
              </div>
              <div className="space-y-2">
                <Label>Nama Perusahaan</Label>
                <Input value={data.companyName || ''} onChange={(e) => setData({ ...data, companyName: e.target.value })} onBlur={() => saveField({ companyName: data.companyName })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tagline Perusahaan</Label>
              <Input value={data.companyTagline || ''} onChange={(e) => setData({ ...data, companyTagline: e.target.value })} onBlur={() => saveField({ companyTagline: data.companyTagline })} placeholder="Employee Workbook" />
            </div>
            <div className="space-y-2">
              <Label>Judul Workbook</Label>
              <Input value={data.title || ''} onChange={(e) => setData({ ...data, title: e.target.value })} onBlur={() => saveField({ title: data.title })} />
            </div>
            <div className="space-y-2">
              <Label>Warna Aksen</Label>
              <div className="flex gap-2">
                {['#b45309', '#92400e', '#ea580c', '#ca8a04', '#16a34a', '#0f766e', '#9333ea', '#be185d'].map(c => (
                  <button key={c} onClick={() => { setData({ ...data, accentColor: c }); saveField({ accentColor: c }) }}
                    className={cn('w-8 h-8 rounded-lg border-2', (data.accentColor || '#b45309') === c ? 'border-foreground' : 'border-transparent')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'jobdesc' && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><ListChecks className="w-5 h-5 text-primary" /> Job Description</CardTitle>
                <CardDescription>Wewenang, tanggung jawab, dan tujuan jabatan</CardDescription>
              </div>

              <Button variant="outline" size="sm" onClick={() => generate('jobdesc')} disabled={generating !== null}>
                {generating === 'jobdesc' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Generate AI
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unit / Divisi</Label>
                <Input value={data.department || ''} onChange={(e) => setData({ ...data, department: e.target.value })} onBlur={() => saveField({ department: data.department })} />
              </div>
              <div className="space-y-2">
                <Label>Atasan Langsung</Label>
                <Input value={data.reportsTo || ''} onChange={(e) => setData({ ...data, reportsTo: e.target.value })} onBlur={() => saveField({ reportsTo: data.reportsTo })} />
              </div>
              <div className="space-y-2">
                <Label>Bawahan Langsung</Label>
                <Input value={data.subordinates || ''} onChange={(e) => setData({ ...data, subordinates: e.target.value })} onBlur={() => saveField({ subordinates: data.subordinates })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tujuan Jabatan</Label>
              <Textarea rows={3} value={data.purpose || ''} onChange={(e) => setData({ ...data, purpose: e.target.value })} onBlur={() => saveField({ purpose: data.purpose })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Wewenang (satu per baris)</Label>
                <Textarea rows={6} value={data.authority || ''} onChange={(e) => setData({ ...data, authority: e.target.value })} onBlur={() => saveField({ authority: data.authority })} placeholder="Menolak penggunaan bahan yang tidak layak..." />
              </div>
              <div className="space-y-2">
                <Label>Tanggung Jawab (satu per baris)</Label>
                <Textarea rows={6} value={data.responsibilities || ''} onChange={(e) => setData({ ...data, responsibilities: e.target.value })} onBlur={() => saveField({ responsibilities: data.responsibilities })} placeholder="Memastikan minuman dibuat sesuai resep..." />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'duties' && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><ListChecks className="w-5 h-5 text-primary" /> Pembagian Tugas</CardTitle>
                <CardDescription>Tugas pokok, harian, mingguan, dan bulanan</CardDescription>
              </div>

              <Button variant="outline" size="sm" onClick={() => generate('duties')} disabled={generating !== null}>
                {generating === 'duties' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Generate AI
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'dutiesPrimary', label: 'Tugas Pokok' },
              { key: 'dutiesDaily', label: 'Tugas Harian' },
              { key: 'dutiesWeekly', label: 'Tugas Mingguan' },
              { key: 'dutiesMonthly', label: 'Tugas Bulanan' },
            ].map(f => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                <Textarea
                  rows={2}
                  value={(data as Record<string, string>)[f.key] || ''}
                  onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                  onBlur={() => saveField({ [f.key]: (data as Record<string, string>)[f.key] })}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 'kra' && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Key Result Area (KRA)</CardTitle>
                <CardDescription>Indikator hasil kerja & cara pengukuran. Buat manual atau generate AI.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => generate('kra')} disabled={generating !== null}>
                  {generating === 'kra' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                  Generate AI
                </Button>
                <Button size="sm" onClick={() => addKra()} style={{ backgroundColor: data.accentColor || '#b45309' }}>
                  <Plus className="w-4 h-4 mr-1" /> Tambah Manual
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {kras.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Belum ada KRA. Buat manual atau generate dengan AI.
              </div>
            ) : (
              <div className="space-y-2">
                {kras.map((k, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/20 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{k.name}</span>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 text-xs">{k.target}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{k.formula}</p>
                      {k.unit && <p className="text-[10px] text-muted-foreground/70 mt-0.5">Satuan: {k.unit}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editKra(i)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => deleteKra(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'processes' && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><Workflow className="w-5 h-5 text-primary" /> Proses Bisnis (BPMN 2.0)</CardTitle>
                <CardDescription>
                  Buat proses secara manual dengan swim lane & diagram BPMN, atau generate dengan AI.
                </CardDescription>
              </div>

              <Button variant="outline" size="sm" onClick={() => generate('processes')} disabled={generating !== null}>
                {generating === 'processes' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Generate AI
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ProcessEditor
              workbookId={workbook.id}
              accentColor={data.accentColor || '#b45309'}
              onGenerating={(g) => setGenerating(g ? 'processes' : null)}
              reloadKey={data.updatedAt || ''}
            />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
        </Button>
        <div className="flex gap-2">
          {step !== 'processes' && (
            <Button variant="outline" onClick={() => {
              const idx = STEPS.findIndex(s => s.key === step)
              if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key)
            }}>
              Lanjut <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          <Button onClick={handleSaveAndPreview} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Simpan & Preview
          </Button>
        </div>
      </div>

      {/* KRA manual editor dialog */}
      <Dialog open={kraDialogOpen} onOpenChange={setKraDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{kraEditingIdx >= 0 ? 'Edit KRA' : 'Tambah KRA Baru'}</DialogTitle>
            <DialogDescription>Lengkapi indikator hasil kerja</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveKra} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kra-name">Nama KRA</Label>
              <Input
                id="kra-name"
                placeholder="Contoh: Akurasi Order"
                value={kraForm.name}
                onChange={(e) => setKraForm({ ...kraForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kra-formula">Formula / Cara Ukur</Label>
              <Textarea
                id="kra-formula"
                rows={2}
                placeholder="Contoh: Order benar ÷ total order × 100%"
                value={kraForm.formula}
                onChange={(e) => setKraForm({ ...kraForm, formula: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="kra-target">Target</Label>
                <Input
                  id="kra-target"
                  placeholder="Contoh: ≥ 98%"
                  value={kraForm.target}
                  onChange={(e) => setKraForm({ ...kraForm, target: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kra-unit">Satuan</Label>
                <Input
                  id="kra-unit"
                  placeholder="Contoh: %"
                  value={kraForm.unit}
                  onChange={(e) => setKraForm({ ...kraForm, unit: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setKraDialogOpen(false)}>Batal</Button>
              <Button type="submit" style={{ backgroundColor: data.accentColor || '#b45309' }}>
                <Save className="w-4 h-4 mr-2" />
                {kraEditingIdx >= 0 ? 'Simpan' : 'Tambah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
