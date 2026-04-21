import { Router, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// GET /api/games - list user's games
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('game_players')
    .select('games(*, profiles!games_creator_id_fkey(nickname))')
    .eq('player_id', req.userId!)
    .order('joined_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  const games = (data || []).map((d: any) => d.games).filter(Boolean)
  res.json({ games })
})

// POST /api/games - create a game
const createSchema = z.object({
  name: z.string().min(1).max(100),
  mode: z.enum(['tournament', 'open_play']),
})

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { name, mode } = parsed.data
  const code = generateCode()

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .insert({ code, name, mode, creator_id: req.userId!, status: 'waiting' })
    .select()
    .single()

  if (gameErr) return res.status(500).json({ error: gameErr.message })

  // Auto-join creator
  await supabase.from('game_players').insert({ game_id: game.id, player_id: req.userId! })

  res.status(201).json({ game })
})

// GET /api/games/:id - get game details
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { data: game, error } = await supabase
    .from('games')
    .select('*, profiles!games_creator_id_fkey(nickname)')
    .eq('id', req.params.id)
    .single()

  if (error || !game) return res.status(404).json({ error: 'Game not found' })

  const { data: players } = await supabase
    .from('game_players')
    .select('*, profiles(*)')
    .eq('game_id', game.id)

  res.json({ game, players: players || [] })
})

// POST /api/games/join - join by code
router.post('/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Code is required' })

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!game) return res.status(404).json({ error: 'Game not found' })
  if (game.status === 'completed') return res.status(400).json({ error: 'Game has ended' })

  const { data: existing } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', game.id)
    .eq('player_id', req.userId!)
    .single()

  if (!existing) {
    await supabase.from('game_players').insert({ game_id: game.id, player_id: req.userId! })
  }

  res.json({ game })
})

// PATCH /api/games/:id/status
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { status } = req.body

  const { data: game } = await supabase.from('games').select('creator_id').eq('id', req.params.id).single()
  if (!game) return res.status(404).json({ error: 'Game not found' })
  if (game.creator_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  const { data, error } = await supabase
    .from('games')
    .update({ status })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ game: data })
})

export default router
