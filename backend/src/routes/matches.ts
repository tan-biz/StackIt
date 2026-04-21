import { Router, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/matches?gameId=xxx
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { gameId } = req.query
  if (!gameId) return res.status(400).json({ error: 'gameId required' })

  const { data, error } = await supabase
    .from('matches')
    .select('*, p1:team1_player1(nickname), p2:team2_player1(nickname)')
    .eq('game_id', gameId)
    .order('round', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ matches: data || [] })
})

// POST /api/matches - create match(es)
const createSchema = z.object({
  game_id: z.string().uuid(),
  matches: z.array(z.object({
    team1_player1: z.string().uuid(),
    team1_player2: z.string().uuid().optional().nullable(),
    team2_player1: z.string().uuid(),
    team2_player2: z.string().uuid().optional().nullable(),
    round: z.number().int().min(1),
  })),
})

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  // Verify requester is game creator
  const { data: game } = await supabase.from('games').select('creator_id').eq('id', parsed.data.game_id).single()
  if (!game) return res.status(404).json({ error: 'Game not found' })
  if (game.creator_id !== req.userId) return res.status(403).json({ error: 'Only the game creator can generate matches' })

  const inserts = parsed.data.matches.map(m => ({
    ...m,
    game_id: parsed.data.game_id,
    score_team1: 0,
    score_team2: 0,
    status: 'pending',
  }))

  const { data, error } = await supabase.from('matches').insert(inserts).select()
  if (error) return res.status(500).json({ error: error.message })

  res.status(201).json({ matches: data })
})

// PATCH /api/matches/:id/score
const scoreSchema = z.object({
  score_team1: z.number().int().min(0),
  score_team2: z.number().int().min(0),
})

router.patch('/:id/score', authMiddleware, async (req: AuthRequest, res: Response) => {
  const parsed = scoreSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { data: match } = await supabase.from('matches').select('game_id').eq('id', req.params.id).single()
  if (!match) return res.status(404).json({ error: 'Match not found' })

  const { data: game } = await supabase.from('games').select('creator_id').eq('id', match.game_id).single()
  if (game?.creator_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  const { data, error } = await supabase
    .from('matches')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ match: data })
})

// PATCH /api/matches/:id/complete
router.patch('/:id/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { data: match } = await supabase.from('matches').select('*, game_id').eq('id', req.params.id).single()
  if (!match) return res.status(404).json({ error: 'Match not found' })

  const { data: game } = await supabase.from('games').select('creator_id').eq('id', match.game_id).single()
  if (game?.creator_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  const winner_team = match.score_team1 > match.score_team2 ? 1 : 2

  const { data, error } = await supabase
    .from('matches')
    .update({ status: 'completed', winner_team })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ match: data })
})

export default router
