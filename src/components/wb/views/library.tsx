'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BookOpen, Loader2, Plus, FileText, MoreVertical, Trash2, Eye, Pencil,
  Calendar, Building2, Briefcase,
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api, type SessionUser, type Workbook } from '@/lib/bpm-types'
import { toast } from 'sonner'

export function LibraryView({
  user: _user, onOpenBuilder, onOpenPreview,
}: {
  user: SessionUser
  onOpenBuilder: (wb?: Workbook) => void
  onOpenPreview: (wb: Workbook) => void
}) {
  const [workbooks, setWorkbooks] = useState<Workbook[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ positionTitle: '', companyName: '', title: '' })
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    api<{ workbooks: Workbook[] }>('/workbooks')
      .then((d) => setWorkbooks(d.workbooks))
      .catch(() => toast.error('Gagal memuat workbook'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.positionTitle) return
    setCreating(true)
    try {
      const result = await api<{ workbook: Workbook }>('/workbooks', {
        method: 'POST',
        body: JSON.stringify({
          positionTitle: form.positionTitle,
          companyName: form.companyName,
          title: form.title || `Buku Kerja ${form.positionTitle}`,
          companyTagline: 'Employee Workbook',
        }),
      })
      toast.success('Workbook dibuat. Lanjut generate dengan AI!')
      setCreateOpen(false)
      setForm({ positionTitle: '', companyName: '', title: '' })
      onOpenBuilder(result.workbook)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat workbook')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus workbook ini?')) return
    try {
      await api(`/workbooks/${id}`, { method: 'DELETE' })
      toast.success('Workbook dihapus')
      load()
    } catch {
      toast.error('Gagal menghapus')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Workbook Saya</h2>
          <p className="text-sm text-muted-foreground">
            {workbooks.length} buku panduan kerja tersimpan
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Buat Workbook Baru
        </Button>
      </div>

      {/* Empty state */}
      {workbooks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Belum ada workbook</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Buat buku panduan kerja pertama Anda. Cukup isi posisi & perusahaan,
              AI akan men-generate seluruh isinya.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Mulai Buat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workbooks.map((wb) => (
            <Card key={wb.id} className="group hover:shadow-md transition-all hover:border-primary/30">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (wb.accentColor || '#b45309') + '20' }}
                  >
                    <Briefcase className="w-5 h-5" style={{ color: wb.accentColor || '#b45309' }} />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onOpenPreview(wb)}>
                        <Eye className="w-4 h-4 mr-2" /> Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onOpenBuilder(wb)}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(wb.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-base leading-tight mt-1 line-clamp-2">{wb.title}</CardTitle>
                <CardDescription className="flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" />
                  {wb.companyName || 'Tanpa perusahaan'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">{wb.positionTitle}</Badge>
                  <Badge variant={wb.status === 'PUBLISHED' ? 'default' : 'secondary'} className="text-xs">
                    {wb.status === 'PUBLISHED' ? 'Selesai' : 'Draft'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {wb._count?.processes || 0} proses
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(wb.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => onOpenPreview(wb)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Buka
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Workbook Baru</DialogTitle>
            <DialogDescription>
              Isi posisi & perusahaan. Setelah dibuat, Anda bisa generate seluruh isi dengan AI.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pos">Posisi / Jabatan *</Label>
              <Input
                id="pos"
                placeholder="Contoh: Barista, Cashier, Sales, Perawat, Teknisi..."
                value={form.positionTitle}
                onChange={(e) => setForm({ ...form, positionTitle: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Nama Perusahaan</Label>
              <Input
                id="company"
                placeholder="Contoh: Kinikawa Coffee, PT Sejahtera..."
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Judul Workbook (opsional)</Label>
              <Input
                id="title"
                placeholder={`Buku Kerja ${form.positionTitle || '...'}`}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Buat & Lanjut Edit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
