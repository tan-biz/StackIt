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
