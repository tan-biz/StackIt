'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface OpenPlayManagerProps {
  gameId: string
  players: any[]
  game: any
  currentProfile: any
}

export default function OpenPlayManager({ gameId, players, game, currentProfile }: OpenPlayManagerProps) {
  const [matches, setMatches] = useState<any[]>([])
  const [queue, setQueue] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const isCreator = game.creator_id === currentProfile?.id
  const isDoubles = game.format === 'doubles'
  const playersPerMatch = isDoubles ? 4 : 2

  useEffect(() => {
    loadData()
  }, [gameId, players, game.format])

  const loadData = async () => {
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        p1:team1_player1(nickname),
        p1b:team1_player2(nickname),
        p2:team2_player1(nickname),
        p2b:team2_player2(nickname)
      `)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })

    setMatches(data || [])

    const playerIds = players.map(player => player.player_id)
    const recentPlayers = new Set(
      (data || [])
        .slice(0, 1)
        .flatMap((match: any) => [match.team1_player1, match.team1_player2, match.team2_player1, match.team2_player2].filter(Boolean))
    )
    setQueue([...playerIds].sort(playerId => (recentPlayers.has(playerId) ? 1 : -1)))
    setLoading(false)
  }

  const startNextMatch = async () => {
    if (queue.length < playersPerMatch) return

    const [p1, p2, p3, p4, ...rest] = queue
    const insertPayload = isDoubles
      ? {
          game_id: gameId,
          team1_player1: p1,
          team1_player2: p2,
          team2_player1: p3,
          team2_player2: p4,
          score_team1: 0,
          score_team2: 0,
          serving_team: 1,
          server_number: 1,
          round: matches.length + 1,
          status: 'active',
        }
      : {
          game_id: gameId,
          team1_player1: p1,
          team2_player1: p2,
          score_team1: 0,
          score_team2: 0,
          serving_team: 1,
          server_number: null,
          round: matches.length + 1,
          status: 'active',
        }

    const { data: match } = await supabase
      .from('matches')
      .insert(insertPayload)
      .select(`
        *,
        p1:team1_player1(nickname),
        p1b:team1_player2(nickname),
        p2:team2_player1(nickname),
        p2b:team2_player2(nickname)
      `)
      .single()

    setMatches(prev => (match ? [match, ...prev] : prev))
    setQueue(isDoubles ? [...rest, p1, p2, p3, p4].filter(Boolean) : [...rest, p1, p2])
    await supabase.from('games').update({ status: 'active' }).eq('id', gameId)
  }

  const updateScore = async (matchId: string, field: 'score_team1' | 'score_team2', delta: number) => {
    const match = matches.find(item => item.id === matchId)
    if (!match) return
    const newValue = Math.max(0, (match[field] || 0) + delta)
    await supabase.from('matches').update({ [field]: newValue }).eq('id', matchId)
    setMatches(prev => prev.map(item => (item.id === matchId ? { ...item, [field]: newValue } : item)))
  }

  const completeMatch = async (matchId: string) => {
    const match = matches.find(item => item.id === matchId)
    if (!match) return
    const winner = match.score_team1 > match.score_team2 ? 1 : 2
    await supabase.from('matches').update({ status: 'completed', winner_team: winner }).eq('id', matchId)
    setMatches(prev => prev.map(item => (item.id === matchId ? { ...item, status: 'completed', winner_team: winner } : item)))
  }

  const activeMatch = useMemo(() => matches.find(match => match.status === 'active'), [matches])
  const completedMatches = useMemo(() => matches.filter(match => match.status === 'completed'), [matches])
  const playerMap = Object.fromEntries(players.map(player => [player.player_id, player.profiles?.nickname]))

  if (loading) return <div className="soft-card p-6 text-center text-slate-soft">Loading...</div>

  return (
    <div className="page-stack">
      <section className="soft-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-text">Rotation Queue</h3>
            <p className="mt-1 text-sm text-slate-soft">The next players are highlighted first for fast phone scanning.</p>
          </div>
          {isCreator && !activeMatch && queue.length >= playersPerMatch && (
            <button onClick={startNextMatch} className="primary-button">
              Start Next Match
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {queue.map((playerId, index) => (
            <div
              key={`${playerId}-${index}`}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                index < playersPerMatch ? 'bg-accent/25 text-text' : 'bg-secondary/20 text-slate-soft'
              }`}
            >
              {playerMap[playerId] || playerId}
            </div>
          ))}
        </div>
      </section>

      {activeMatch && (
        <section className="soft-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Live match</p>
              <h3 className="text-xl font-black text-text">Current Court</h3>
            </div>
            {isCreator && (
              <button onClick={() => completeMatch(activeMatch.id)} className="secondary-button text-primary">
                End Match
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:items-center">
            <TeamColumn match={activeMatch} team={1} isCreator={isCreator} onUpdateScore={updateScore} />
            <div className="text-center">
              <span className="font-display text-3xl text-primary">VS</span>
            </div>
            <TeamColumn match={activeMatch} team={2} isCreator={isCreator} onUpdateScore={updateScore} />
          </div>
        </section>
      )}

      {completedMatches.length > 0 && (
        <section className="soft-card p-5 sm:p-6">
          <h3 className="text-xl font-black text-text">Match History</h3>
          <div className="mt-4 space-y-3">
            {completedMatches.map((match: any) => (
              <div key={match.id} className="rounded-[22px] bg-white/85 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className={match.winner_team === 1 ? 'font-black text-primary' : 'text-slate-soft'}>{formatTeamLabel(match, 1)}</span>
                  <span className="font-display text-2xl text-text">
                    {match.score_team1}-{match.score_team2}
                  </span>
                  <span className={`text-right ${match.winner_team === 2 ? 'font-black text-primary' : 'text-slate-soft'}`}>{formatTeamLabel(match, 2)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!activeMatch && completedMatches.length === 0 && (
        <section className="soft-card p-8 text-center">
          <p className="text-base font-bold text-text">
            {isCreator
              ? `Start the next match once at least ${playersPerMatch} players are ready.`
              : 'Waiting for the host to start the first match.'}
          </p>
        </section>
      )}
    </div>
  )
}

function TeamColumn({ match, team, isCreator, onUpdateScore }: any) {
  const scoreField = team === 1 ? 'score_team1' : 'score_team2'
  const names = team === 1 ? [match.p1?.nickname, match.p1b?.nickname] : [match.p2?.nickname, match.p2b?.nickname]

  return (
    <div className="rounded-[26px] bg-secondary/18 p-4 text-center">
      <div className="text-lg font-black text-text">{names.filter(Boolean).join(' / ') || 'Players'}</div>
      <div className="mt-4 flex items-center justify-center gap-3">
        {isCreator && (
          <button onClick={() => onUpdateScore(match.id, scoreField, -1)} className="secondary-button h-11 w-11 rounded-full p-0">
            -
          </button>
        )}
        <span className="font-display text-5xl text-primary">{match[scoreField]}</span>
        {isCreator && (
          <button onClick={() => onUpdateScore(match.id, scoreField, 1)} className="primary-button h-11 w-11 rounded-full p-0 shadow-none">
            +
          </button>
        )}
      </div>
    </div>
  )
}

function formatTeamLabel(match: any, team: 1 | 2) {
  const names = team === 1 ? [match.p1?.nickname, match.p1b?.nickname] : [match.p2?.nickname, match.p2b?.nickname]
  return names.filter(Boolean).join(' / ') || 'Players'
}
