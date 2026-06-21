import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET — list all users (admin only)
export async function GET() {
  try {
    await requireAdmin()
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        isApproved: true,
        createdAt: true,
        _count: { select: { workbooks: true, sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ users })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
    console.error('Admin list users error:', error)
    return NextResponse.json({ error: 'Gagal memuat data user' }, { status: 500 })
  }
}

// POST — create a new user (admin only)
export async function POST(req: NextRequest) {
  try {
    const currentUser = await requireAdmin()
    const body = await req.json()
    const { name, email, password, role } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nama, email, dan password wajib diisi' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    const validRoles = ['USER', 'ADMIN']
    // Only MASTER_ADMIN can create ADMIN accounts
    if (role === 'ADMIN' && currentUser.role !== 'MASTER_ADMIN') {
      return NextResponse.json({ error: 'Hanya Master Admin yang bisa membuat akun Admin' }, { status: 403 })
    }
    const finalRole = validRoles.includes(role) ? role : 'USER'

    const normalizedEmail = email.toLowerCase().trim()
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })
    }

    // Admin-created users are auto-approved
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        role: finalRole,
        isApproved: true,
      },
      select: { id: true, email: true, name: true, role: true, isBlocked: true, isApproved: true, createdAt: true },
    })

    return NextResponse.json({ user })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
    console.error('Admin create user error:', error)
    return NextResponse.json({ error: 'Gagal membuat user' }, { status: 500 })
  }
}
