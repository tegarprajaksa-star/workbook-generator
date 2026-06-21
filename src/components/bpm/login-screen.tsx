'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, Lock, Mail, Loader2, ShieldCheck, Zap, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { api, type SessionUser } from '@/lib/bpm-types'

export function LoginScreen({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await api<{ user: SessionUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      toast.success(`Selamat datang, ${data.user.name}!`)
      onLogin(data.user)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(role: 'admin' | 'manager' | 'staff') {
    const creds = {
      admin: { email: 'owner@kinikawa.test', password: 'kinikawa123' },
      manager: { email: 'supervisor@kinikawa.test', password: 'kinikawa123' },
      staff: { email: 'barista@kinikawa.test', password: 'kinikawa123' },
    }
    setEmail(creds[role].email)
    setPassword(creds[role].password)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left: Brand panel */}
      <div className="lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-amber-950 via-amber-900 to-stone-900 flex items-center justify-center p-8 lg:p-16">
        <div className="absolute inset-0 coffee-texture opacity-40" />
        {/* Decorative coffee beans */}
        <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-40 h-40 rounded-full bg-orange-600/10 blur-3xl" />

        <div className="relative z-10 max-w-md text-amber-50">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 backdrop-blur flex items-center justify-center border border-amber-400/30">
              <Coffee className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Kinikawa BPM</h1>
              <p className="text-amber-200/70 text-sm">Business Process Management</p>
            </div>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
            Jalankan bisnis Anda dengan <span className="text-amber-400">autopilot</span>
          </h2>
          <p className="text-amber-100/80 text-lg mb-10 leading-relaxed">
            Sistem operasional terstandar yang mencegah tumpang tindih peran karyawan.
            Setiap proses, SOP, dan indikator hasil dalam satu platform.
          </p>

          <div className="space-y-4">
            {[
              { icon: ShieldCheck, title: 'Peran Jelas', desc: 'Wewenang & tanggung jawab tiap jabatan terdefinisi' },
              { icon: Zap, title: 'Workflow Otomatis', desc: 'Tugas ter-generate otomatis berdasarkan proses' },
              { icon: Users, title: 'Tim Tertib', desc: 'Antrean kerja terstruktur, tidak ada tumpang tindih' },
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

      {/* Right: Login form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-16 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">Masuk ke Akun</h2>
            <p className="text-muted-foreground mt-1">
              Akses eksklusif untuk pengguna terdaftar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@perusahaan.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
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
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t">
            <p className="text-xs text-muted-foreground mb-3 text-center">
              Akun demo (klik untuk isi otomatis)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemo('admin')}
                className="flex flex-col h-auto py-2"
              >
                <span className="text-xs font-semibold">Admin</span>
                <span className="text-[10px] text-muted-foreground">Owner</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemo('manager')}
                className="flex flex-col h-auto py-2"
              >
                <span className="text-xs font-semibold">Manager</span>
                <span className="text-[10px] text-muted-foreground">Supervisor</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemo('staff')}
                className="flex flex-col h-auto py-2"
              >
                <span className="text-xs font-semibold">Staff</span>
                <span className="text-[10px] text-muted-foreground">Barista</span>
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            © 2025 Kinikawa BPM · Powered by Arah Daya Consulting
          </p>
        </div>
      </div>
    </div>
  )
}
