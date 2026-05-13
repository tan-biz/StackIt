import crypto from 'crypto'
import { NextRequest } from 'next/server'

/** Produces a deterministic session token from the server-side secret. */
export function makeAdminToken(secret: string): string {
  return crypto.createHmac('sha256', secret).update('stackit_admin_v1').digest('hex')
}

/** Returns true if the request carries a valid admin session cookie. */
export function isAdminAuthenticated(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return false

  const cookie = req.cookies.get('admin_session')?.value
  if (!cookie) return false

  const expected = makeAdminToken(secret)
  // Guard against different-length inputs before timingSafeEqual
  if (cookie.length !== expected.length) return false

  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookie, 'hex'),
      Buffer.from(expected, 'hex'),
    )
  } catch {
    return false
  }
}

/** Backend URL used by server-side proxy routes (never exposed to the browser). */
export function backendUrl(): string {
  return process.env.BACKEND_URL || 'http://localhost:4000'
}

/** Admin secret key forwarded to the backend via x-admin-key header. */
export function adminSecretKey(): string {
  return process.env.ADMIN_SECRET_KEY || ''
}
