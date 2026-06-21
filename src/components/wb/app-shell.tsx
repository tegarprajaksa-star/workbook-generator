'use client'

import { useState } from 'react'
import { BookOpen, LogOut, Menu, ChevronRight, Library, PlusCircle, FileText, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { api, type SessionUser, type Workbook } from '@/lib/bpm-types'
import { LibraryView } from '@/components/wb/views/library'
import { BuilderView } from '@/components/wb/views/builder'
import { PreviewView } from '@/components/wb/views/preview'
import { AdminView } from '@/components/wb/views/admin'

type ViewKey = 'library' | 'builder' | 'preview' | 'admin'

export function AppShell({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [view, setView] = useState<ViewKey>('library')
  const [activeWorkbook, setActiveWorkbook] = useState<Workbook | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [createDialogTrigger, setCreateDialogTrigger] = useState(0)

  async function handleLogout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    toast.success('Berhasil logout')
    onLogout()
  }

  const initials = user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  function openBuilder(wb?: Workbook) {
    setActiveWorkbook(wb || null)
    setView('builder')
  }

  function openPreview(wb: Workbook) {
    setActiveWorkbook(wb)
    setView('preview')
  }

  function backToLibrary() {
    setActiveWorkbook(null)
    setView('library')
  }

  const navItems = [
    { key: 'library' as ViewKey, label: 'Workbook Saya', icon: Library, desc: 'Daftar buku panduan' },
  ]

  const titleMap: Record<ViewKey, string> = {
    library: 'Workbook Saya',
    builder: activeWorkbook ? 'Edit Workbook' : 'Buat Workbook Baru',
    preview: 'Preview & Export',
    admin: 'Admin Panel',
  }

  const isAdmin = user.role === 'ADMIN' || user.role === 'MASTER_ADMIN'

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center border border-sidebar-primary/30">
          <BookOpen className="w-5 h-5 text-sidebar-primary" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sidebar-foreground truncate">Workbook Generator</div>
          <div className="text-xs text-sidebar-foreground/60">Buku Panduan Otomatis</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        <div className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Menu
        </div>
        <button
          onClick={() => { setView('library'); setMobileOpen(false) }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
            view === 'library'
              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          <Library className="w-4.5 h-4.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Workbook Saya</div>
            <div className="text-[11px] truncate text-sidebar-foreground/40">Daftar buku panduan</div>
          </div>
          {view === 'library' && <ChevronRight className="w-4 h-4" />}
        </button>

        <button
          onClick={() => { setView('library'); setMobileOpen(false); setCreateDialogTrigger(d => d + 1) }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <PlusCircle className="w-4.5 h-4.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Buat Baru</div>
            <div className="text-[11px] truncate text-sidebar-foreground/40">Mulai workbook baru</div>
          </div>
        </button>

        {isAdmin && (
          <button
            onClick={() => { setView('admin'); setMobileOpen(false) }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
              view === 'admin'
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <Shield className="w-4.5 h-4.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">Admin Panel</div>
              <div className="text-[11px] truncate text-sidebar-foreground/40">Kelola pengguna</div>
            </div>
            {view === 'admin' && <ChevronRight className="w-4 h-4" />}
          </button>
        )}

        {activeWorkbook && view !== 'library' && (
          <button
            onClick={() => setView('preview')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
              view === 'preview'
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <FileText className="w-4.5 h-4.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">Preview</div>
              <div className="text-[11px] truncate text-sidebar-foreground/40">{activeWorkbook.title}</div>
            </div>
          </button>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <Avatar className="w-9 h-9 border border-sidebar-border">
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</div>
            <div className="text-[11px] text-sidebar-foreground/50 truncate">{user.email}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 px-2">
          <Badge variant="outline" className="text-[10px] border-sidebar-foreground/30 text-sidebar-foreground/70">
            {user.role === 'MASTER_ADMIN' ? 'Master Admin' : user.role === 'ADMIN' ? 'Admin' : 'User'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 px-2"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Keluar
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar fixed inset-y-0 left-0 z-40">
        {SidebarContent}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold leading-tight">{titleMap[view]}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {view === 'library' && 'Kelola semua buku panduan kerja Anda'}
                  {view === 'builder' && (activeWorkbook ? 'Edit detail workbook' : 'Isi dipandu, generate dengan AI')}
                  {view === 'preview' && 'Lihat hasil & export ke PPT/DOC'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {view !== 'library' && (
                <Button variant="outline" size="sm" onClick={backToLibrary}>
                  <Library className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Library</span>
                </Button>
              )}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">AI Aktif</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 coffee-texture">
          <div className="animate-fade-in" key={view + (activeWorkbook?.id || '')}>
            {view === 'library' && (
              <LibraryView user={user} onOpenBuilder={openBuilder} onOpenPreview={openPreview} createDialogTrigger={createDialogTrigger} />
            )}
            {view === 'builder' && (
              <BuilderView
                user={user}
                workbook={activeWorkbook}
                onSaved={(wb) => { setActiveWorkbook(wb); openPreview(wb) }}
                onCancel={backToLibrary}
              />
            )}
            {view === 'preview' && activeWorkbook && (
              <PreviewView workbook={activeWorkbook} onBack={backToLibrary} onEdit={() => openBuilder(activeWorkbook)} />
            )}
            {view === 'admin' && isAdmin && (
              <AdminView user={user} />
            )}
          </div>
        </main>

        <footer className="mt-auto border-t bg-background">
          <div className="px-4 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              © 2025 Workbook Generator · Buat buku panduan kerja otomatis
            </p>
            <p className="text-xs text-muted-foreground/80">
              Developed by <span className="font-medium">Arah Daya Consulting</span> · Coach Tegar Prajaksa, MBA
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
