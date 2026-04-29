'use client'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/LoadingScreen'

interface ScoreboardProps {
  gameId: string
  players: any[]
  game: any
  currentProfile: any
  tvMode?: boolean
}

type PlayerProfile = {
  nickname?: string | null
  avatar_url?: string | null
}

const EMPTY_PROFILE: PlayerProfile = {
  nickname: 'Player',
  avatar_url: null,
}

export default function Scoreboard({ gameId, players, game, currentProfile, tvMode = false }: ScoreboardProps) {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isManager = !tvMode && game.creator_id === currentProfile?.id
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

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const stats = useMemo(() => {
    const playerMap = Object.fromEntries(
      players.map(player => [
        player.player_id,
        {
          nickname: player.profiles?.nickname || 'Player',
          avatar_url: player.profiles?.avatar_url || null,
        },
      ])
    )

    const statsMap: Record<string, { wins: number; losses: number; pointsFor: number; pointsAgainst: number; nickname: string; avatar_url: string | null }> = {}

    players.forEach(player => {
      statsMap[player.player_id] = {
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        nickname: playerMap[player.player_id]?.nickname || 'Player',
        avatar_url: playerMap[player.player_id]?.avatar_url || null,
      }
    })

    matches
      .filter(match => match.status === 'completed')
      .forEach((match: any) => {
        const team1 = [match.team1_player1, match.team1_player2].filter(Boolean)
        const team2 = [match.team2_player1, match.team2_player2].filter(Boolean)

        team1.forEach((playerId: string) => {
          if (!statsMap[playerId]) return
          statsMap[playerId].pointsFor += match.score_team1
          statsMap[playerId].pointsAgainst += match.score_team2
          if (match.winner_team === 1) statsMap[playerId].wins += 1
          else statsMap[playerId].losses += 1
        })

        team2.forEach((playerId: string) => {
          if (!statsMap[playerId]) return
          statsMap[playerId].pointsFor += match.score_team2
          statsMap[playerId].pointsAgainst += match.score_team1
          if (match.winner_team === 2) statsMap[playerId].wins += 1
          else statsMap[playerId].losses += 1
        })
      })

    return Object.entries(statsMap)
      .map(([playerId, stat]) => ({ playerId, ...stat }))
      .sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst))
  }, [matches, players])

  const featuredMatch = useMemo(() => {
    if (matches.length === 0) return null
    return matches.find(match => match.status === 'active') || matches.find(match => match.status === 'pending') || [...matches].reverse().find(match => match.status === 'completed') || matches[0]
  }, [matches])

  const supportingMatches = useMemo(() => {
    if (!featuredMatch) return []
    return matches.filter(match => match.id !== featuredMatch.id).slice(0, 4)
  }, [featuredMatch, matches])

  const updateScore = async (matchId: string, field: 'score_team1' | 'score_team2', delta: number) => {
    const match = matches.find(item => item.id === matchId)
    if (!match || match.status === 'completed') return

    const newValue = Math.max(0, (match[field] || 0) + delta)
    const { error } = await supabase.from('matches').update({ [field]: newValue }).eq('id', matchId)
    if (error) return

    setMatches(prev => prev.map(item => (item.id === matchId ? { ...item, [field]: newValue } : item)))
  }

  const updateServer = async (matchId: string, servingTeam: 1 | 2, serverNumber: 1 | 2 | null) => {
    const match = matches.find(item => item.id === matchId)
    if (!match || match.status === 'completed') return

    const payload = { serving_team: servingTeam, server_number: serverNumber }
    const { error } = await supabase.from('matches').update(payload).eq('id', matchId)
    if (error) return

    setMatches(prev => prev.map(item => (item.id === matchId ? { ...item, ...payload } : item)))
  }

  const downloadResults = () => {
    const rows = matches.map(match => {
      const team1 = [match.p1?.nickname, match.p1b?.nickname].filter(Boolean).join(' / ') || 'TBD'
      const team2 = [match.p2?.nickname, match.p2b?.nickname].filter(Boolean).join(' / ') || 'TBD'
      return `${match.round},${match.status || 'pending'},"${team1}",${match.score_team1},"${team2}",${match.score_team2}`
    })
    const csv = ['Round,Status,Team 1,Score 1,Team 2,Score 2', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${game.name.replace(/\s+/g, '_').toLowerCase()}-results.csv`
    link.click()
  }

  const openTvMode = () => {
    window.open(`/game/${gameId}/tv`, '_blank')
  }

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      return
    }
    await document.exitFullscreen()
  }

  if (loading) {
    return tvMode ? <LoadingScreen /> : <div className="soft-card"><LoadingScreen inline /></div>
  }

  if (matches.length === 0) {
    return (
      <div className={`${tvMode ? 'min-h-screen' : ''} soft-card p-8 text-center`}>
        <p className="font-display text-4xl text-gradient">Scoreboard</p>
        <p className="mt-2 text-slate-soft">Start a match or generate the bracket to show scores here.</p>
      </div>
    )
  }

  if (!featuredMatch) return <div className="soft-card"><LoadingScreen inline /></div>

  if (tvMode) {
    return (
      <div className="min-h-screen">
        <section className="soft-card h-full p-3 sm:p-4 xl:p-6">
          <div className="scoreboard-shell h-full overflow-hidden rounded-[26px]">
            <div className="scoreboard-topbar flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">TV Mode</p>
                <h3 className="text-2xl font-black text-text xl:text-3xl">{game.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={featuredMatch.status} />
                <span className="scoreboard-chip">{isDoubles ? 'Doubles' : 'Singles'}</span>
                <span className="scoreboard-chip">Game #{game.code}</span>
                <button onClick={toggleFullscreen} className="secondary-button">
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
              </div>
            </div>

            <FeaturedScoreCard
              match={featuredMatch}
              isManager={false}
              isDoubles={isDoubles}
              onUpdateScore={updateScore}
              onUpdateServer={updateServer}
              tvMode
            />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="soft-card p-3 sm:p-4">
        <div className="scoreboard-shell overflow-hidden rounded-[26px]">
          <div className="scoreboard-topbar flex flex-col gap-3 px-4 py-4 sm:px-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Live view</p>
              <h3 className="text-2xl font-black text-text">{game.name}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={featuredMatch.status} />
              <span className="scoreboard-chip">{isDoubles ? 'Doubles' : 'Singles'}</span>
              <span className="scoreboard-chip">Game #{game.code}</span>
              <span className="scoreboard-chip">{players.length} players</span>
              <button onClick={openTvMode} className="secondary-button">
                TV Mode
              </button>
              <button onClick={downloadResults} className="secondary-button">
                Export results
              </button>
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

      <section className="soft-card overflow-hidden">
        <div className="border-b border-primary/10 px-5 py-4">
          <h3 className="text-xl font-black text-text">Standings</h3>
          <p className="mt-1 text-sm text-slate-soft">Wins first, then point differential for sorting.</p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="grid grid-cols-[minmax(0,1.6fr)_60px_60px_70px_70px] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-soft">
              <span>Player</span>
              <span className="text-center">W</span>
              <span className="text-center">L</span>
              <span className="text-center">PF</span>
              <span className="text-center">PA</span>
            </div>

            {stats.map((stat, index) => (
              <div
                key={stat.playerId}
                className={`grid grid-cols-[minmax(0,1.6fr)_60px_60px_70px_70px] items-center gap-2 border-t border-primary/10 px-5 py-4 ${
                  index === 0 && stat.wins > 0 ? 'bg-accent/10' : 'bg-white/70'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 text-center text-sm font-black text-primary">#{index + 1}</span>
                  <PlayerAvatar profile={stat} size={40} />
                  <span className="truncate font-black text-text">{stat.nickname}</span>
                </div>
                <span className="text-center font-black text-primary">{stat.wins}</span>
                <span className="text-center text-slate-soft">{stat.losses}</span>
                <span className="text-center text-text">{stat.pointsFor}</span>
                <span className="text-center text-slate-soft">{stat.pointsAgainst}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function FeaturedScoreCard({ match, isManager, isDoubles, onUpdateScore, onUpdateServer }: any) {
  return (
    <div className="scoreboard-main px-3 py-4 sm:px-5 sm:py-5 xl:px-8 xl:py-8">
      <ScoreSide
        match={match}
        team="team1"
        profiles={[match.p1 || EMPTY_PROFILE, match.p1b]}
        isManager={isManager}
        isDoubles={isDoubles}
        onUpdateScore={onUpdateScore}
        onUpdateServer={onUpdateServer}
      />
      <div className="scoreboard-center rounded-[24px] bg-primary/6 px-4 py-4">
        <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-soft">Round {match.round}</span>
        <StatusPill status={match.status} />
        <span className="text-sm font-bold text-slate-soft">{buildScoreCall(match, isDoubles)}</span>
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
    <div className="soft-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-soft">Round {match.round}</span>
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
    <div className={`flex min-w-0 flex-col justify-between gap-5 rounded-[24px] bg-white/70 p-4 ${align}`}>
      <div className={`flex min-w-0 items-center gap-3 ${team === 'team2' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex ${isDoubles ? '-space-x-4' : ''}`}>
          {visibleProfiles.map((profile: any, index: number) => (
            <PlayerAvatar key={index} profile={profile} size={72} large />
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
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-soft">
              {isServing ? 'Serving' : 'Receiving'}
            </p>
          </div>
          <p className="mt-1 truncate text-2xl font-black text-text">
            {visibleProfiles.map((profile: any) => profile.nickname).join(' / ') || 'Player'}
          </p>
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
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={() => onUpdateServer(match.id, team, isDoubles ? match.server_number || 1 : null)}
          disabled={!isManager || match.status === 'completed'}
          className={`scoreboard-ball scoreboard-ball-small ${isServing ? 'scoreboard-ball-active' : ''} ${!isManager || match.status === 'completed' ? 'cursor-default' : ''}`}
          aria-label="Set server"
        />
        <div className={`flex ${isDoubles ? '-space-x-2' : ''}`}>
          {visibleProfiles.map((profile: any, index: number) => (
            <PlayerAvatar key={index} profile={profile} size={42} />
          ))}
        </div>
        <span className="truncate font-black text-text">{visibleProfiles.map((profile: any) => profile.nickname).join(' / ') || 'Player'}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isManager && (
          <button onClick={() => onUpdateScore(match.id, field, -1)} disabled={match.status === 'completed'} className="scoreboard-mini-adjust">
            -
          </button>
        )}
        <span className="min-w-12 text-center font-display text-3xl text-primary">{String(match[field] || 0).padStart(2, '0')}</span>
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
  const className = status === 'active' ? 'status-live' : status === 'completed' ? 'status-complete' : 'status-ready'

  return (
    <span className={`pill ${compact ? 'px-2.5 py-1 text-[10px]' : ''} ${className}`}>
      {label}
    </span>
  )
}

function PlayerAvatar({ profile, size, large = false }: { profile: PlayerProfile; size: number; large?: boolean }) {
  const avatarSrc = profile?.avatar_url || '/default-avatar.jpg'

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-black text-text ${large ? 'text-xl' : 'text-sm'}`}
      style={{ width: size, height: size }}
    >
      <Image src={avatarSrc} alt={profile?.nickname || 'Player avatar'} fill sizes={`${size}px`} className="object-cover" />
    </div>
  )
}

function buildScoreCall(match: any, isDoubles: boolean) {
  if (isDoubles) return `${match.score_team1}-${match.score_team2}-${match.server_number || 1}`
  return `${match.score_team1}-${match.score_team2}`
}
