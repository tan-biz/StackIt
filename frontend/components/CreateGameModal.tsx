'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '@/lib/supabase'

interface CreateGameModalProps {
  profile: { id: string; nickname: string }
  onClose: () => void
  onCreated: () => void
}

type Step = 'form' | 'created'

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function CreateGameModal({ profile, onClose, onCreated }: CreateGameModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [gameName, setGameName] = useState('')
  const [mode, setMode] = useState<'tournament' | 'open_play'>('tournament')
  const [format, setFormat] = useState<'singles' | 'doubles'>('singles')
  const [loading, setLoading] = useState(false)
  const [createdGame, setCreatedGame] = useState<any>(null)
  const [error, setError] = useState('')
  const qrCanvasRef = useRef<HTMLDivElement>(null)

  const handleCreate = async () => {
    if (!gameName.trim()) {
      setError('Please enter a game name')
      return
    }

    setLoading(true)
    setError('')

    const code = generateCode()
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({ code, name: gameName.trim(), mode, format, creator_id: profile.id, status: 'waiting' })
      .select()
      .single()

    if (gameErr) {
      setError(gameErr.message)
      setLoading(false)
      return
    }

    await supabase.from('game_players').insert({ game_id: game.id, player_id: profile.id })

    setCreatedGame(game)
    setStep('created')
    setLoading(false)
  }

  const handleGoToGame = () => {
    onCreated()
    router.push(`/game/${createdGame.id}`)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(createdGame.code)
  }

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current?.querySelector('canvas')
    if (!canvas || !createdGame?.code) return

    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `stackit-${createdGame.code}-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 bg-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-5 animate-fade-in">
      <div className="glass rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">{step === 'form' ? 'Create New Game' : 'Game Created!'}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all hover:rotate-90">
            X
          </button>
        </div>

        {step === 'form' ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Game Name</label>
              <input
                type="text"
                value={gameName}
                onChange={e => setGameName(e.target.value)}
                placeholder="Friday Night Pickleball"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-3">Game Mode</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'tournament', title: 'Tournament', desc: 'Bracket-style competitive play' },
                  { value: 'open_play', title: 'Open Play', desc: 'Fair rotation casual play' },
                ].map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value as 'tournament' | 'open_play')}
                    className={`p-5 rounded-2xl border-2 text-left transition-all ${
                      mode === m.value
                        ? 'border-primary bg-primary/10'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <div className="font-bold mb-1">{m.title}</div>
                    <div className="text-xs text-gray-400">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-3">Match Format</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'singles', title: 'Singles', desc: '1 player per side and 2-number score call' },
                  { value: 'doubles', title: 'Doubles', desc: '2 players per side and 3-number score call' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFormat(option.value as 'singles' | 'doubles')}
                    className={`p-5 rounded-2xl border-2 text-left transition-all ${
                      format === option.value
                        ? 'border-secondary bg-secondary/10'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <div className="font-bold mb-1">{option.title}</div>
                    <div className="text-xs text-gray-400">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-primary to-primary-dark text-dark font-bold rounded-xl uppercase tracking-widest hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="bg-primary/5 border-2 border-dashed border-primary/50 rounded-2xl p-8">
              <p className="text-gray-400 text-sm mb-3">Game Code</p>
              <div className="font-display text-5xl text-primary tracking-[12px] mb-6" style={{ textShadow: '0 0 30px rgba(0,217,255,0.5)' }}>
                {createdGame?.code}
              </div>
              <div ref={qrCanvasRef} className="inline-block p-5 bg-white rounded-2xl">
                <QRCodeCanvas value={`STACKIT:${createdGame?.code}`} size={240} className="w-full h-auto max-w-[240px]" />
              </div>
              <p className="text-gray-500 text-sm mt-4">Share this code or QR with your players</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleCopy}
                className="py-3 glass rounded-xl font-semibold hover:bg-white/10 transition-all"
              >
                Copy Code
              </button>
              <button
                onClick={handleDownloadQr}
                className="py-3 glass rounded-xl font-semibold hover:bg-white/10 transition-all"
              >
                Download QR
              </button>
              <button
                onClick={handleGoToGame}
                className="py-3 bg-gradient-to-r from-primary to-primary-dark text-dark font-bold rounded-xl hover:-translate-y-0.5 transition-all"
              >
                Go to Game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
