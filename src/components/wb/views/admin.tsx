'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, Users, Plus, Trash2, Ban, CheckCircle2, Shield, Crown,
  Search, Mail, Calendar, MoreVertical, Pencil, ShieldCheck, ShieldX,
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { api, type SessionUser } from '@/lib/bpm-types'
import { toast } from 'sonner'

type AdminUser = {
  id: string
  email: string
  name: string
  role: string
  isBlocked: boolean
  createdAt: string
  _count: { workbooks: number; sessions: number }
}

const roleConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Crown }> = {
  MASTER_ADMIN: { label: 'Master Admin', color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-950/40', icon: Crown },
  ADMIN: { label: 'Admin', color: 'text-stone-700', bg: 'bg-stone-100 dark:bg-stone-800/40', icon: Shield },
  USER: { label: 'User', color: 'text-stone-600', bg: 'bg-muted', icon: Users },
}

export function AdminView({ user }: { user: SessionUser }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' })
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    api<{ users: AdminUser[] }>('/admin/users')
      .then((d) => setUsers(d.users))
      .catch(() => toast.error('Gagal memuat data user'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      await api('/admin/users', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('User berhasil dibuat')
      setCreateOpen(false)
      setForm({ name: '', email: '', password: '', role: 'USER' })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat user')
    } finally {
      setCreating(false)
    }
  }

  async function toggleBlock(u: AdminUser) {
    try {
      await api(`/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isBlocked: !u.isBlocked }),
      })
      toast.success(u.isBlocked ? 'User di-unblock' : 'User diblokir')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal')
    }
  }

  async function changeRole(u: AdminUser, newRole: string) {
    try {
      await api(`/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      })
      toast.success('Role diubah')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal')
    }
  }

  async function handleDelete(u: AdminUser) {
    if (!confirm(`Hapus akun ${u.name} (${u.email})? Semua workbook miliknya akan terhapus.`)) return
    try {
      await api(`/admin/users/${u.id}`, { method: 'DELETE' })
      toast.success('User dihapus')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal')
    }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const isMasterAdmin = user.role === 'MASTER_ADMIN'
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role !== 'USER').length,
    blocked: users.filter(u => u.isBlocked).length,
    active: users.filter(u => !u.isBlocked).length,
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Admin Panel
          </h2>
          <p className="text-sm text-muted-foreground">
            Kelola akun pengguna — {isMasterAdmin ? 'Anda adalah Master Admin (akses penuh)' : 'Anda adalah Admin (kelola user)'}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Tambah User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total User</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-xs text-muted-foreground">Aktif</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.admins}</div>
          <div className="text-xs text-muted-foreground">Admin</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
          <div className="text-xs text-muted-foreground">Diblokir</div>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari user..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* User list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Pengguna</CardTitle>
          <CardDescription>{filtered.length} user</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-2">
              {filtered.map((u) => {
                const cfg = roleConfig[u.role] || roleConfig.USER
                const initials = u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                const isSelf = u.id === user.id
                return (
                  <div key={u.id} className={`flex items-center gap-3 p-3 rounded-lg border ${u.isBlocked ? 'opacity-60 bg-red-50/30 dark:bg-red-950/10' : 'hover:bg-muted/30'}`}>
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className={`text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{u.name}</span>
                        {isSelf && <Badge variant="outline" className="text-[10px]">Anda</Badge>}
                        <Badge variant="outline" className={`text-[10px] ${cfg.color} ${cfg.bg} border-0`}>
                          <cfg.icon className="w-3 h-3 mr-0.5" />
                          {cfg.label}
                        </Badge>
                        {u.isBlocked && (
                          <Badge variant="outline" className="text-[10px] text-red-600 bg-red-100 dark:bg-red-950/40 border-0">
                            <Ban className="w-3 h-3 mr-0.5" />Diblokir
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span>{u._count.workbooks} workbook</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {/* Block/Unblock */}
                      {u.role !== 'MASTER_ADMIN' && !isSelf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleBlock(u)}
                          title={u.isBlocked ? 'Unblock' : 'Block'}
                        >
                          {u.isBlocked ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Ban className="w-4 h-4 text-red-600" />}
                        </Button>
                      )}
                      {/* Role change (MASTER_ADMIN only) */}
                      {isMasterAdmin && u.role !== 'MASTER_ADMIN' && !isSelf && (
                        <Select
                          value={u.role}
                          onValueChange={(v) => changeRole(u, v)}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ShieldCheck className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          </DropdownMenu>
                          <SelectContent>
                            <SelectItem value="USER">User</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {/* Delete (ADMIN can delete USER, MASTER_ADMIN can delete USER+ADMIN) */}
                      {u.role !== 'MASTER_ADMIN' && !isSelf && (isMasterAdmin || u.role === 'USER') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => handleDelete(u)}
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Tidak ada user ditemukan
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah User Baru</DialogTitle>
            <DialogDescription>Buat akun baru untuk pengguna</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Nama Lengkap</Label>
              <Input id="admin-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-pass">Password</Label>
              <Input id="admin-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} placeholder="Minimal 6 karakter" />
            </div>
            {isMasterAdmin && (
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User (akses workbook saja)</SelectItem>
                    <SelectItem value="ADMIN">Admin (akses admin panel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Buat User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
