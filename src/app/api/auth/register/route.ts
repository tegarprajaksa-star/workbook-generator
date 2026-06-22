import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, randomBytes } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, registrationToken } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nama, email, dan password wajib diisi' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      )
    }

    // Require registration token
    if (!registrationToken || registrationToken.trim().length === 0) {
      return NextResponse.json(
        { error: 'Token registrasi wajib diisi. Hubungi admin untuk mendapatkan token.' },
        { status: 400 }
      )
    }

    // Validate token
    const tokenRecord = await db.registrationToken.findUnique({
      where: { token: registrationToken.trim() },
    })

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'Token tidak valid. Hubungi admin untuk mendapatkan token yang benar.' },
        { status: 400 }
      )
    }

    if (!tokenRecord.isActive) {
      return NextResponse.json(
        { error: 'Token ini sudah dinonaktifkan oleh admin. Minta token baru.' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar. Silakan login.' },
        { status: 409 }
      )
    }

    // New users are NOT approved — admin must approve before login
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        role: 'USER',
        isApproved: false,
        isBlocked: false,
      },
    })

    // Increment token usage count (token stays active for reuse)
    await db.registrationToken.update({
      where: { id: tokenRecord.id },
      data: {
        usageCount: { increment: 1 },
      },
    })

    return NextResponse.json({
      ok: true,
      message: 'Pendaftaran berhasil! Akun Anda menunggu persetujuan admin. Anda akan bisa login setelah admin men-approve akun Anda.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isApproved: false,
        isBlocked: false,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mendaftar' },
      { status: 500 }
    )
  }
}
