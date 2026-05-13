import { NextRequest, NextResponse } from 'next/server'
import { makeAdminToken } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const sessionSecret = process.env.ADMIN_SESSION_SECRET

  if (!adminEmail || !adminPassword || !sessionSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (email !== adminEmail || password !== adminPassword) {
    // Artificial delay to slow brute-force attempts
    await new Promise(r => setTimeout(r, 500))
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = makeAdminToken(sessionSecret)
  const res = NextResponse.json({ ok: true })

  res.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })

  return res
}
