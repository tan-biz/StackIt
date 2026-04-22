'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase'
import CreateGameModal from './CreateGameModal'
import JoinGameModal from './JoinGameModal'

interface DashboardProps {
  profile: { id: string; name: string; nickname: string }
}

export default function Dashboard({ profile }: DashboardProps) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [games, setGames] = useState<any[]>([])
  const [loadingGames, setLoadingGames] = useState(true)

  const loadGames = async () => {
    const { data } = await supabase
      .from('game_players')
      .select('games(*, profiles!games_creator_id_fkey(nickname))')
      .eq('player_id', profile.id)
      .order('joined_at', { ascending: false })

    const g = (data || []).map((d: any) => d.games).filter(Boolean)
    setGames(g)
    setLoadingGames(false)
  }

  useEffect(() => {
    loadGames()
  }, [profile.id])

  const actions = [
    {
      icon: 'Create',
      title: 'Create Game',
      desc: 'Start a new game and invite players with a unique code',
      onClick: () => setShowCreate(true),
      accent: 'from-primary to-primary-dark',
    },
    {
      icon: 'Join',
      title: 'Join Game',
      desc: 'Enter a game code or scan QR to join an active game',
      onClick: () => setShowJoin(true),
      accent: 'from-secondary to-amber-400',
    },
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">Welcome back, {profile.nickname}!</h1>
        <p className="text-gray-400 text-lg">Ready to organize your next pickleball game?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {actions.map(action => (
          <button
            key={action.title}
            onClick={action.onClick}
            className="glass rounded-2xl p-8 text-left hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all group"
          >
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.accent} flex items-center justify-center text-sm font-bold mb-5 group-hover:scale-110 transition-transform`}>
              {action.icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{action.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{action.desc}</p>
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-5">My Games</h2>
        {loadingGames ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="glass rounded-2xl h-20 animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-gray-400">No games yet. Create or join one to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map(game => (
              <button
                key={game.id}
                onClick={() => router.push(`/game/${game.id}`)}
                className="w-full glass rounded-2xl p-5 flex items-center justify-between hover:border-primary/50 hover:translate-x-1 transition-all group"
              >
                <div className="text-left">
                  <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{game.name}</h4>
                  <div className="flex gap-4 text-gray-400 text-sm mt-1 flex-wrap">
                    <span>{game.mode === 'tournament' ? 'Tournament' : 'Open Play'}</span>
                    <span>{game.format === 'doubles' ? 'Doubles' : 'Singles'}</span>
                    <span>by {game.profiles?.nickname}</span>
                    <span>{formatDistanceToNow(new Date(game.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${
                    game.status === 'active'
                      ? 'bg-success/20 text-success'
                      : game.status === 'completed'
                        ? 'bg-gray-600/30 text-gray-400'
                        : 'bg-secondary/20 text-secondary'
                  }`}
                >
                  {game.status}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
