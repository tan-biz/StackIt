import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

async function uploadCourtImage(file: File) {
  const bucket = 'court-images'
  const { data: existingBucket } = await supabaseServer.storage.getBucket(bucket)

  if (!existingBucket) {
    const { error: createBucketError } = await supabaseServer.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
    })

    if (createBucketError) {
      throw createBucketError
    }
  }

  const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
  const filePath = `registrations/${fileName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseServer.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabaseServer.storage.from(bucket).getPublicUrl(filePath)
  return data.publicUrl
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const name = String(formData.get('name') || '').trim()
    const courtCount = Number(formData.get('courtCount'))
    const courtNames = String(formData.get('courtNames') || '').trim()
    const mapsUrl = String(formData.get('mapsUrl') || '').trim()
    const location = String(formData.get('location') || '').trim()
    const image = formData.get('image')

    if (!name || !courtNames || !location || !mapsUrl || !image) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    if (!Number.isFinite(courtCount) || courtCount < 1) {
      return NextResponse.json({ error: 'Court count must be at least 1.' }, { status: 400 })
    }

    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Court image is required.' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(image.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed.' }, { status: 400 })
    }

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be 5MB or smaller.' }, { status: 400 })
    }

    const imageUrl = await uploadCourtImage(image)

    const { error } = await supabaseServer
      .from('court_registration_requests')
      .insert({
        name,
        location,
        court_count: courtCount,
        court_names: courtNames,
        maps_url: mapsUrl,
        image_url: imageUrl,
        image_file_name: image.name,
        status: 'pending',
      })

    if (error) {
      return NextResponse.json({ error: 'Failed to save request.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to submit request.' }, { status: 500 })
  }
}

