import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated, backendUrl, adminSecretKey } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(`${backendUrl()}/api/court-registration/requests`, {
    headers: { 'x-admin-key': adminSecretKey() },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
