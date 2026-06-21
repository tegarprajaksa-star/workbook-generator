'use client'

import { useEffect, useState } from 'react'
import {
  Briefcase, Loader2, Shield, AlertTriangle, ChevronDown, ChevronRight,
  Plus, Building2, Users, ListChecks, Crown, Target,
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { api, type SessionUser, type Position, type Department } from '@/lib/bpm-types'
import { toast } from 'sonner'

export function PositionsView({ user: _user }: { user: SessionUser }) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function loadData() {
    Promise.all([
      api<{ departments: (Department & { positions: Position[] })[] }>('/departments'),
      api<{ positions: Position[] }>('/positions'),
    ])
      .then(([deptData, posData]) => {
        setDepartments(deptData.departments)
        setPositions(posData.positions)
      })
      .catch(() => toast.error('Gagal memuat data jabatan'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Role overlap analysis: find positions sharing similar responsibility keywords
  const allResponsibilities = positions.map(p => ({
    id: p.id,
    title: p.title,
    items: (p.responsibilities || '').split('\n').map(s => s.trim()).filter(Boolean),
  }))

  const overlapPairs: { a: string; b: string; shared: string[] }[] = []
  for (let i = 0; i < allResponsibilities.length; i++) {
    for (let j = i + 1; j < allResponsibilities.length; j++) {
      const a = allResponsibilities[i]
      const b = allResponsibilities[j]
      const shared = a.items.filter(ia =>
        b.items.some(ib => {
          // Simple keyword overlap detection
          const ka = ia.toLowerCase().split(/\s+/).filter(w => w.length > 4)
          const kb = ib.toLowerCase().split(/\s+/).filter(w => w.length > 4)
          return ka.some(k => kb.includes(k))
        })
      )
      if (shared.length > 0) {
        overlapPairs.push({ a: a.title, b: b.title, shared })
      }
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Role overlap alert */}
      {overlapPairs.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              Analisis Tumpang Tindih Peran
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-500">
              Ditemukan {overlapPairs.length} potensi tumpang tindih tanggung jawab antar jabatan. Tinjau untuk memastikan pembagian peran yang jelas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {overlapPairs.slice(0, 5).map((pair, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-500">
                      {pair.a} ↔ {pair.b}
                    </Badge>
                    <span className="text-amber-700 dark:text-amber-400 text-xs">
                      {pair.shared.length} tanggung jawab mirip
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Departments with positions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {departments.map((dept) => {
          const deptPositions = positions.filter(p => p.departmentId === dept.id)
          return (
            <Card key={dept.id} className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{dept.name}</CardTitle>
                    <CardDescription className="text-xs">{deptPositions.length} jabatan</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {deptPositions.map(pos => (
                    <div key={pos.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pos.color || '#f59e0b' }} />
                      <span className="text-sm font-medium flex-1">{pos.title}</span>
                      <Badge variant="outline" className="text-[10px]">{pos.employees.length} orang</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Position details */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          Detail Jabatan & Wewenang
        </h3>
        {positions.map((pos) => (
          <Collapsible
            key={pos.id}
            open={expandedId === pos.id}
            onOpenChange={(open) => setExpandedId(open ? pos.id : null)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {expandedId === pos.id ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: (pos.color || '#f59e0b') + '20' }}
                    >
                      <Briefcase className="w-5 h-5" style={{ color: pos.color || '#f59e0b' }} />
                    </div>
                    <div className="flex-1 text-left">
                      <CardTitle className="text-base">{pos.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {pos.department.name}
                        {pos.reportsTo && ` · Melapor ke ${pos.reportsTo.title}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {pos.employees.length}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <ListChecks className="w-3 h-3 mr-1" />
                        {pos._count?.processSteps || 0} langkah proses
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Target className="w-3 h-3 mr-1" />
                        {pos.kras.length} KRA
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  {pos.purpose && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Tujuan Jabatan</h4>
                      <p className="text-sm">{pos.purpose}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pos.authority && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" /> Wewenang
                        </h4>
                        <ul className="space-y-1.5">
                          {pos.authority.split('\n').filter(Boolean).map((a, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary mt-0.5">▸</span>
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {pos.responsibilities && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Tanggung Jawab
                        </h4>
                        <ul className="space-y-1.5">
                          {pos.responsibilities.split('\n').filter(Boolean).map((r, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-amber-600 mt-0.5">▸</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Duties */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {[
                      { label: 'Tugas Pokok', value: pos.dutiesPrimary },
                      { label: 'Tugas Harian', value: pos.dutiesDaily },
                      { label: 'Tugas Mingguan', value: pos.dutiesWeekly },
                      { label: 'Tugas Bulanan', value: pos.dutiesMonthly },
                    ].filter(d => d.value).map(d => (
                      <div key={d.label} className="rounded-lg bg-muted/40 p-3">
                        <h5 className="text-xs font-semibold text-muted-foreground mb-1">{d.label}</h5>
                        <p className="text-sm">{d.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* KRA preview */}
                  {pos.kras.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5" /> Indikator Hasil Kerja (KRA)
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {pos.kras.map(k => (
                          <Badge key={k.id} variant="outline" className="text-xs">
                            {k.name} <span className="text-primary ml-1">{k.target}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}

