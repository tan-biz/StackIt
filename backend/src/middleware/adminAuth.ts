import { Request, Response, NextFunction } from 'express'

/**
 * Protects admin-only routes by requiring a matching x-admin-key header.
 * The key is set via ADMIN_SECRET_KEY env var and only ever sent from the
 * Next.js server-side proxy routes — never from the browser.
 */
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-admin-key']
  const expected = process.env.ADMIN_SECRET_KEY

  if (!expected) {
    console.error('ADMIN_SECRET_KEY env var is not set')
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  if (!key || key !== expected) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  next()
}
