'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { supabase } from '@/lib/supabase'

interface CreateGameModalProps {
  profile: { id: string; nickname: string }
  onClose: () => void
  onCreated: () => void
}

type Step = 'form' | 'created'
type GameMode = 'tournament' | 'open_play'
type MatchFormat = 'singles' | 'doubles'

interface CreatedGame {
  id: string
  code: string
  name: string
  mode: GameMode
  format: MatchFormat
}

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function CreateGameModal({ profile, onClose, onCreated }: CreateGameModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [gameName, setGameName] = useState('')
  const [mode, setMode] = useState<GameMode>('tournament')
  const [format, setFormat] = useState<MatchFormat>('singles')
  const [loading, setLoading] = useState(false)
  const [createdGame, setCreatedGame] = useState<CreatedGame | null>(null)
  const [error, setError] = useState('')
  const qrCanvasRef = useRef<HTMLDivElement>(null)
  const qrDownloadRef = useRef<HTMLCanvasElement>(null)

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

    const { error: playerErr } = await supabase
      .from('game_players')
      .insert({ game_id: game.id, player_id: profile.id })

    if (playerErr) {
      setError(playerErr.message)
      setLoading(false)
      return
    }

    setCreatedGame(game as CreatedGame)
    setStep('created')
    setLoading(false)
  }

  const handleGoToGame = () => {
    if (!createdGame) return
    onCreated()
    router.push(`/game/${createdGame.id}`)
  }

  const handleCopy = () => {
    if (!createdGame) return
    navigator.clipboard.writeText(createdGame.code)
  }

  const handleDownloadQr = () => {
    if (!createdGame?.code) return
    // Read directly from the hidden QRCodeCanvas — instant, no SVG parsing needed
    const canvas = qrDownloadRef.current as unknown as HTMLCanvasElement | null
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `stackit-${createdGame.code}-qr.png`
    link.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-text/30 px-4 py-4 backdrop-blur-sm sm:items-center">
      <div className="soft-card max-h-[92vh] w-full max-w-lg overflow-y-auto p-5 sm:p-6 animate-slide-up">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Host a room</p>
            <h2 className="text-2xl font-black text-text">{step === 'form' ? 'Create a New Game' : 'Game Created'}</h2>
          </div>
          <button onClick={onClose} className="secondary-button h-11 w-11 rounded-full p-0">
            X
          </button>
        </div>

        {step === 'form' ? (
          <div className="space-y-5">
            <div>
              <label className="field-label">Game Name</label>
              <input
                type="text"
                value={gameName}
                onChange={e => setGameName(e.target.value)}
                placeholder="Sunset pickleball club"
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Game Mode</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { value: 'tournament', title: 'Tournament', desc: 'Structured bracket play with match progression.' },
                  { value: 'open_play', title: 'Open Play', desc: 'Casual rotating rounds for the whole group.' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setMode(option.value as 'tournament' | 'open_play')}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      mode === option.value ? 'border-primary bg-primary/10' : 'border-primary/10 bg-white'
                    }`}
                  >
                    <p className="text-base font-black text-text">{option.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-soft">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label">Match Format</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { value: 'singles', title: 'Singles', desc: 'One player per side, simpler scoring flow.' },
                  { value: 'doubles', title: 'Doubles', desc: 'Two per side, team-first setup and serving.' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFormat(option.value as 'singles' | 'doubles')}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      format === option.value ? 'border-accent bg-accent/15' : 'border-primary/10 bg-white'
                    }`}
                  >
                    <p className="text-base font-black text-text">{option.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-soft">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <button onClick={handleCreate} disabled={loading} className="primary-button w-full py-4 text-base">
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        ) : (
          <div className="space-y-5 text-center">
            <div className="rounded-[28px] border border-primary/15 bg-primary/5 p-5">
              <p className="text-sm font-bold text-slate-soft">Share this code with players</p>
              <div className="font-display mt-3 text-5xl leading-none text-primary sm:text-6xl">
                {createdGame?.code}
              </div>
              <div ref={qrCanvasRef} className="mx-auto mt-5 inline-block rounded-[28px] bg-white p-5 shadow-sm">
                <QRCodeSVG
                  value={`STACKIT:${createdGame?.code}`}
                  size={200}
                  level="H"
                  fgColor="#1a1a2e"
                  bgColor="#ffffff"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button onClick={handleCopy} className="secondary-button">Copy Code</button>
              <button onClick={handleDownloadQr} className="secondary-button">Download QR</button>
              <button onClick={handleGoToGame} className="primary-button">Go to Game</button>
            </div>

            {/* Hidden high-res canvas used only for PNG download */}
            <div className="hidden">
              <QRCodeCanvas
                ref={qrDownloadRef}
                value={`STACKIT:${createdGame?.code}`}
                size={600}
                level="H"
                fgColor="#1a1a2e"
                bgColor="#ffffff"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
