'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Scoreboard from '@/components/Scoreboard'

export default function GameTvPage() {
  const { id } = useParams()
  const router = useRouter()
  const [game, setGame] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }

      const [{ data: prof }, { data: gameData }, { data: playersData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('games').select('*, profiles!games_creator_id_fkey(nickname)').eq('id', id).single(),
        supabase.from('game_players').select('*, profiles(*)').eq('game_id', id),
      ])

      setProfile(prof)
      setGame(gameData)
      setPlayers(playersData || [])
      setLoading(false)
    }

    load()
  }, [id, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-display text-3xl text-gradient animate-pulse">Loading TV view...</div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="soft-card w-full max-w-md p-6 text-center">
          <p className="text-2xl font-black text-text">Game not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell max-w-none">
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => router.push(`/game/${id}`)}
          className="secondary-button h-11 w-11 rounded-xl p-0"
          aria-label="Back to Game"
          title="Back to Game"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
      <Scoreboard gameId={id as string} players={players} game={game} currentProfile={profile} tvMode />
    </div>
  )
}
