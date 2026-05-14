import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/adminAuth'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const name = String(body.name || '').trim()
  const location = String(body.location || '').trim()
  const courtCount = Number(body.courtCount)
  const courtNames = String(body.courtNames || '').trim()
  const mapsUrl = String(body.mapsUrl || '').trim()
  const imageUrl = String(body.imageUrl || '').trim()
  const requestId = body.requestId ? String(body.requestId).trim() : null

  if (!name || !location || !courtNames || !mapsUrl || !imageUrl || !Number.isFinite(courtCount) || courtCount < 1) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { error: createError } = await supabaseServer.from('court_places').insert({
    name,
    location,
    court_count: courtCount,
    court_names: courtNames,
    maps_url: mapsUrl,
    image_url: imageUrl,
    created_at: new Date().toISOString(),
  })

  if (createError) {
    return NextResponse.json({ error: 'Failed to create court' }, { status: 500 })
  }

  if (requestId) {
    const { error: updateError } = await supabaseServer
      .from('court_registration_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json({ error: 'Court created, but request status update failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
