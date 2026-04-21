'use client'
import { useState, useEffect } from 'react'
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

  useEffect(() => {
    loadData()
  }, [gameId, players])

  const loadData = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*, p1:team1_player1(nickname), p2:team2_player1(nickname)')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
    setMatches(data || [])

    // Build queue from player list — those who haven't played recently go first
    const playerIds = players.map(p => p.player_id)
    const recentPlayers = new Set(
      (data || []).slice(0, 1).flatMap((m: any) => [m.team1_player1, m.team2_player1])
    )
    const sorted = [...playerIds].sort((a) => (recentPlayers.has(a) ? 1 : -1))
    setQueue(sorted)
    setLoading(false)
  }

  const startNextMatch = async () => {
    if (queue.length < 2) return
    const [p1, p2, ...rest] = queue

    const { data: match } = await supabase.from('matches').insert({
      game_id: gameId,
      team1_player1: p1,
      team2_player1: p2,
      score_team1: 0,
      score_team2: 0,
      round: matches.length + 1,
      status: 'active',
    }).select('*, p1:team1_player1(nickname), p2:team2_player1(nickname)').single()

    setMatches(prev => [match, ...prev])
    // Move p1, p2 to end of queue (fair rotation)
    setQueue([...rest, p1, p2])
    await supabase.from('games').update({ status: 'active' }).eq('id', gameId)
  }

  const updateScore = async (matchId: string, field: 'score_team1' | 'score_team2', delta: number) => {
    const match = matches.find(m => m.id === matchId)
    if (!match) return
    const newVal = Math.max(0, (match[field] || 0) + delta)
    await supabase.from('matches').update({ [field]: newVal }).eq('id', matchId)
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, [field]: newVal } : m))
  }

  const completeMatch = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId)
    if (!match) return
    const winner = match.score_team1 > match.score_team2 ? 1 : 2
    await supabase.from('matches').update({ status: 'completed', winner_team: winner }).eq('id', matchId)
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: 'completed', winner_team: winner } : m))
  }

  const activeMatch = matches.find(m => m.status === 'active')
  const completedMatches = matches.filter(m => m.status === 'completed')
  const playerMap = Object.fromEntries(players.map(p => [p.player_id, p.profiles?.nickname]))

  if (loading) return <div className="glass rounded-2xl p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="animate-fade-in space-y-6">
      {/* Queue */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">🔄 Rotation Queue</h3>
          {isCreator && !activeMatch && players.length >= 2 && (
            <button
              onClick={startNextMatch}
              className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-dark font-bold rounded-xl text-sm hover:-translate-y-0.5 transition-all"
            >
              ▶ Start Next Match
            </button>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          {queue.map((pid, i) => (
            <div key={pid} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              i === 0 ? 'bg-primary/20 text-primary border border-primary/30' :
              i === 1 ? 'bg-secondary/20 text-secondary border border-secondary/30' :
              'bg-white/10'
            }`}>
              {i === 0 && <span>🥇</span>}
              {i === 1 && <span>🥈</span>}
              {playerMap[pid] || pid}
            </div>
          ))}
        </div>
      </div>

      {/* Active Match */}
      {activeMatch && (
        <div>
          <h3 className="font-bold text-lg mb-3 text-primary">⚡ Live Match</h3>
          <div className="glass rounded-2xl p-6 border border-primary/30 glow-cyan">
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <div className="text-xl font-bold mb-2">{activeMatch.p1?.nickname}</div>
                <div className="flex items-center justify-center gap-3">
                  {isCreator && (
                    <button onClick={() => updateScore(activeMatch.id, 'score_team1', -1)}
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all font-bold">−</button>
                  )}
                  <span className="font-display text-5xl text-primary">{activeMatch.score_team1}</span>
                  {isCreator && (
                    <button onClick={() => updateScore(activeMatch.id, 'score_team1', 1)}
                      className="w-9 h-9 rounded-full bg-primary/20 hover:bg-primary/40 transition-all font-bold">+</button>
                  )}
                </div>
              </div>

              <div className="text-center">
                <span className="font-display text-2xl text-gray-500">VS</span>
                {isCreator && (
                  <button
                    onClick={() => completeMatch(activeMatch.id)}
                    className="block w-full mt-3 py-2 bg-success/20 hover:bg-success/30 border border-success/30 text-success rounded-xl text-xs font-bold transition-all"
                  >
                    ✓ End Match
                  </button>
                )}
              </div>

              <div className="text-center">
                <div className="text-xl font-bold mb-2">{activeMatch.p2?.nickname}</div>
                <div className="flex items-center justify-center gap-3">
                  {isCreator && (
                    <button onClick={() => updateScore(activeMatch.id, 'score_team2', -1)}
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all font-bold">−</button>
                  )}
                  <span className="font-display text-5xl text-primary">{activeMatch.score_team2}</span>
                  {isCreator && (
                    <button onClick={() => updateScore(activeMatch.id, 'score_team2', 1)}
                      className="w-9 h-9 rounded-full bg-primary/20 hover:bg-primary/40 transition-all font-bold">+</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {completedMatches.length > 0 && (
        <div>
          <h3 className="font-bold text-lg mb-3 text-gray-400">📜 Match History</h3>
          <div className="space-y-2">
            {completedMatches.map((m: any) => (
              <div key={m.id} className="glass rounded-xl px-5 py-3 flex items-center justify-between text-sm opacity-70">
                <span className={m.winner_team === 1 ? 'text-success font-bold' : ''}>{m.p1?.nickname}</span>
                <span className="font-mono text-gray-400">{m.score_team1} – {m.score_team2}</span>
                <span className={m.winner_team === 2 ? 'text-success font-bold' : ''}>{m.p2?.nickname}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!activeMatch && completedMatches.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-5xl mb-4">🎯</p>
          <p className="text-gray-400">
            {isCreator ? 'Press "Start Next Match" to begin fair rotation play!' : 'Waiting for host to start the first match...'}
          </p>
        </div>
      )}
    </div>
  )
}
