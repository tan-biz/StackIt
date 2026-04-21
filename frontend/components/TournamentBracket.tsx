'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface TournamentBracketProps {
  gameId: string
  players: any[]
  game: any
  currentProfile: any
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function nextPowerOf2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

export default function TournamentBracket({ gameId, players, game, currentProfile }: TournamentBracketProps) {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const isCreator = game.creator_id === currentProfile?.id

  useEffect(() => { loadMatches() }, [gameId])

  const loadMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*, p1:team1_player1(id, nickname), p2:team2_player1(id, nickname)')
      .eq('game_id', gameId)
      .order('round', { ascending: true })
      .order('created_at', { ascending: true })
    setMatches(data || [])
    setLoading(false)
  }

  // Organize matches by round
  const roundGroups = useMemo(() => {
    const groups: Record<number, any[]> = {}
    matches.forEach(m => {
      if (!groups[m.round]) groups[m.round] = []
      groups[m.round].push(m)
    })
    return groups
  }, [matches])

  // Compute total rounds needed
  const totalRounds = useMemo(() => {
    if (matches.length === 0) return 0
    const r1Count = (roundGroups[1] || []).length
    return Math.ceil(Math.log2(r1Count * 2))
  }, [matches, roundGroups])

  // Build bracket rounds with empty slots for future rounds
  const bracketRounds = useMemo(() => {
    if (matches.length === 0) return []
    const rounds: { round: number; slots: any[] }[] = []
    const r1Matches = roundGroups[1] || []
    const bracketSize = nextPowerOf2(r1Matches.length)

    for (let r = 1; r <= totalRounds; r++) {
      const expectedCount = bracketSize / Math.pow(2, r - 1)
      const actualMatches = roundGroups[r] || []
      const slots: any[] = []
      for (let i = 0; i < expectedCount; i++) {
        slots.push(actualMatches[i] || { id: `tbd-${r}-${i}`, empty: true, round: r })
      }
      rounds.push({ round: r, slots })
    }
    return rounds
  }, [matches, roundGroups, totalRounds])

  // Find the champion
  const champion = useMemo(() => {
    if (bracketRounds.length === 0) return null
    const finalRound = bracketRounds[bracketRounds.length - 1]
    if (!finalRound || finalRound.slots.length === 0) return null
    const finalMatch = finalRound.slots[0]
    if (finalMatch.empty || finalMatch.status !== 'completed') return null
    return finalMatch.winner_team === 1 ? finalMatch.p1 : finalMatch.p2
  }, [bracketRounds])

  const generateBracket = async () => {
    setGenerating(true)
    const playerIds = shuffle(players.map(p => p.player_id))

    const matchInserts = []
    for (let i = 0; i < playerIds.length; i += 2) {
      if (i + 1 < playerIds.length) {
        matchInserts.push({
          game_id: gameId,
          team1_player1: playerIds[i],
          team2_player1: playerIds[i + 1],
          score_team1: 0,
          score_team2: 0,
          round: 1,
          status: 'pending',
        })
      }
    }

    await supabase.from('matches').insert(matchInserts)
    await supabase.from('games').update({ status: 'active' }).eq('id', gameId)
    await loadMatches()
    setGenerating(false)
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
    const winnerId = winner === 1 ? match.team1_player1 : match.team2_player1

    // Complete this match
    await supabase.from('matches').update({ status: 'completed', winner_team: winner }).eq('id', matchId)

    // Advance winner to next round
    const currentRound = match.round
    const nextRound = currentRound + 1
    const roundMatches = roundGroups[currentRound] || []
    const matchIndex = roundMatches.findIndex((m: any) => m.id === matchId)
    const nextMatchIndex = Math.floor(matchIndex / 2)
    const isTopSlot = matchIndex % 2 === 0

    // Check if next round match exists
    const nextRoundMatches = roundGroups[nextRound] || []
    const existingNext = nextRoundMatches[nextMatchIndex]

    if (existingNext && !existingNext.empty) {
      // Update existing next match
      const updateField = isTopSlot ? 'team1_player1' : 'team2_player1'
      await supabase.from('matches').update({ [updateField]: winnerId }).eq('id', existingNext.id)
    } else if (nextRound <= totalRounds) {
      // Need to create the next round match
      // Check if the other match in this pair is also completed
      const pairIndex = isTopSlot ? matchIndex + 1 : matchIndex - 1
      const pairMatch = roundMatches[pairIndex]

      if (pairMatch && pairMatch.status === 'completed') {
        const pairWinnerId = pairMatch.winner_team === 1 ? pairMatch.team1_player1 : pairMatch.team2_player1
        const t1 = isTopSlot ? winnerId : pairWinnerId
        const t2 = isTopSlot ? pairWinnerId : winnerId

        await supabase.from('matches').insert({
          game_id: gameId,
          team1_player1: t1,
          team2_player1: t2,
          score_team1: 0,
          score_team2: 0,
          round: nextRound,
          status: 'pending',
        })
      }
    }

    await loadMatches()
  }

  if (loading) return <div className="glass rounded-2xl p-8 text-center text-gray-400">Loading bracket...</div>

  // No matches yet — show player list + generate button
  if (matches.length === 0) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Players ({players.length})</h3>
            {isCreator && players.length >= 2 && (
              <button
                onClick={generateBracket}
                disabled={generating}
                className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-dark font-bold rounded-xl text-sm hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {generating ? 'Generating...' : '🏆 Generate Bracket'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {players.map((p: any) => (
              <span key={p.player_id} className="px-3 py-1.5 bg-white/10 rounded-full text-sm font-semibold">
                {p.profiles?.nickname}
              </span>
            ))}
            {players.length < 2 && (
              <span className="text-gray-500 text-sm">Waiting for more players to join...</span>
            )}
          </div>
        </div>
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-5xl mb-4">🏆</p>
          <p className="text-gray-400">
            {isCreator ? 'Add at least 2 players then generate the bracket!' : 'Waiting for the host to generate the bracket...'}
          </p>
        </div>
      </div>
    )
  }

  // Calculate visual bracket height
  const matchHeight = 88
  const matchGap = 12
  const r1Count = bracketRounds[0]?.slots.length || 1
  const bracketHeight = r1Count * matchHeight + (r1Count - 1) * matchGap

  return (
    <div className="animate-fade-in space-y-6">
      {/* Players list */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-bold text-lg mb-3">Players ({players.length})</h3>
        <div className="flex flex-wrap gap-2">
          {players.map((p: any) => (
            <span key={p.player_id} className="px-3 py-1.5 bg-white/10 rounded-full text-sm font-semibold">
              {p.profiles?.nickname}
            </span>
          ))}
        </div>
      </div>

      {/* Champion banner */}
      {champion && (
        <div className="glass rounded-2xl p-6 text-center border-2 border-yellow-500/50 bg-yellow-500/5">
          <p className="text-4xl mb-2">👑</p>
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">Champion</p>
          <p className="font-display text-3xl text-gradient">{champion.nickname}</p>
        </div>
      )}

      {/* Visual Bracket */}
      <div className="glass rounded-2xl p-6 overflow-x-auto">
        <h3 className="font-bold text-lg mb-4">Tournament Bracket</h3>
        <div className="bracket-container" style={{ minHeight: bracketHeight + 40 }}>
          <div className="bracket-wrapper">
            {bracketRounds.map((round, roundIdx) => (
              <div key={round.round} className="bracket-round-group">
                {/* Round column */}
                <div className="bracket-round" style={{ height: bracketHeight }}>
                  <div className="bracket-round-label">
                    {roundIdx === bracketRounds.length - 1
                      ? 'Final'
                      : roundIdx === bracketRounds.length - 2
                        ? 'Semis'
                        : `Round ${round.round}`}
                  </div>
                  <div className="bracket-matches" style={{ height: bracketHeight }}>
                    {round.slots.map((slot: any, idx: number) => (
                      <BracketMatchCard
                        key={slot.id}
                        match={slot}
                        isCreator={isCreator}
                        onUpdateScore={updateScore}
                        onComplete={completeMatch}
                      />
                    ))}
                  </div>
                </div>

                {/* Connector lines (not after last round) */}
                {roundIdx < bracketRounds.length - 1 && (
                  <div className="bracket-connectors" style={{ height: bracketHeight }}>
                    {Array.from({ length: Math.ceil(round.slots.length / 2) }).map((_, i) => (
                      <div key={i} className="bracket-connector-pair" />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Winner slot */}
            <div className="bracket-winner" style={{ height: bracketHeight }}>
              <div className="bracket-winner-slot">
                {champion ? (
                  <>
                    <span className="text-2xl">👑</span>
                    <span className="font-bold text-sm">{champion.nickname}</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">🏆</span>
                    <span className="text-xs text-gray-500">WINNER</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BracketMatchCard({ match, isCreator, onUpdateScore, onComplete }: any) {
  if (match.empty) {
    return (
      <div className="bracket-match bracket-match-empty">
        <div className="bracket-team">
          <span className="text-gray-600 text-xs">TBD</span>
        </div>
        <div className="bracket-divider" />
        <div className="bracket-team">
          <span className="text-gray-600 text-xs">TBD</span>
        </div>
      </div>
    )
  }

  const isCompleted = match.status === 'completed'
  const p1Name = match.p1?.nickname || 'Player 1'
  const p2Name = match.p2?.nickname || 'Player 2'

  return (
    <div className={`bracket-match ${isCompleted ? 'bracket-match-done' : ''}`}>
      {/* Team 1 */}
      <div className={`bracket-team ${match.winner_team === 1 ? 'bracket-team-winner' : ''}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          {match.winner_team === 1 && <span className="text-xs flex-shrink-0">👑</span>}
          <span className="font-semibold text-xs truncate">{p1Name}</span>
        </div>
        <div className="flex items-center gap-1">
          {isCreator && !isCompleted && (
            <button onClick={() => onUpdateScore(match.id, 'score_team1', -1)}
              className="bracket-score-btn">−</button>
          )}
          <span className="font-display text-sm text-primary w-5 text-center">{match.score_team1}</span>
          {isCreator && !isCompleted && (
            <button onClick={() => onUpdateScore(match.id, 'score_team1', 1)}
              className="bracket-score-btn bracket-score-btn-plus">+</button>
          )}
        </div>
      </div>

      <div className="bracket-divider" />

      {/* Team 2 */}
      <div className={`bracket-team ${match.winner_team === 2 ? 'bracket-team-winner' : ''}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          {match.winner_team === 2 && <span className="text-xs flex-shrink-0">👑</span>}
          <span className="font-semibold text-xs truncate">{p2Name}</span>
        </div>
        <div className="flex items-center gap-1">
          {isCreator && !isCompleted && (
            <button onClick={() => onUpdateScore(match.id, 'score_team2', -1)}
              className="bracket-score-btn">−</button>
          )}
          <span className="font-display text-sm text-primary w-5 text-center">{match.score_team2}</span>
          {isCreator && !isCompleted && (
            <button onClick={() => onUpdateScore(match.id, 'score_team2', 1)}
              className="bracket-score-btn bracket-score-btn-plus">+</button>
          )}
        </div>
      </div>

      {/* Complete button */}
      {isCreator && !isCompleted && (match.score_team1 > 0 || match.score_team2 > 0) && (
        <button
          onClick={() => onComplete(match.id)}
          className="bracket-complete-btn"
        >
          ✓ Done
        </button>
      )}
    </div>
  )
}
