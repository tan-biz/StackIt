'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface ScoreboardProps {
  gameId: string
  players: any[]
}

export default function Scoreboard({ gameId, players }: ScoreboardProps) {
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('game_id', gameId)
        .eq('status', 'completed')

      const playerMap = Object.fromEntries(players.map(p => [p.player_id, p.profiles?.nickname]))

      const statsMap: Record<string, { wins: number; losses: number; pointsFor: number; pointsAgainst: number }> = {}

      players.forEach(p => {
        statsMap[p.player_id] = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }
      });

      (matches || []).forEach((m: any) => {
        const p1 = m.team1_player1
        const p2 = m.team2_player1
        if (statsMap[p1]) {
          statsMap[p1].pointsFor += m.score_team1
          statsMap[p1].pointsAgainst += m.score_team2
          if (m.winner_team === 1) statsMap[p1].wins++
          else statsMap[p1].losses++
        }
        if (statsMap[p2]) {
          statsMap[p2].pointsFor += m.score_team2
          statsMap[p2].pointsAgainst += m.score_team1
          if (m.winner_team === 2) statsMap[p2].wins++
          else statsMap[p2].losses++
        }
      })

      const sorted = Object.entries(statsMap)
        .map(([pid, s]) => ({ pid, nickname: playerMap[pid] || 'Unknown', ...s }))
        .sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst))

      setStats(sorted)
      setLoading(false)
    }
    loadStats()
  }, [gameId, players])

  if (loading) return <div className="glass rounded-2xl p-8 text-center text-gray-400">Loading scoreboard...</div>

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="animate-fade-in">
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-bold text-lg">📊 Standings</h3>
        </div>

        {stats.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📊</p>
            <p>No completed matches yet. Scores will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {/* Header */}
            <div className="px-6 py-3 grid grid-cols-6 text-xs text-gray-500 font-semibold uppercase tracking-wider">
              <span className="col-span-2">Player</span>
              <span className="text-center">W</span>
              <span className="text-center">L</span>
              <span className="text-center">PF</span>
              <span className="text-center">PA</span>
            </div>

            {stats.map((s, i) => (
              <div
                key={s.pid}
                className={`px-6 py-4 grid grid-cols-6 items-center transition-colors hover:bg-white/5 ${
                  i === 0 && s.wins > 0 ? 'bg-secondary/5' : ''
                }`}
              >
                <div className="col-span-2 flex items-center gap-3">
                  <span className="text-xl w-8">{medals[i] || `#${i + 1}`}</span>
                  <div>
                    <span className="font-bold">{s.nickname}</span>
                    {s.wins > 0 && s.losses === 0 && (
                      <span className="ml-2 text-xs bg-success/20 text-success px-1.5 py-0.5 rounded-full">Undefeated</span>
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
        )}

        <div className="px-6 py-3 border-t border-white/10 text-xs text-gray-600">
          W = Wins · L = Losses · PF = Points For · PA = Points Against
        </div>
      </div>
    </div>
  )
}
