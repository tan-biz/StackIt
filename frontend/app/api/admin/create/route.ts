import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated, backendUrl, adminSecretKey } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const res = await fetch(`${backendUrl()}/api/court-registration/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminSecretKey(),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
