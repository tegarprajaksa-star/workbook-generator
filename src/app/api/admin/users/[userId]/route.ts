import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// PATCH — update user (block/unblock, change role, rename)
export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await requireAdmin()
    const { pathname } = new URL(req.url)
    const userId = pathname.split('/').pop()

    if (!userId) {
      return NextResponse.json({ error: 'User ID wajib diisi' }, { status: 400 })
    }

    const body = await req.json()
    const { isBlocked, role, name } = body

    // Prevent self-blocking / self-demotion
    if (userId === currentUser.id) {
      if (isBlocked === true) {
        return NextResponse.json({ error: 'Tidak bisa memblokir akun sendiri' }, { status: 400 })
      }
      if (role && role !== currentUser.role) {
        return NextResponse.json({ error: 'Tidak bisa mengubah role akun sendiri' }, { status: 400 })
      }
    }

    // Only MASTER_ADMIN can change roles or block ADMIN accounts
    const targetUser = await db.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    if (targetUser.role === 'MASTER_ADMIN' && currentUser.role !== 'MASTER_ADMIN') {
      return NextResponse.json({ error: 'Tidak bisa mengubah akun Master Admin' }, { status: 403 })
    }

    if (role && role !== targetUser.role) {
      if (currentUser.role !== 'MASTER_ADMIN') {
        return NextResponse.json({ error: 'Hanya Master Admin yang bisa mengubah role' }, { status: 403 })
      }
      if (targetUser.role === 'MASTER_ADMIN') {
        return NextResponse.json({ error: 'Tidak bisa mengubah role Master Admin' }, { status: 403 })
      }
    }

    const data: Record<string, unknown> = {}
    if (typeof isBlocked === 'boolean') data.isBlocked = isBlocked
    if (role && ['USER', 'ADMIN'].includes(role)) data.role = role
    if (name) data.name = name.trim()

    const updated = await db.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, role: true, isBlocked: true, createdAt: true },
    })

    // If blocking, invalidate all their sessions
    if (isBlocked === true) {
      await db.session.deleteMany({ where: { userId } }).catch(() => {})
    }

    return NextResponse.json({ user: updated })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
    console.error('Admin update user error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui user' }, { status: 500 })
  }
}

// DELETE — delete user (MASTER_ADMIN only)
export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await requireAdmin()
    const { pathname } = new URL(req.url)
    const userId = pathname.split('/').pop()

    if (!userId) {
      return NextResponse.json({ error: 'User ID wajib diisi' }, { status: 400 })
    }

    if (userId === currentUser.id) {
      return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })
    }

    const targetUser = await db.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    // Only MASTER_ADMIN can delete ADMIN accounts; ADMIN can only delete USER accounts
    if (targetUser.role === 'MASTER_ADMIN') {
      return NextResponse.json({ error: 'Tidak bisa menghapus akun Master Admin' }, { status: 403 })
    }
    if (targetUser.role === 'ADMIN' && currentUser.role !== 'MASTER_ADMIN') {
      return NextResponse.json({ error: 'Hanya Master Admin yang bisa menghapus akun Admin' }, { status: 403 })
    }

    await db.user.delete({ where: { id: userId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED' || (error as Error).message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
    console.error('Admin delete user error:', error)
    return NextResponse.json({ error: 'Gagal menghapus user' }, { status: 500 })
  }
}
