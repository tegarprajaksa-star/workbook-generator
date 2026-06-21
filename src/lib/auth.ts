import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { db } from './db'

// ============================================================
// Password Hashing (using Node built-in scrypt)
// ============================================================

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuf = Buffer.from(hash, 'hex')
  const testBuf = scryptSync(password, salt, 64)
  if (hashBuf.length !== testBuf.length) return false
  return timingSafeEqual(hashBuf, testBuf)
}

// ============================================================
// Session Management
// ============================================================

const SESSION_COOKIE = 'bpm_session'
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  await db.session.create({
    data: { token, userId, expiresAt },
  })
  return token
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value
}

export type SessionUser = {
  id: string
  email: string
  name: string
  role: string
  employeeId: string | null
  isBlocked: boolean
  isApproved: boolean
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getSessionToken()
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  // If user is blocked or not approved, invalidate their session and deny access
  if (session.user.isBlocked || !session.user.isApproved) {
    await db.session.deleteMany({ where: { userId: session.user.id } }).catch(() => {})
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    employeeId: session.user.employeeId,
    isBlocked: session.user.isBlocked,
    isApproved: session.user.isApproved,
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

// ADMIN or MASTER_ADMIN
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth()
  if (user.role !== 'ADMIN' && user.role !== 'MASTER_ADMIN') {
    throw new Error('FORBIDDEN')
  }
  return user
}

// MASTER_ADMIN only
export async function requireMasterAdmin(): Promise<SessionUser> {
  const user = await requireAuth()
  if (user.role !== 'MASTER_ADMIN') {
    throw new Error('FORBIDDEN')
  }
  return user
}
