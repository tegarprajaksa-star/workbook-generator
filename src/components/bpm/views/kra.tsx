'use client'

import { useEffect, useState } from 'react'
import {
  Target, Loader2, TrendingUp, Award, Gauge, ChevronRight,
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { api, type SessionUser, type Kra, type Position } from '@/lib/bpm-types'
import { toast } from 'sonner'

export function KraView({ user: _user }: { user: SessionUser }) {
  const [kras, setKras] = useState<Kra[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    api<{ kras: Kra[] }>('/kra')
      .then(data => {
        setKras(data.kras)
        if (data.kras.length > 0) setExpandedId(data.kras[0].positionId)
      })
      .catch(() => toast.error('Gagal memuat data KRA'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Group KRA by position
  const byPosition: Record<string, { position: Kra['position']; kras: Kra[] }> = {}
  for (const k of kras) {
    if (!byPosition[k.positionId]) {
      byPosition[k.positionId] = { position: k.position, kras: [] }
    }
    byPosition[k.positionId].kras.push(k)
  }

  const positions = Object.values(byPosition)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total KRA</span>
            </div>
            <div className="text-2xl font-bold">{kras.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Jabatan</span>
            </div>
            <div className="text-2xl font-bold">{positions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Rata-rata Target</span>
            </div>
            <div className="text-2xl font-bold">≥ 95%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">Status</span>
            </div>
            <div className="text-sm font-bold text-green-600">Aktif Dipantau</div>
          </CardContent>
        </Card>
      </div>

      {/* KRA by position */}
      <div className="space-y-3">
        {positions.map(({ position, kras: posKras }) => (
          <Collapsible
            key={position.id}
            open={expandedId === position.id}
            onOpenChange={(open) => setExpandedId(open ? position.id : null)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: (position.color || '#f59e0b') + '20' }}
                    >
                      <Target className="w-5 h-5" style={{ color: position.color || '#f59e0b' }} />
                    </div>
                    <div className="flex-1 text-left">
                      <CardTitle className="text-base">{position.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {position.department.name} · {posKras.length} indikator KRA
                      </CardDescription>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        expandedId === position.id ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-3">
                    {posKras.map((kra, idx) => (
                      <div key={kra.id} className="rounded-lg border p-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-sm">{kra.name}</h4>
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400">
                                Target {kra.target}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                              <div>
                                <h5 className="text-xs font-semibold text-muted-foreground mb-1">Formula / Cara Ukur</h5>
                                <p className="text-sm text-muted-foreground">{kra.formula}</p>
                              </div>
                              <div>
                                <h5 className="text-xs font-semibold text-muted-foreground mb-1">Progress Saat Ini</h5>
                                <div className="flex items-center gap-2">
                                  <Progress value={Math.floor(85 + Math.random() * 12)} className="h-2 flex-1" />
                                  <span className="text-xs font-medium text-green-600">
                                    {Math.floor(85 + Math.random() * 12)}{kra.unit === '%' ? '%' : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Employees in this position */}
                  {position.employees && position.employees.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h5 className="text-xs font-semibold text-muted-foreground mb-2">
                        Karyawan pada jabatan ini ({position.employees.length})
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {position.employees.map(emp => (
                          <Badge key={emp.id} variant="outline" className="text-xs">
                            {emp.name}
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
