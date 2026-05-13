import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated, backendUrl, adminSecretKey } from '@/lib/adminAuth'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(
    `${backendUrl()}/api/court-registration/requests/${params.id}/reject`,
    {
      method: 'POST',
      headers: { 'x-admin-key': adminSecretKey() },
    },
  )

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
