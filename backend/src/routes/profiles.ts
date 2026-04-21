import { Router, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/profiles/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.userId!)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Profile not found' })
  res.json({ profile: data })
})

// POST /api/profiles - create profile
const createSchema = z.object({
  name: z.string().min(1).max(100),
  nickname: z.string().min(1).max(30),
})

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: req.userId!, ...parsed.data })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ profile: data })
})

// PATCH /api/profiles/me
const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nickname: z.string().min(1).max(30).optional(),
  avatar_url: z.string().url().optional().nullable(),
})

router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { data, error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', req.userId!)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ profile: data })
})

export default router
