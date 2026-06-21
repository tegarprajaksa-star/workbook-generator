'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Workflow,
  ListTodo,
  Target,
  Coffee,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { api, type SessionUser } from '@/lib/bpm-types'
import { DashboardView } from '@/components/bpm/views/dashboard'
import { PositionsView } from '@/components/bpm/views/positions'
import { EmployeesView } from '@/components/bpm/views/employees'
import { ProcessesView } from '@/components/bpm/views/processes'
import { TasksView } from '@/components/bpm/views/tasks'
import { KraView } from '@/components/bpm/views/kra'

type ViewKey = 'dashboard' | 'positions' | 'employees' | 'processes' | 'tasks' | 'kra'

const NAV_ITEMS: { key: ViewKey; label: string; icon: typeof LayoutDashboard; desc: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Ringkasan operasional' },
  { key: 'positions', label: 'Jabatan & Peran', icon: Briefcase, desc: 'Cegah tumpang tindih peran' },
  { key: 'employees', label: 'Karyawan', icon: Users, desc: 'Manajemen tim' },
  { key: 'processes', label: 'Proses Bisnis', icon: Workflow, desc: 'BPMN, SOP & Work Instruction' },
  { key: 'tasks', label: 'Tugas & Workflow', icon: ListTodo, desc: 'Autopilot operasional' },
  { key: 'kra', label: 'KRA & KPI', icon: Target, desc: 'Indikator hasil kerja' },
]

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  STAFF: 'Staff',
}

export function AppShell({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [activeView, setActiveView] = useState<ViewKey>('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    toast.success('Berhasil logout')
    onLogout()
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center border border-sidebar-primary/30">
          <Coffee className="w-5 h-5 text-sidebar-primary" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sidebar-foreground truncate">Kinikawa BPM</div>
          <div className="text-xs text-sidebar-foreground/60">Process Management</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        <div className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Menu Utama
        </div>
        {NAV_ITEMS.map((item) => {
          const active = activeView === item.key
          return (
            <button
              key={item.key}
              onClick={() => {
                setActiveView(item.key)
                setMobileOpen(false)
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className={cn('w-4.5 h-4.5 flex-shrink-0', active ? '' : 'text-sidebar-foreground/60')} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.label}</div>
                <div className={cn(
                  'text-[11px] truncate',
                  active ? 'text-sidebar-primary-foreground/70' : 'text-sidebar-foreground/40'
                )}>
                  {item.desc}
                </div>
              </div>
              {active && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
            </button>
          )
        })}
      </nav>

      {/* User section */}
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
            {roleLabels[user.role] || user.role}
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

  const currentNavItem = NAV_ITEMS.find((n) => n.key === activeView)

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar fixed inset-y-0 left-0 z-40">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold leading-tight">{currentNavItem?.label}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">{currentNavItem?.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Sistem Aktif</span>
              </div>
            </div>
          </div>
        </header>

        {/* View content */}
        <main className="flex-1 p-4 lg:p-8 coffee-texture">
          <div className="animate-fade-in" key={activeView}>
            {activeView === 'dashboard' && <DashboardView user={user} />}
            {activeView === 'positions' && <PositionsView user={user} />}
            {activeView === 'employees' && <EmployeesView user={user} />}
            {activeView === 'processes' && <ProcessesView user={user} />}
            {activeView === 'tasks' && <TasksView user={user} />}
            {activeView === 'kra' && <KraView user={user} />}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t bg-background">
          <div className="px-4 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              © 2025 Kinikawa BPM · Business Process Management System
            </p>
            <p className="text-xs text-muted-foreground">
              Disusun oleh Arah Daya Consulting · Coach Tegar Prajaksa, MBA
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
