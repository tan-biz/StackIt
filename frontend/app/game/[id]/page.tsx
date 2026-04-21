'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import TournamentBracket from '@/components/TournamentBracket'
import OpenPlayManager from '@/components/OpenPlayManager'
import Scoreboard from '@/components/Scoreboard'

export default function GamePage() {
  const { id } = useParams()
  const router = useRouter()
  const [game, setGame] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'bracket' | 'scoreboard'>('bracket')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

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

    // Realtime subscription
    const channel = supabase
      .channel(`game:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `game_id=eq.${id}` }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, router])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="font-display text-3xl text-gradient animate-pulse">Loading game...</div>
    </div>
  )

  if (!game) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-2xl mb-4">Game not found</p>
        <button onClick={() => router.push('/dashboard')} className="text-primary underline">Back to Dashboard</button>
      </div>
    </div>
  )

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-5 py-5">
      <Header profile={profile} />

      <div className="animate-fade-in">
        {/* Game Header */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-primary text-sm mb-2 transition-colors">
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold">{game.name}</h1>
              <div className="flex gap-4 mt-2 text-gray-400 text-sm">
                <span>{game.mode === 'tournament' ? '🏆 Tournament' : '🎯 Open Play'}</span>
                <span>👥 {players.length} players</span>
                <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">#{game.code}</span>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${
              game.status === 'active' ? 'bg-success/20 text-success' :
              game.status === 'completed' ? 'bg-gray-500/20 text-gray-400' :
              'bg-secondary/20 text-secondary'
            }`}>
              {game.status}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['bracket', 'scoreboard'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-semibold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-primary text-dark'
                  : 'glass text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'bracket' ? (game.mode === 'tournament' ? '🏆 Bracket' : '🔄 Rotation') : '📊 Scoreboard'}
            </button>
          ))}
        </div>

        {activeTab === 'bracket' ? (
          game.mode === 'tournament'
            ? <TournamentBracket gameId={id as string} players={players} game={game} currentProfile={profile} />
            : <OpenPlayManager gameId={id as string} players={players} game={game} currentProfile={profile} />
        ) : (
          <Scoreboard gameId={id as string} players={players} />
        )}
      </div>
    </div>
  )
}
