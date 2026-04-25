import { Router, Response } from 'express'
import { z } from 'zod'
import nodemailer from 'nodemailer'

const router = Router()

const registrationSchema = z.object({
  name: z.string().min(1),
  courtCount: z.number().min(1),
  courtNames: z.string().min(1),
  location: z.string().min(1),
})

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

router.post('/', async (req, res) => {
  const parsed = registrationSchema.safeParse({
    ...req.body,
    courtCount: Number(req.body.courtCount),
  })

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { name, courtCount, courtNames, location } = parsed.data

  console.log('🏓 Court Registration Request:', {
    name,
    courtCount,
    courtNames,
    location,
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
    </ul>
  `

  try {
    const transporter = createTransporter()

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipient,
      subject,
      html,
    })

    res.json({ success: true })
  } catch (error: any) {
    console.error('Court registration email send failed:', error)
    res.status(500).json({ error: error?.message || 'Failed to send court registration request' })
  }
})

export default router
