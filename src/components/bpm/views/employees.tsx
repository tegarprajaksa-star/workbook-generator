'use client'

import { useEffect, useState } from 'react'
import {
  Users, Loader2, Mail, Phone, Plus, Search, Filter,
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { api, type SessionUser, type Employee, type Position } from '@/lib/bpm-types'
import { toast } from 'sonner'

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Aktif', color: 'text-green-700', bg: 'bg-green-100 dark:bg-green-950/40' },
  ON_LEAVE: { label: 'Cuti', color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-950/40' },
  INACTIVE: { label: 'Nonaktif', color: 'text-stone-700', bg: 'bg-stone-100 dark:bg-stone-800/40' },
}

export function EmployeesView({ user }: { user: SessionUser }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPos, setFilterPos] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', positionId: '' })

  function loadData() {
    Promise.all([
      api<{ employees: Employee[] }>('/employees'),
      api<{ positions: Position[] }>('/positions'),
    ])
      .then(([empData, posData]) => {
        setEmployees(empData.employees)
        setPositions(posData.positions)
      })
      .catch(() => toast.error('Gagal memuat data karyawan'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api('/employees', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('Karyawan berhasil ditambahkan')
      setDialogOpen(false)
      setForm({ name: '', email: '', phone: '', positionId: '' })
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambahkan karyawan')
    }
  }

  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
    const matchPos = filterPos === 'all' || e.positionId === filterPos
    return matchSearch && matchPos
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari karyawan..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterPos} onValueChange={setFilterPos}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jabatan</SelectItem>
              {positions.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {user.role !== 'STAFF' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-1" />
                Tambah Karyawan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Karyawan Baru</DialogTitle>
                <DialogDescription>Lengkapi data karyawan baru</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor Telepon</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Jabatan</Label>
                  <Select value={form.positionId} onValueChange={(v) => setForm({ ...form, positionId: v })}>
                    <SelectTrigger id="position">
                      <SelectValue placeholder="Pilih jabatan" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                  <Button type="submit">Simpan</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Employee grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(emp => {
          const status = statusConfig[emp.status] || statusConfig.ACTIVE
          const initials = emp.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
          return (
            <Card key={emp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12 border-2" style={{ borderColor: (emp.position.color || '#f59e0b') + '40' }}>
                    <AvatarFallback
                      className="text-sm font-semibold"
                      style={{ backgroundColor: (emp.position.color || '#f59e0b') + '20', color: emp.position.color || '#f59e0b' }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{emp.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{emp.position.title}</p>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${status.color} ${status.bg} border-0`}>
                      {status.label}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {emp.position.department.name}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {emp._count?.tasks || 0} tugas aktif
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Tidak ada karyawan yang ditemukan</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
