'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, Users, Plus, Trash2, Ban, CheckCircle2, Shield, Crown,
  Search, Mail, Calendar, MoreVertical, Pencil, ShieldCheck, ShieldX, Clock, UserCheck, KeyRound, Copy,
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
  isApproved: boolean
  createdAt: string
  _count: { workbooks: number; sessions: number }
}

type TokenItem = {
  id: string
  token: string
  note: string
  usedByUserId: string | null
  usedAt: string | null
  createdAt: string
  createdBy: { name: string } | null
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
  const [tokens, setTokens] = useState<TokenItem[]>([])
  const [tokenCount, setTokenCount] = useState('1')
  const [tokenNote, setTokenNote] = useState('')
  const [generatingTokens, setGeneratingTokens] = useState(false)

  const load = useCallback(() => {
    api<{ users: AdminUser[] }>('/admin/users')
      .then((d) => setUsers(d.users))
      .catch(() => toast.error('Gagal memuat data user'))
      .finally(() => setLoading(false))
    api<{ tokens: TokenItem[] }>('/admin/tokens')
      .then((d) => setTokens(d.tokens))
      .catch(() => {})
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

  async function approveUser(u: AdminUser) {
    try {
      await api(`/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isApproved: true }),
      })
      toast.success(`${u.name} telah di-approve. Sekarang bisa login.`)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal approve')
    }
  }

  async function revokeApproval(u: AdminUser) {
    if (!confirm(`Cabut approval ${u.name}? User tidak akan bisa login lagi.`)) return
    try {
      await api(`/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isApproved: false }),
      })
      toast.success('Approval dicabut')
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

  async function generateTokens() {
    setGeneratingTokens(true)
    try {
      const result = await api<{ tokens: TokenItem[]; count: number }>('/admin/tokens', {
        method: 'POST',
        body: JSON.stringify({ count: parseInt(tokenCount) || 1, note: tokenNote }),
      })
      toast.success(`${result.count} token berhasil dibuat!`)
      setTokenNote('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat token')
    } finally {
      setGeneratingTokens(false)
    }
  }

  function copyToken(token: string) {
    navigator.clipboard.writeText(token)
    toast.success(`Token ${token} disalin!`)
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
  const pendingUsers = users.filter(u => !u.isApproved && !u.isBlocked)
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role !== 'USER').length,
    blocked: users.filter(u => u.isBlocked).length,
    pending: pendingUsers.length,
    active: users.filter(u => u.isApproved && !u.isBlocked).length,
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
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">Menunggu Approval</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
          <div className="text-xs text-muted-foreground">Diblokir</div>
        </CardContent></Card>
      </div>

      {/* Pending Approval Section */}
      {pendingUsers.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <Clock className="w-5 h-5" />
              Menunggu Persetujuan ({pendingUsers.length})
            </CardTitle>
            <CardDescription>User yang sudah daftar tapi belum bisa login. Approve atau Reject.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingUsers.map((u) => {
                const initials = u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                return (
                  <div key={u.id} className="p-3 rounded-lg border bg-card space-y-3">
                    {/* User info row */}
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className="text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{u.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />{u.email}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                          Daftar: {new Date(u.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    {/* Action buttons row - always visible */}
                    <div className="flex gap-2 pl-13">
                      <Button size="sm" onClick={() => approveUser(u)} className="bg-green-600 hover:bg-green-700 flex-1">
                        <UserCheck className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(u)} className="text-red-600 border-red-300 hover:bg-red-50 flex-1">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Reject & Hapus
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Token Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Token Registrasi
          </CardTitle>
          <CardDescription>
            Generate token untuk user baru. Tanpa token, user tidak bisa mendaftar.
            Bagikan token ke user yang ingin Anda izinkan mendaftar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Generate form */}
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Jumlah Token</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={tokenCount}
                onChange={(e) => setTokenCount(e.target.value)}
                className="w-full sm:w-24"
              />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Catatan (opsional)</Label>
              <Input
                type="text"
                placeholder="Misal: untuk tim sales"
                value={tokenNote}
                onChange={(e) => setTokenNote(e.target.value)}
              />
            </div>
            <Button onClick={generateTokens} disabled={generatingTokens} className="flex-shrink-0">
              {generatingTokens ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Generate Token
            </Button>
          </div>

          {/* Token list */}
          {tokens.length > 0 && (
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-semibold">Daftar Token ({tokens.length})</h4>
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {tokens.map((t) => (
                    <div key={t.id} className={`flex items-center gap-2 p-2.5 rounded-lg border ${t.usedByUserId ? 'opacity-50' : 'hover:bg-muted/30'}`}>
                      <code className={`text-sm font-mono flex-1 ${t.usedByUserId ? 'line-through text-muted-foreground' : 'font-semibold'}`}>
                        {t.token}
                      </code>
                      {t.note && <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-32">{t.note}</span>}
                      {t.usedByUserId ? (
                        <Badge variant="outline" className="text-[10px] text-stone-500 bg-muted border-0">
                          Sudah Dipakai
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-green-600 bg-green-100 dark:bg-green-950/40 border-0">
                          Aktif
                        </Badge>
                      )}
                      {!t.usedByUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToken(t.token)}
                          title="Copy token"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          {tokens.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
              Belum ada token. Generate token di atas untuk memulai.
            </div>
          )}
        </CardContent>
      </Card>

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
            <div className="space-y-3">
              {filtered.map((u) => {
                const cfg = roleConfig[u.role] || roleConfig.USER
                const initials = u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                const isSelf = u.id === user.id
                const canManage = u.role !== 'MASTER_ADMIN' && !isSelf
                return (
                  <div key={u.id} className={`p-3 rounded-lg border space-y-2 ${u.isBlocked ? 'opacity-60 bg-red-50/30 dark:bg-red-950/10' : 'hover:bg-muted/30'}`}>
                    {/* User info row */}
                    <div className="flex items-center gap-3">
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
                          {u.isApproved ? (
                            <Badge variant="outline" className="text-[10px] text-green-600 bg-green-100 dark:bg-green-950/40 border-0">
                              <CheckCircle2 className="w-3 h-3 mr-0.5" />Approved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-100 dark:bg-amber-950/40 border-0">
                              <Clock className="w-3 h-3 mr-0.5" />Pending
                            </Badge>
                          )}
                          {u.isBlocked && (
                            <Badge variant="outline" className="text-[10px] text-red-600 bg-red-100 dark:bg-red-950/40 border-0">
                              <Ban className="w-3 h-3 mr-0.5" />Diblokir
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span>{u._count.workbooks} workbook</span>
                        </div>
                      </div>
                    </div>
                    {/* Action buttons row - always visible, wraps on small screens */}
                    {canManage && (
                      <div className="flex gap-1.5 flex-wrap pl-1">
                        {/* Approve/Revoke */}
                        {!u.isApproved ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                            onClick={() => approveUser(u)}
                            title="Approve user"
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1" />Approve
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                            onClick={() => revokeApproval(u)}
                            title="Cabut approval"
                          >
                            <Clock className="w-3.5 h-3.5 mr-1" />Revoke
                          </Button>
                        )}
                        {/* Block/Unblock */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => toggleBlock(u)}
                          title={u.isBlocked ? 'Unblock' : 'Block'}
                        >
                          {u.isBlocked ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" />Unblock</> : <><Ban className="w-3.5 h-3.5 mr-1 text-red-600" />Block</>}
                        </Button>
                        {/* Role change (MASTER_ADMIN only) */}
                        {isMasterAdmin && u.role !== 'MASTER_ADMIN' && (
                          <Select value={u.role} onValueChange={(v) => changeRole(u, v)}>
                            <SelectTrigger className="h-7 w-[100px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USER" className="text-xs">User</SelectItem>
                              <SelectItem value="ADMIN" className="text-xs">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {/* Delete */}
                        {(isMasterAdmin || u.role === 'USER') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => handleDelete(u)}
                            title="Hapus akun"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />Hapus
                          </Button>
                        )}
                      </div>
                    )}
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
