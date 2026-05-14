'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase'
import CreateGameModal from './CreateGameModal'
import JoinGameModal from './JoinGameModal'
import { publicBackendUrl } from '@/lib/backendUrl'

interface DashboardProps {
  profile: { id: string; name: string; nickname: string }
}

export default function Dashboard({ profile }: DashboardProps) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [games, setGames] = useState<any[]>([])
  const [courtsCount, setCourtsCount] = useState(0)
  const [loadingGames, setLoadingGames] = useState(true)

  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  const loadGames = async () => {
    const { data } = await supabase
      .from('game_players')
      .select('games(*, profiles!games_creator_id_fkey(nickname))')
      .eq('player_id', profile.id)
      .order('joined_at', { ascending: false })

    const joinedGames = (data || []).map((entry: any) => entry.games).filter(Boolean)
    const cutoff = Date.now() - 5 * 24 * 60 * 60 * 1000
    const visibleGames = joinedGames.filter((game: any) => {
      if (game.status !== 'completed') return true
      const endedAt = game.completed_at || game.created_at
      return new Date(endedAt).getTime() >= cutoff
    })

    setGames(visibleGames)
    setLoadingGames(false)
  }

  const loadCourtsCount = async () => {
    try {
      const backendUrl = publicBackendUrl()
      if (!backendUrl) {
        setCourtsCount(0)
        return
      }
      const response = await fetch(`${backendUrl}/api/court-registration`)
      if (!response.ok) {
        setCourtsCount(0)
        return
      }

      const data = await response.json()
      setCourtsCount(Array.isArray(data) ? data.length : 0)
    } catch {
      setCourtsCount(0)
    }
  }

  useEffect(() => {
    loadGames()
    loadCourtsCount()
  }, [profile.id])

  const actions = [
    {
      title: 'Create Game',
      desc: 'Start a fresh session, get a code, and invite your crew in one tap.',
      eyebrow: 'Host mode',
      onClick: () => setShowCreate(true),
    },
    {
      title: 'Join Game',
      desc: 'Hop in with a short code or scan a QR when someone already set things up.',
      eyebrow: 'Quick entry',
      onClick: () => setShowJoin(true),
    },
  ]

  return (
    <div className="page-stack">
      <section className="soft-card overflow-hidden p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">Ready to play</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-text sm:text-4xl">
              {timeGreeting}, <span className="text-gradient">{profile.nickname}</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-soft sm:text-base">
              Everything is tuned for quick phone use: fewer taps, clearer cards, and cozy spacing that still stretches nicely on larger screens.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="surface-muted p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-soft">Games</p>
              <p className="mt-2 text-3xl font-black text-primary">{games.length}</p>
            </div>
            <div className="rounded-[24px] bg-accent/25 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-soft">Pickleball Courts</p>
              <p className="mt-2 text-3xl font-black text-text">{courtsCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {actions.map(action => (
          <button
            key={action.title}
            onClick={action.onClick}
            className="soft-card p-5 text-left transition hover:-translate-y-1"
          >
            <span className="pill mb-4">{action.eyebrow}</span>
            <h2 className="text-xl font-black text-text">{action.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-soft">{action.desc}</p>
            <span className="mt-5 inline-flex items-center text-sm font-extrabold text-primary">
              Open
            </span>
          </button>
        ))}
      </section>

      <section className="soft-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-text">My Games</h2>
            <p className="mt-1 text-sm text-slate-soft">Your recent rooms and match spaces.</p>
          </div>
          <span className="pill">{games.length} total</span>
        </div>

        {loadingGames ? (
          <div className="space-y-3">
            {[0, 1, 2].map(index => (
              <div key={index} className="h-24 animate-pulse rounded-[24px] bg-secondary/20" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="surface-muted p-8 text-center">
            <p className="text-base font-bold text-text">No games yet</p>
            <p className="mt-2 text-sm text-slate-soft">Create one or join an existing room to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map(game => (
              <button
                key={game.id}
                onClick={() => router.push(`/game/${game.id}`)}
                className="w-full rounded-[24px] border border-primary/10 bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-text">{game.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-soft">
                      <span className="pill normal-case tracking-normal">{game.mode === 'tournament' ? 'Tournament' : 'Open Play'}</span>
                      <span className="pill normal-case tracking-normal">{game.format === 'doubles' ? 'Doubles' : 'Singles'}</span>
                      <span className="pill normal-case tracking-normal">by {game.profiles?.nickname}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-soft">
                      Created {formatDistanceToNow(new Date(game.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span
                    className={`pill shrink-0 ${
                      game.status === 'active'
                        ? 'status-live'
                        : game.status === 'completed'
                          ? 'status-complete'
                          : 'status-ready'
                    }`}
                  >
                    {game.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <CreateGameModal
          profile={profile}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            loadGames()
          }}
        />
      )}

      {showJoin && (
        <JoinGameModal
          profile={profile}
          onClose={() => setShowJoin(false)}
          onJoined={() => {
            setShowJoin(false)
            loadGames()
          }}
        />
      )}
    </div>
  )
}
