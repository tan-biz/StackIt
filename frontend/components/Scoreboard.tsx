'use client'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface ScoreboardProps {
  gameId: string
  players: any[]
  game: any
  currentProfile: any
}

type PlayerProfile = {
  nickname?: string | null
  avatar_url?: string | null
}

const EMPTY_PROFILE: PlayerProfile = {
  nickname: 'Player',
  avatar_url: null,
}

export default function Scoreboard({ gameId, players, game, currentProfile }: ScoreboardProps) {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const isManager = game.creator_id === currentProfile?.id
  const isDoubles = game.format === 'doubles'

  useEffect(() => {
    const loadMatches = async () => {
      const { data } = await supabase
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
        .order('created_at', { ascending: true })

      setMatches(data || [])
      setLoading(false)
    }

    loadMatches()

    const channel = supabase
      .channel(`scoreboard:${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `game_id=eq.${gameId}` }, loadMatches)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId])

  const stats = useMemo(() => {
    const playerMap = Object.fromEntries(
      players.map(p => [
        p.player_id,
        {
          nickname: p.profiles?.nickname || 'Player',
          avatar_url: p.profiles?.avatar_url || null,
        },
      ])
    )

    const statsMap: Record<string, { wins: number; losses: number; pointsFor: number; pointsAgainst: number; nickname: string; avatar_url: string | null }> = {}

    players.forEach(p => {
      statsMap[p.player_id] = {
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        nickname: playerMap[p.player_id]?.nickname || 'Player',
        avatar_url: playerMap[p.player_id]?.avatar_url || null,
      }
    })

    matches
      .filter(m => m.status === 'completed')
      .forEach((m: any) => {
        const team1 = [m.team1_player1, m.team1_player2].filter(Boolean)
        const team2 = [m.team2_player1, m.team2_player2].filter(Boolean)

        team1.forEach((pid: string) => {
          if (!statsMap[pid]) return
          statsMap[pid].pointsFor += m.score_team1
          statsMap[pid].pointsAgainst += m.score_team2
          if (m.winner_team === 1) statsMap[pid].wins += 1
          else statsMap[pid].losses += 1
        })

        team2.forEach((pid: string) => {
          if (!statsMap[pid]) return
          statsMap[pid].pointsFor += m.score_team2
          statsMap[pid].pointsAgainst += m.score_team1
          if (m.winner_team === 2) statsMap[pid].wins += 1
          else statsMap[pid].losses += 1
        })
      })

    return Object.entries(statsMap)
      .map(([pid, s]) => ({ pid, ...s }))
      .sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst))
  }, [matches, players])

  const featuredMatch = useMemo(() => {
    if (matches.length === 0) return null
    return matches.find(m => m.status === 'active') || matches.find(m => m.status === 'pending') || [...matches].reverse().find(m => m.status === 'completed') || matches[0]
  }, [matches])

  const supportingMatches = useMemo(() => {
    if (!featuredMatch) return []
    return matches.filter(m => m.id !== featuredMatch.id).slice(0, 4)
  }, [featuredMatch, matches])

  const updateScore = async (matchId: string, field: 'score_team1' | 'score_team2', delta: number) => {
    const match = matches.find(m => m.id === matchId)
    if (!match || match.status === 'completed') return

    const newVal = Math.max(0, (match[field] || 0) + delta)
    const { error } = await supabase.from('matches').update({ [field]: newVal }).eq('id', matchId)
    if (error) return

    setMatches(prev => prev.map(m => (m.id === matchId ? { ...m, [field]: newVal } : m)))
  }

  const updateServer = async (matchId: string, servingTeam: 1 | 2, serverNumber: 1 | 2 | null) => {
    const match = matches.find(m => m.id === matchId)
    if (!match || match.status === 'completed') return

    const payload = { serving_team: servingTeam, server_number: serverNumber }
    const { error } = await supabase.from('matches').update(payload).eq('id', matchId)
    if (error) return

    setMatches(prev => prev.map(m => (m.id === matchId ? { ...m, ...payload } : m)))
  }

  if (loading) return <div className="glass rounded-2xl p-8 text-center text-gray-400">Loading scoreboard...</div>

  if (matches.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-2xl font-display text-gradient mb-3">Broadcast Scoreboard</p>
        <p className="text-gray-400">Start a match or generate the bracket to show scores here.</p>
      </div>
    )
  }

  if (!featuredMatch) {
    return <div className="glass rounded-2xl p-8 text-center text-gray-400">Loading featured match...</div>
  }

  return (
    <div className="animate-fade-in space-y-6">
      <section className="glass rounded-[28px] p-4 md:p-6 border border-cyan-400/20 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
        <div className="scoreboard-shell rounded-[24px] overflow-hidden">
          <div className="scoreboard-topbar px-4 py-3 md:px-6 md:py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">Broadcast Scoreboard</p>
              <h3 className="font-display text-2xl md:text-3xl">{game.name}</h3>
            </div>
            <div className="flex items-center gap-3 text-xs md:text-sm flex-wrap">
              <StatusPill status={featuredMatch.status} />
              <span className="scoreboard-chip">{isDoubles ? 'Doubles' : 'Singles'}</span>
              <span className="scoreboard-chip">Game #{game.code}</span>
              <span className="scoreboard-chip">{players.length} Players</span>
            </div>
          </div>

          <FeaturedScoreCard
            match={featuredMatch}
            isManager={isManager}
            isDoubles={isDoubles}
            onUpdateScore={updateScore}
            onUpdateServer={updateServer}
          />
        </div>
      </section>

      {supportingMatches.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          {supportingMatches.map(match => (
            <CompactScoreCard
              key={match.id}
              match={match}
              isManager={isManager}
              isDoubles={isDoubles}
              onUpdateScore={updateScore}
              onUpdateServer={updateServer}
            />
          ))}
        </section>
      )}

      <section className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <h3 className="font-bold text-lg">Standings</h3>
          <span className="text-xs text-gray-500 uppercase tracking-[0.2em]">
            {isDoubles ? 'Team scoring rules, player standings' : 'Singles scoring and point differential'}
          </span>
        </div>

        <div className="divide-y divide-white/5">
          <div className="px-6 py-3 grid grid-cols-[minmax(0,1.5fr)_60px_60px_80px_80px] text-xs text-gray-500 font-semibold uppercase tracking-wider">
            <span>Player</span>
            <span className="text-center">W</span>
            <span className="text-center">L</span>
            <span className="text-center">PF</span>
            <span className="text-center">PA</span>
          </div>

          {stats.map((s, i) => (
            <div key={s.pid} className={`px-6 py-4 grid grid-cols-[minmax(0,1.5fr)_60px_60px_80px_80px] items-center gap-2 ${i === 0 && s.wins > 0 ? 'bg-secondary/5' : ''}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-7 text-center text-sm font-bold text-cyan-100/70">#{i + 1}</span>
                <PlayerAvatar profile={s} size={40} />
                <div className="min-w-0">
                  <div className="font-bold truncate">{s.nickname}</div>
                  {s.wins > 0 && s.losses === 0 && (
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-[0.2em] bg-success/15 text-success px-2 py-1 rounded-full">
                      Undefeated
                    </span>
                  )}
                </div>
              </div>
              <span className="text-center text-success font-bold">{s.wins}</span>
              <span className="text-center text-danger">{s.losses}</span>
              <span className="text-center text-gray-300">{s.pointsFor}</span>
              <span className="text-center text-gray-500">{s.pointsAgainst}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function FeaturedScoreCard({ match, isManager, isDoubles, onUpdateScore, onUpdateServer }: any) {
  return (
    <div className="scoreboard-main px-3 py-4 md:px-6 md:py-6">
      <ScoreSide
        match={match}
        team="team1"
        profiles={[match.p1 || EMPTY_PROFILE, match.p1b]}
        isManager={isManager}
        isDoubles={isDoubles}
        onUpdateScore={onUpdateScore}
        onUpdateServer={onUpdateServer}
      />
      <div className="scoreboard-center px-3 py-4 md:px-4">
        <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-100/45">Round {match.round}</span>
        <StatusPill status={match.status} />
        <span className="text-xs text-cyan-100/70">{buildScoreCall(match, isDoubles)}</span>
        {isManager && isDoubles && (
          <div className="flex items-center gap-2">
            {[1, 2].map(serverNumber => (
              <button
                key={serverNumber}
                onClick={() => onUpdateServer(match.id, match.serving_team || 1, serverNumber as 1 | 2)}
                disabled={match.status === 'completed'}
                className={`scoreboard-serve-btn ${match.server_number === serverNumber ? 'scoreboard-serve-btn-active' : ''}`}
              >
                Server {serverNumber}
              </button>
            ))}
          </div>
        )}
      </div>
      <ScoreSide
        match={match}
        team="team2"
        profiles={[match.p2 || EMPTY_PROFILE, match.p2b]}
        isManager={isManager}
        isDoubles={isDoubles}
        onUpdateScore={onUpdateScore}
        onUpdateServer={onUpdateServer}
      />
    </div>
  )
}

function CompactScoreCard({ match, isManager, isDoubles, onUpdateScore, onUpdateServer }: any) {
  return (
    <div className="glass rounded-[22px] p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-[0.25em] text-gray-500">Round {match.round}</span>
        <StatusPill status={match.status} compact />
      </div>

      <CompactScoreRow
        match={match}
        field="score_team1"
        team={1}
        profiles={[match.p1 || EMPTY_PROFILE, match.p1b]}
        isManager={isManager}
        isDoubles={isDoubles}
        onUpdateScore={onUpdateScore}
        onUpdateServer={onUpdateServer}
      />
      <CompactScoreRow
        match={match}
        field="score_team2"
        team={2}
        profiles={[match.p2 || EMPTY_PROFILE, match.p2b]}
        isManager={isManager}
        isDoubles={isDoubles}
        onUpdateScore={onUpdateScore}
        onUpdateServer={onUpdateServer}
      />
    </div>
  )
}

function ScoreSide({ match, team, profiles, isManager, isDoubles, onUpdateScore, onUpdateServer }: any) {
  const field = team === 'team1' ? 'score_team1' : 'score_team2'
  const servingTeam = team === 'team1' ? 1 : 2
  const align = team === 'team1' ? 'items-start text-left' : 'items-end text-right'
  const orderedProfiles = team === 'team2' ? [...profiles].reverse() : profiles
  const visibleProfiles = (isDoubles ? orderedProfiles : orderedProfiles.slice(0, 1)).filter(Boolean)
  const isServing = match.serving_team === servingTeam

  return (
    <div className={`flex flex-col justify-between gap-5 min-w-0 ${align}`}>
      <div className={`flex items-center gap-4 min-w-0 ${team === 'team2' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex ${isDoubles ? '-space-x-4' : ''}`}>
          {visibleProfiles.map((profile: any, index: number) => (
            <PlayerAvatar key={index} profile={profile} size={86} large />
          ))}
        </div>
        <div className="min-w-0">
          <div className={`flex items-center gap-2 ${team === 'team2' ? 'justify-end' : ''}`}>
            <button
              onClick={() => onUpdateServer(match.id, servingTeam as 1 | 2, isDoubles ? match.server_number || 1 : null)}
              disabled={!isManager || match.status === 'completed'}
              className={`scoreboard-ball ${isServing ? 'scoreboard-ball-active' : ''} ${!isManager || match.status === 'completed' ? 'cursor-default' : ''}`}
              aria-label={`Set ${visibleProfiles.map((profile: any) => profile.nickname).join(' / ')} as server`}
            />
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-100/45">
              {isServing ? 'Serving Side' : 'Receiving Side'}
            </p>
          </div>
          <p className="text-2xl md:text-3xl font-black uppercase truncate">{visibleProfiles.map((profile: any) => profile.nickname).join(' / ') || 'Player'}</p>
        </div>
      </div>

      <div className={`flex items-center gap-3 ${team === 'team2' ? 'flex-row-reverse' : ''}`}>
        {isManager && (
          <button onClick={() => onUpdateScore(match.id, field, -1)} disabled={match.status === 'completed'} className="scoreboard-adjust">
            -
          </button>
        )}
        <div className="scoreboard-digits">{String(match[field] || 0).padStart(3, '0')}</div>
        {isManager && (
          <button onClick={() => onUpdateScore(match.id, field, 1)} disabled={match.status === 'completed'} className="scoreboard-adjust scoreboard-adjust-plus">
            +
          </button>
        )}
      </div>
    </div>
  )
}

function CompactScoreRow({ match, field, team, profiles, isManager, isDoubles, onUpdateScore, onUpdateServer }: any) {
  const visibleProfiles = (isDoubles ? profiles : profiles.slice(0, 1)).filter(Boolean)
  const isServing = match.serving_team === team

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => onUpdateServer(match.id, team, isDoubles ? match.server_number || 1 : null)}
          disabled={!isManager || match.status === 'completed'}
          className={`scoreboard-ball scoreboard-ball-small ${isServing ? 'scoreboard-ball-active' : ''} ${!isManager || match.status === 'completed' ? 'cursor-default' : ''}`}
          aria-label="Set server"
        />
        <div className={`flex ${isDoubles ? '-space-x-2' : ''}`}>
          {visibleProfiles.map((profile: any, index: number) => (
            <PlayerAvatar key={index} profile={profile} size={44} />
          ))}
        </div>
        <span className="font-bold truncate">{visibleProfiles.map((profile: any) => profile.nickname).join(' / ') || 'Player'}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isManager && (
          <button onClick={() => onUpdateScore(match.id, field, -1)} disabled={match.status === 'completed'} className="scoreboard-mini-adjust">
            -
          </button>
        )}
        <span className="font-display text-3xl text-cyan-200 min-w-12 text-center">{String(match[field] || 0).padStart(2, '0')}</span>
        {isManager && (
          <button onClick={() => onUpdateScore(match.id, field, 1)} disabled={match.status === 'completed'} className="scoreboard-mini-adjust scoreboard-mini-adjust-plus">
            +
          </button>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status, compact = false }: { status: string; compact?: boolean }) {
  const label = status === 'active' ? 'Live' : status === 'completed' ? 'Final' : 'Ready'
  const className =
    status === 'active'
      ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25'
      : status === 'completed'
        ? 'bg-white/10 text-gray-200 border-white/10'
        : 'bg-amber-300/15 text-amber-200 border-amber-300/20'

  return (
    <span className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-[0.2em] ${compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-[10px]'} ${className}`}>
      {label}
    </span>
  )
}

function PlayerAvatar({ profile, size, large = false }: { profile: PlayerProfile; size: number; large?: boolean }) {
  const initials = profile?.nickname?.slice(0, 2).toUpperCase() || '?'

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-dark ${large ? 'text-2xl' : 'text-sm'}`}
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

function buildScoreCall(match: any, isDoubles: boolean) {
  if (isDoubles) return `${match.score_team1}-${match.score_team2}-${match.server_number || 1}`
  return `${match.score_team1}-${match.score_team2}`
}
