'use client'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface TournamentBracketProps {
  gameId: string
  players: any[]
  game: any
  currentProfile: any
}

type Profile = {
  id?: string
  nickname?: string | null
  avatar_url?: string | null
}

type TournamentTeam = {
  id: string
  game_id: string
  player1_id: string
  player2_id: string
  p1?: Profile | null
  p2?: Profile | null
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
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
  const [teams, setTeams] = useState<TournamentTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [teamSaving, setTeamSaving] = useState(false)
  const [selectedPlayer1, setSelectedPlayer1] = useState('')
  const [selectedPlayer2, setSelectedPlayer2] = useState('')
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editPlayer1, setEditPlayer1] = useState('')
  const [editPlayer2, setEditPlayer2] = useState('')
  const isCreator = game.creator_id === currentProfile?.id
  const isDoubles = game.format === 'doubles'
  const playersPerMatch = isDoubles ? 4 : 2

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel(`tournament:${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_teams', filter: `game_id=eq.${gameId}` }, () => loadData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId])

  const loadData = async () => {
    const [{ data: matchData }, { data: teamData }] = await Promise.all([
      supabase
        .from('matches')
        .select(`
          *,
          p1:team1_player1(id, nickname, avatar_url),
          p1b:team1_player2(id, nickname, avatar_url),
          p2:team2_player1(id, nickname, avatar_url),
          p2b:team2_player2(id, nickname, avatar_url)
        `)
        .eq('game_id', gameId)
        .order('round', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('tournament_teams')
        .select('*, p1:player1_id(id, nickname, avatar_url), p2:player2_id(id, nickname, avatar_url)')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true }),
    ])

    setMatches(matchData || [])
    setTeams((teamData as TournamentTeam[]) || [])
    setLoading(false)
  }

  const assignedPlayerIds = useMemo(() => {
    return new Set(teams.flatMap(team => [team.player1_id, team.player2_id]))
  }, [teams])

  const availablePlayers = useMemo(() => {
    return players.filter(player => !assignedPlayerIds.has(player.player_id))
  }, [players, assignedPlayerIds])

  const availablePlayersForEdit = (teamId: string) => {
    const team = teams.find(item => item.id === teamId)
    const allowed = new Set(
      teams
        .filter(item => item.id !== teamId)
        .flatMap(item => [item.player1_id, item.player2_id])
    )
    return players.filter(player => !allowed.has(player.player_id) || player.player_id === team?.player1_id || player.player_id === team?.player2_id)
  }

  const roundGroups = useMemo(() => {
    const groups: Record<number, any[]> = {}
    matches.forEach(match => {
      if (!groups[match.round]) groups[match.round] = []
      groups[match.round].push(match)
    })
    return groups
  }, [matches])

  const totalRounds = useMemo(() => {
    if (matches.length === 0) return 0
    const r1Count = (roundGroups[1] || []).length
    return Math.ceil(Math.log2(r1Count * 2))
  }, [matches, roundGroups])

  const bracketRounds = useMemo(() => {
    if (matches.length === 0) return []
    const rounds: { round: number; slots: any[] }[] = []
    const r1Matches = roundGroups[1] || []
    const bracketSize = nextPowerOf2(r1Matches.length)

    for (let round = 1; round <= totalRounds; round++) {
      const expectedCount = bracketSize / Math.pow(2, round - 1)
      const actualMatches = roundGroups[round] || []
      const slots: any[] = []
      for (let i = 0; i < expectedCount; i++) {
        slots.push(actualMatches[i] || { id: `tbd-${round}-${i}`, empty: true, round })
      }
      rounds.push({ round, slots })
    }
    return rounds
  }, [matches, roundGroups, totalRounds])

  const champion = useMemo(() => {
    if (bracketRounds.length === 0) return null
    const finalMatch = bracketRounds[bracketRounds.length - 1]?.slots[0]
    if (!finalMatch || finalMatch.empty || finalMatch.status !== 'completed') return null
    return finalMatch.winner_team === 1 ? [finalMatch.p1, finalMatch.p1b].filter(Boolean) : [finalMatch.p2, finalMatch.p2b].filter(Boolean)
  }, [bracketRounds])

  const createTeam = async () => {
    if (!selectedPlayer1 || !selectedPlayer2 || selectedPlayer1 === selectedPlayer2) return
    setTeamSaving(true)
    await supabase.from('tournament_teams').insert({
      game_id: gameId,
      player1_id: selectedPlayer1,
      player2_id: selectedPlayer2,
    })
    setSelectedPlayer1('')
    setSelectedPlayer2('')
    await loadData()
    setTeamSaving(false)
  }

  const startEditTeam = (team: TournamentTeam) => {
    setEditingTeamId(team.id)
    setEditPlayer1(team.player1_id)
    setEditPlayer2(team.player2_id)
  }

  const saveTeamEdit = async () => {
    if (!editingTeamId || !editPlayer1 || !editPlayer2 || editPlayer1 === editPlayer2) return
    setTeamSaving(true)
    await supabase
      .from('tournament_teams')
      .update({ player1_id: editPlayer1, player2_id: editPlayer2 })
      .eq('id', editingTeamId)
    setEditingTeamId(null)
    setEditPlayer1('')
    setEditPlayer2('')
    await loadData()
    setTeamSaving(false)
  }

  const deleteTeam = async (teamId: string) => {
    setTeamSaving(true)
    await supabase.from('tournament_teams').delete().eq('id', teamId)
    if (editingTeamId === teamId) {
      setEditingTeamId(null)
      setEditPlayer1('')
      setEditPlayer2('')
    }
    await loadData()
    setTeamSaving(false)
  }

  const generateBracket = async () => {
    setGenerating(true)

    if (isDoubles) {
      const shuffledTeams = shuffle(teams)
      const matchInserts = []

      for (let i = 0; i < shuffledTeams.length; i += 2) {
        const team1 = shuffledTeams[i]
        const team2 = shuffledTeams[i + 1]
        if (!team1 || !team2) continue

        matchInserts.push({
          game_id: gameId,
          team1_player1: team1.player1_id,
          team1_player2: team1.player2_id,
          team2_player1: team2.player1_id,
          team2_player2: team2.player2_id,
          score_team1: 0,
          score_team2: 0,
          serving_team: 1,
          server_number: 1,
          round: 1,
          status: 'pending',
        })
      }

      if (matchInserts.length > 0) {
        await supabase.from('matches').insert(matchInserts)
        await supabase.from('games').update({ status: 'active' }).eq('id', gameId)
      }
    } else {
      const playerIds = shuffle(players.map(player => player.player_id))
      const matchInserts = []
      for (let i = 0; i < playerIds.length; i += 2) {
        if (i + 1 < playerIds.length) {
          matchInserts.push({
            game_id: gameId,
            team1_player1: playerIds[i],
            team2_player1: playerIds[i + 1],
            score_team1: 0,
            score_team2: 0,
            serving_team: 1,
            server_number: null,
            round: 1,
            status: 'pending',
          })
        }
      }

      if (matchInserts.length > 0) {
        await supabase.from('matches').insert(matchInserts)
        await supabase.from('games').update({ status: 'active' }).eq('id', gameId)
      }
    }

    await loadData()
    setGenerating(false)
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
    const winnerPlayers = winner === 1
      ? { team1_player1: match.team1_player1, team1_player2: match.team1_player2 }
      : { team1_player1: match.team2_player1, team1_player2: match.team2_player2 }

    await supabase.from('matches').update({ status: 'completed', winner_team: winner }).eq('id', matchId)

    const currentRound = match.round
    const nextRound = currentRound + 1
    const roundMatches = roundGroups[currentRound] || []
    const matchIndex = roundMatches.findIndex((item: any) => item.id === matchId)
    const nextMatchIndex = Math.floor(matchIndex / 2)
    const isTopSlot = matchIndex % 2 === 0
    const nextRoundMatches = roundGroups[nextRound] || []
    const existingNext = nextRoundMatches[nextMatchIndex]

    if (existingNext && !existingNext.empty) {
      const updatePayload = isTopSlot
        ? { team1_player1: winnerPlayers.team1_player1, team1_player2: winnerPlayers.team1_player2 }
        : { team2_player1: winnerPlayers.team1_player1, team2_player2: winnerPlayers.team1_player2 }
      await supabase.from('matches').update(updatePayload).eq('id', existingNext.id)
    } else if (nextRound <= totalRounds) {
      const pairIndex = isTopSlot ? matchIndex + 1 : matchIndex - 1
      const pairMatch = roundMatches[pairIndex]

      if (pairMatch && pairMatch.status === 'completed') {
        const pairWinner = pairMatch.winner_team === 1
          ? { player1: pairMatch.team1_player1, player2: pairMatch.team1_player2 }
          : { player1: pairMatch.team2_player1, player2: pairMatch.team2_player2 }

        const team1 = isTopSlot ? winnerPlayers : { team1_player1: pairWinner.player1, team1_player2: pairWinner.player2 }
        const team2 = isTopSlot
          ? { team2_player1: pairWinner.player1, team2_player2: pairWinner.player2 }
          : { team2_player1: winnerPlayers.team1_player1, team2_player2: winnerPlayers.team1_player2 }

        await supabase.from('matches').insert({
          game_id: gameId,
          team1_player1: team1.team1_player1,
          team1_player2: team1.team1_player2,
          team2_player1: team2.team2_player1,
          team2_player2: team2.team2_player2,
          score_team1: 0,
          score_team2: 0,
          serving_team: 1,
          server_number: isDoubles ? 1 : null,
          round: nextRound,
          status: 'pending',
        })
      }
    }

    await loadData()
  }

  if (loading) return <div className="glass rounded-2xl p-8 text-center text-gray-400">Loading bracket...</div>

  if (matches.length === 0) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Players ({players.length})</h3>
            {isCreator && (
              <button
                onClick={generateBracket}
                disabled={generating || (isDoubles ? teams.length < 2 : players.length < playersPerMatch)}
                className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-dark font-bold rounded-xl text-sm hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Bracket'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {players.map((player: any) => (
              <PlayerChip key={player.player_id} profile={player.profiles} />
            ))}
          </div>
        </div>

        {isDoubles && (
          <div className="glass rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-bold text-lg">Tournament Teams</h3>
                <p className="text-sm text-gray-400">Creators can create, edit, and remove doubles teams before generating the bracket.</p>
              </div>
            </div>

            {isCreator && (
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Player 1</label>
                  <select
                    value={selectedPlayer1}
                    onChange={e => setSelectedPlayer1(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  >
                    <option value="">Select player</option>
                    {availablePlayers.map((player: any) => (
                      <option key={player.player_id} value={player.player_id}>
                        {player.profiles?.nickname}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Player 2</label>
                  <select
                    value={selectedPlayer2}
                    onChange={e => setSelectedPlayer2(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  >
                    <option value="">Select player</option>
                    {availablePlayers.filter((player: any) => player.player_id !== selectedPlayer1).map((player: any) => (
                      <option key={player.player_id} value={player.player_id}>
                        {player.profiles?.nickname}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={createTeam}
                  disabled={teamSaving || !selectedPlayer1 || !selectedPlayer2 || selectedPlayer1 === selectedPlayer2}
                  className="px-5 py-3 rounded-xl bg-secondary/20 text-secondary font-bold disabled:opacity-50"
                >
                  Add Team
                </button>
              </div>
            )}

            {teams.length === 0 ? (
              <p className="text-gray-500 text-sm">No teams yet. Create at least 2 doubles teams to generate the tournament bracket.</p>
            ) : (
              <div className="space-y-3">
                {teams.map(team => {
                  const editablePlayers = availablePlayersForEdit(team.id)
                  const isEditing = editingTeamId === team.id
                  return (
                    <div key={team.id} className="glass rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      {isEditing ? (
                        <div className="grid gap-3 md:grid-cols-2 flex-1">
                          <select value={editPlayer1} onChange={e => setEditPlayer1(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                            <option value="">Select player</option>
                            {editablePlayers.map((player: any) => (
                              <option key={player.player_id} value={player.player_id}>
                                {player.profiles?.nickname}
                              </option>
                            ))}
                          </select>
                          <select value={editPlayer2} onChange={e => setEditPlayer2(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                            <option value="">Select player</option>
                            {editablePlayers.filter((player: any) => player.player_id !== editPlayer1).map((player: any) => (
                              <option key={player.player_id} value={player.player_id}>
                                {player.profiles?.nickname}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                          <TeamBadge profiles={[team.p1, team.p2]} />
                          <span className="text-sm text-gray-400">Ready for bracket</span>
                        </div>
                      )}

                      {isCreator && (
                        <div className="flex gap-2 flex-wrap">
                          {isEditing ? (
                            <>
                              <button onClick={saveTeamEdit} disabled={teamSaving || !editPlayer1 || !editPlayer2 || editPlayer1 === editPlayer2} className="px-4 py-2 rounded-xl bg-primary/20 text-primary font-semibold disabled:opacity-50">
                                Save
                              </button>
                              <button onClick={() => setEditingTeamId(null)} className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 font-semibold">
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button onClick={() => startEditTeam(team)} className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 font-semibold">
                              Edit
                            </button>
                          )}
                          <button onClick={() => deleteTeam(team.id)} disabled={teamSaving} className="px-4 py-2 rounded-xl bg-danger/10 text-danger border border-danger/30 font-semibold disabled:opacity-50">
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-gray-400">
            {isCreator
              ? isDoubles
                ? 'Create at least 2 doubles teams, then generate the bracket.'
                : `Add at least ${playersPerMatch} players then generate the bracket.`
              : 'Waiting for the host to generate the bracket...'}
          </p>
        </div>
      </div>
    )
  }

  const matchHeight = isDoubles ? 112 : 88
  const matchGap = 12
  const r1Count = bracketRounds[0]?.slots.length || 1
  const bracketHeight = r1Count * matchHeight + (r1Count - 1) * matchGap

  return (
    <div className="animate-fade-in space-y-6">
      <div className="glass rounded-2xl p-6">
        <h3 className="font-bold text-lg mb-3">Players ({players.length})</h3>
        <div className="flex flex-wrap gap-2">
          {players.map((player: any) => (
            <PlayerChip key={player.player_id} profile={player.profiles} />
          ))}
        </div>
      </div>

      {champion && (
        <div className="glass rounded-2xl p-6 text-center border-2 border-yellow-500/50 bg-yellow-500/5">
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-3">Champion</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {champion.map((profile: any, idx: number) => (
              <PlayerAvatar key={idx} profile={profile} size={52} textSize="text-lg" />
            ))}
            <p className="font-display text-3xl text-gradient">{champion.map((player: any) => player.nickname).join(' / ')}</p>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-6 overflow-x-auto">
        <h3 className="font-bold text-lg mb-4">Tournament Bracket</h3>
        <div className="bracket-container" style={{ minHeight: bracketHeight + 40 }}>
          <div className="bracket-wrapper">
            {bracketRounds.map((round, roundIndex) => (
              <div key={round.round} className="bracket-round-group">
                <div className="bracket-round" style={{ height: bracketHeight }}>
                  <div className="bracket-round-label">
                    {roundIndex === bracketRounds.length - 1 ? 'Final' : roundIndex === bracketRounds.length - 2 ? 'Semis' : `Round ${round.round}`}
                  </div>
                  <div className="bracket-matches" style={{ height: bracketHeight }}>
                    {round.slots.map((slot: any) => (
                      <BracketMatchCard
                        key={slot.id}
                        match={slot}
                        isCreator={isCreator}
                        isDoubles={isDoubles}
                        onUpdateScore={updateScore}
                        onComplete={completeMatch}
                      />
                    ))}
                  </div>
                </div>

                {roundIndex < bracketRounds.length - 1 && (
                  <div className="bracket-connectors" style={{ height: bracketHeight }}>
                    {Array.from({ length: Math.ceil(round.slots.length / 2) }).map((_, i) => (
                      <div key={i} className="bracket-connector-pair" />
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="bracket-winner" style={{ height: bracketHeight }}>
              <div className="bracket-winner-slot">
                {champion ? <span className="font-bold text-sm text-center">{champion.map((player: any) => player.nickname).join(' / ')}</span> : <span className="text-xs text-gray-500">WINNER</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BracketMatchCard({ match, isCreator, isDoubles, onUpdateScore, onComplete }: any) {
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

  return (
    <div className={`bracket-match ${isCompleted ? 'bracket-match-done' : ''}`}>
      <TeamRow
        profiles={[match.p1, match.p1b]}
        score={match.score_team1}
        winner={match.winner_team === 1}
        isCreator={isCreator}
        isCompleted={isCompleted}
        onMinus={() => onUpdateScore(match.id, 'score_team1', -1)}
        onPlus={() => onUpdateScore(match.id, 'score_team1', 1)}
        isDoubles={isDoubles}
      />
      <div className="bracket-divider" />
      <TeamRow
        profiles={[match.p2, match.p2b]}
        score={match.score_team2}
        winner={match.winner_team === 2}
        isCreator={isCreator}
        isCompleted={isCompleted}
        onMinus={() => onUpdateScore(match.id, 'score_team2', -1)}
        onPlus={() => onUpdateScore(match.id, 'score_team2', 1)}
        isDoubles={isDoubles}
      />

      {isCreator && !isCompleted && (match.score_team1 > 0 || match.score_team2 > 0) && (
        <button onClick={() => onComplete(match.id)} className="bracket-complete-btn">
          Done
        </button>
      )}
    </div>
  )
}

function TeamRow({ profiles, score, winner, isCreator, isCompleted, onMinus, onPlus, isDoubles }: any) {
  const visibleProfiles = (isDoubles ? profiles : profiles.slice(0, 1)).filter(Boolean)
  const label = visibleProfiles.map((profile: any) => profile.nickname).join(' / ') || 'Player'

  return (
    <div className={`bracket-team ${winner ? 'bracket-team-winner' : ''}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="flex -space-x-2">
          {visibleProfiles.map((profile: any, idx: number) => (
            <PlayerAvatar key={idx} profile={profile} size={24} textSize="text-[10px]" />
          ))}
        </div>
        <span className="font-semibold text-xs truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {isCreator && !isCompleted && (
          <button onClick={onMinus} className="bracket-score-btn">
            -
          </button>
        )}
        <span className="font-display text-sm text-primary w-5 text-center">{score}</span>
        {isCreator && !isCompleted && (
          <button onClick={onPlus} className="bracket-score-btn bracket-score-btn-plus">
            +
          </button>
        )}
      </div>
    </div>
  )
}

function TeamBadge({ profiles }: { profiles: Array<Profile | null | undefined> }) {
  const visibleProfiles = profiles.filter(Boolean) as Profile[]
  return (
    <div className="inline-flex items-center gap-3">
      <div className="flex -space-x-2">
        {visibleProfiles.map((profile, index) => (
          <PlayerAvatar key={index} profile={profile} size={28} textSize="text-[10px]" />
        ))}
      </div>
      <span className="font-semibold">{visibleProfiles.map(profile => profile.nickname).join(' / ')}</span>
    </div>
  )
}

function PlayerChip({ profile }: { profile?: Profile }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-sm font-semibold">
      <PlayerAvatar profile={profile} size={24} textSize="text-[10px]" />
      <span>{profile?.nickname || 'Player'}</span>
    </span>
  )
}

function PlayerAvatar({ profile, size, textSize }: { profile?: Profile; size: number; textSize: string }) {
  const initials = profile?.nickname?.slice(0, 2).toUpperCase() || '?'

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary font-bold text-dark ${textSize}`}
      style={{ width: size, height: size }}
    >
      {profile?.avatar_url ? (
        <Image src={profile.avatar_url} alt={profile.nickname || 'Player avatar'} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}
