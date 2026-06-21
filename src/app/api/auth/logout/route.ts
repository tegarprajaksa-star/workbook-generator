import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { clearSessionCookie, getSessionToken } from '@/lib/auth'

export async function POST() {
  try {
    const token = await getSessionToken()
    if (token) {
      await db.session.deleteMany({ where: { token } }).catch(() => {})
    }
    await clearSessionCookie()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ ok: true })
  }
}
