import { Router, Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { supabase } from '../lib/supabase'
import { adminAuthMiddleware } from '../middleware/adminAuth'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'))
    }
  },
})

const registrationSchema = z.object({
  name: z.string().min(1),
  courtCount: z.number().min(1),
  courtNames: z.string().min(1),
  mapsUrl: z.string().url(),
  location: z.string().min(1),
})

const createCourtSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  courtCount: z.number().min(1),
  courtNames: z.string().min(1),
  mapsUrl: z.string().url(),
  imageUrl: z.string().url(),
  requestId: z.string().uuid().optional(),
})

async function uploadCourtImage(file: Express.Multer.File) {
  const bucket = 'court-images'
  const { data: existingBucket } = await supabase.storage.getBucket(bucket)

  if (!existingBucket) {
    const { error: createBucketError } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
    })

    if (createBucketError) {
      throw createBucketError
    }
  }

  const fileExt = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
  const filePath = `registrations/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data.publicUrl
}

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secure = process.env.SMTP_SECURE === 'true'

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
}

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('court_places')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching court places:', error);
    res.status(500).json({ error: 'Failed to fetch court places' });
  }
});

router.get('/requests', adminAuthMiddleware, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('court_registration_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (error: any) {
    console.error('Error fetching court registration requests:', error)
    res.status(500).json({ error: 'Failed to fetch court registration requests' })
  }
})

router.get('/:id', async (req, res) => {
  const courtId = req.params.id

  try {
    const { data, error } = await supabase
      .from('court_places')
      .select('*')
      .eq('id', courtId)
      .single()

    if (error) {
      throw error
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching court place:', error)
    res.status(500).json({ error: 'Failed to fetch court place' })
  }
})

router.post('/', upload.single('image'), async (req, res) => {
  const parsed = registrationSchema.safeParse({
    ...req.body,
    courtCount: Number(req.body.courtCount),
    mapsUrl: req.body.mapsUrl?.trim() || undefined,
  })

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { name, courtCount, courtNames, mapsUrl, location } = parsed.data
  const file = req.file
  let imageUrl: string | null = null

  if (!file) {
    return res.status(400).json({ error: 'Court image is required.' })
  }

  console.log('🏓 Court Registration Request:', {
    name,
    courtCount,
    courtNames,
    mapsUrl,
    location,
    imageFile: file ? file.originalname : null,
    timestamp: new Date().toISOString(),
  })

  const recipient = process.env.COURT_REGISTRATION_EMAIL || 'biseniotristanomar@gmail.com'
  const subject = 'StackIt court registration request'
  const html = `
    <p>A new court registration request has been submitted from StackIt.</p>
    <ul>
      <li><strong>Name:</strong> ${name}</li>
      <li><strong>How many courts:</strong> ${courtCount}</li>
      <li><strong>Name of courts:</strong> ${courtNames}</li>
      <li><strong>Location:</strong> ${location}</li>
      ${mapsUrl ? `<li><strong>Google Maps:</strong> <a href="${mapsUrl}">${mapsUrl}</a></li>` : ''}
      ${file ? `<li><strong>Image attachment:</strong> ${file.originalname}</li>` : '<li><strong>Image attachment:</strong> none</li>'}
    </ul>
  `

  try {
    if (file) {
      imageUrl = await uploadCourtImage(file)
    }

    const { error: saveRequestError } = await supabase
      .from('court_registration_requests')
      .insert({
        name,
        location,
        court_count: courtCount,
        court_names: courtNames,
        maps_url: mapsUrl || null,
        image_url: imageUrl,
        image_file_name: file?.originalname || null,
        status: 'pending',
      })

    if (saveRequestError) {
      throw saveRequestError
    }

    const transporter = createTransporter()

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipient,
      subject,
      html,
      attachments: file
        ? [
            {
              filename: file.originalname,
              content: file.buffer,
              contentType: file.mimetype,
            },
          ]
        : undefined,
    })

    res.json({ success: true })
  } catch (error: any) {
    console.error('Court registration email send failed:', error)
    res.status(500).json({ error: error?.message || 'Failed to send court registration request' })
  }
})

router.post('/create', adminAuthMiddleware, async (req, res) => {
  const parsed = createCourtSchema.safeParse({
    ...req.body,
    courtCount: Number(req.body.courtCount),
    mapsUrl: req.body.mapsUrl?.trim() || undefined,
    imageUrl: req.body.imageUrl?.trim() || undefined,
    requestId: req.body.requestId?.trim() || undefined,
  })

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { name, location, courtCount, courtNames, mapsUrl, imageUrl, requestId } = parsed.data

  try {
    const { data, error } = await supabase
      .from('court_places')
      .insert({
        name,
        location,
        court_count: courtCount,
        court_names: courtNames,
        maps_url: mapsUrl,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }

    if (requestId) {
      const { error: updateRequestError } = await supabase
        .from('court_registration_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (updateRequestError) {
        throw updateRequestError
      }
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating court place:', error);
    res.status(500).json({ error: 'Failed to create court place' });
  }
});

router.post('/requests/:id/reject', adminAuthMiddleware, async (req, res) => {
  const requestId = req.params.id

  if (!requestId) {
    return res.status(400).json({ error: 'Request ID is required' })
  }

  try {
    const { error } = await supabase
      .from('court_registration_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) {
      throw error
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error rejecting court registration request:', error)
    res.status(500).json({ error: 'Failed to reject court registration request' })
  }
})

export default router
