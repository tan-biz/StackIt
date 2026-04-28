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
  const [busyAction, setBusyAction] = useState<'leave' | 'delete' | null>(null)

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

    const channel = supabase
      .channel(`game:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `game_id=eq.${id}` }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-display text-3xl text-gradient animate-pulse">Loading game...</div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="soft-card w-full max-w-md p-6 text-center">
          <p className="text-2xl font-black text-text">Game not found</p>
          <button onClick={() => router.push('/dashboard')} className="primary-button mt-4">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const isCreator = game.creator_id === profile?.id

  const handleLeave = async () => {
    if (!profile?.id) return
    setBusyAction('leave')
    await supabase.from('game_players').delete().eq('game_id', id).eq('player_id', profile.id)
    router.push('/dashboard')
  }

  const handleDelete = async () => {
    setBusyAction('delete')
    await supabase.from('games').delete().eq('id', id)
    router.push('/dashboard')
  }

  const tabs = [
    { value: 'bracket' as const, label: game.mode === 'tournament' ? 'Bracket' : 'Rotation' },
    { value: 'scoreboard' as const, label: 'Scoreboard' },
  ]

  return (
    <div className="app-shell">
      <Header profile={profile} />

      <div className="page-stack">
        <section className="soft-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <button
                onClick={() => router.push('/dashboard')}
                className="secondary-button -ml-1 mb-2 h-11 w-11 rounded-xl p-0"
                aria-label="Back to Dashboard"
                title="Back to Dashboard"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <h1 className="text-3xl font-black text-text sm:text-4xl">{game.name}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="pill normal-case tracking-normal">{game.mode === 'tournament' ? 'Tournament' : 'Open Play'}</span>
                <span className="pill normal-case tracking-normal">{game.format === 'doubles' ? 'Doubles' : 'Singles'}</span>
                <span className="pill normal-case tracking-normal">{players.length} players</span>
                <span className="pill bg-accent/20 normal-case tracking-normal text-text">#{game.code}</span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <span className={`pill ${game.status === 'active' ? 'status-live' : game.status === 'completed' ? 'status-complete' : 'status-ready'}`}>
                {game.status}
              </span>
              {!isCreator ? (
                <button onClick={handleLeave} disabled={busyAction !== null} className="secondary-button text-danger">
                  {busyAction === 'leave' ? 'Leaving...' : 'Leave Game'}
                </button>
              ) : (
                <button onClick={handleDelete} disabled={busyAction !== null} className="secondary-button text-danger">
                  {busyAction === 'delete' ? 'Deleting...' : 'Delete Game'}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] bg-secondary/20 p-1.5">
          <div className="grid grid-cols-2 gap-2">
            {tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`rounded-[22px] px-4 py-3 text-sm font-extrabold transition ${
                  activeTab === tab.value ? 'bg-white text-text shadow-sm' : 'text-slate-soft'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === 'bracket' ? (
          game.mode === 'tournament' ? (
            <TournamentBracket gameId={id as string} players={players} game={game} currentProfile={profile} />
          ) : (
            <OpenPlayManager gameId={id as string} players={players} game={game} currentProfile={profile} />
          )
        ) : (
          <Scoreboard gameId={id as string} players={players} game={game} currentProfile={profile} />
        )}
      </div>
    </div>
  )
}
