'use client'

import { useState } from 'react'
import { BookOpen, Lock, Mail, Loader2, Sparkles, FileText, Download, Wand2, User, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { api, type SessionUser } from '@/lib/bpm-types'

export function LoginScreen({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const data = await api<{ user: SessionUser }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        toast.success(`Selamat datang, ${data.user.name}!`)
        onLogin(data.user)
      } else {
        const data = await api<{ user: SessionUser }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        })
        toast.success(`Akun dibuat. Selamat datang, ${data.user.name}!`)
        onLogin(data.user)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (mode === 'login' ? 'Login gagal' : 'Pendaftaran gagal'))
    } finally {
      setLoading(false)
    }
  }

  function fillDemo() {
    setMode('login')
    setEmail('demo@workbookgen.app')
    setPassword('demo123')
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left: Brand panel */}
      <div className="lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 flex items-center justify-center p-8 lg:p-16">
        <div className="absolute inset-0 coffee-texture opacity-30" />
        <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-40 h-40 rounded-full bg-orange-600/10 blur-3xl" />

        <div className="relative z-10 max-w-md text-amber-50">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 backdrop-blur flex items-center justify-center border border-amber-400/30">
              <BookOpen className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Workbook Generator</h1>
              <p className="text-amber-200/70 text-sm">Buku Panduan Kerja Otomatis</p>
            </div>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
            Buat buku panduan kerja <span className="text-amber-400">dalam menit</span>, bukan minggu
          </h2>
          <p className="text-amber-100/80 text-lg mb-10 leading-relaxed">
            Cukup isi posisi & perusahaan, AI men-generate buku panduan lengkap dengan
            business process, SOP, dan KRA. Export ke PowerPoint atau Word.
          </p>

          <div className="space-y-4">
            {[
              { icon: Wand2, title: 'Generate dengan AI', desc: 'Isi minimal, AI hasilkan Job Desc, BPMN, SOP, KRA lengkap' },
              { icon: FileText, title: 'Format Profesional', desc: 'Struktur buku kerja siap pakai untuk posisi apapun' },
              { icon: Download, title: 'Export PPT & DOC', desc: 'Download sebagai PowerPoint atau Word dengan satu klik' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="font-semibold text-amber-50">{f.title}</div>
                  <div className="text-sm text-amber-200/70">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login/Signup form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-16 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-medium mb-4">
              <Sparkles className="w-3 h-3" />
              Akses Eksklusif
            </div>
            <h2 className="text-2xl font-bold">
              {mode === 'login' ? 'Masuk ke Akun' : 'Buat Akun Baru'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {mode === 'login'
                ? 'Login untuk mulai membuat buku panduan'
                : 'Daftar gratis untuk membuat buku panduan kerja'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'login' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'signup' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nama Anda"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={mode === 'signup' ? 'Minimal 6 karakter' : '••••••••'}
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === 'signup' ? 6 : undefined}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Masuk' : 'Daftar Sekarang'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Switch mode link */}
          <p className="text-center text-sm text-muted-foreground mt-5">
            {mode === 'login' ? (
              <>
                Belum punya akun?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="font-semibold text-foreground hover:underline"
                >
                  Daftar di sini
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="font-semibold text-foreground hover:underline"
                >
                  Masuk di sini
                </button>
              </>
            )}
          </p>

          {/* Demo account shortcut */}
          <div className="mt-6 pt-6 border-t">
            <button
              onClick={fillDemo}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              Klik untuk isi akun demo otomatis
            </button>
            <p className="text-center text-xs text-muted-foreground mt-2">
              demo@workbookgen.app · demo123
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © 2025 Workbook Generator
          </p>
          <p className="text-center text-[11px] text-muted-foreground/70 mt-1">
            Developed by Arah Daya Consulting · Coach Tegar Prajaksa, MBA
          </p>
        </div>
      </div>
    </div>
  )
}
