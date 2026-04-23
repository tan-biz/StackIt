'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface JoinGameModalProps {
  profile: { id: string }
  onClose: () => void
  onJoined: () => void
}

export default function JoinGameModal({ profile, onClose, onJoined }: JoinGameModalProps) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<any>(null)
  const scannerContainerId = 'qr-reader'

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {
        // ignore cleanup errors
      }
      scannerRef.current = null
    }
    setScanning(false)
  }

  const startScanner = async () => {
    setError('')
    setScanning(true)
    const { Html5Qrcode } = await import('html5-qrcode')

    await new Promise(resolve => setTimeout(resolve, 100))

    const scanner = new Html5Qrcode(scannerContainerId)
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
        (decodedText: string) => {
          let gameCode = decodedText
          if (decodedText.startsWith('STACKIT:')) {
            gameCode = decodedText.replace('STACKIT:', '')
          }
          gameCode = gameCode.trim().toUpperCase()
          setCode(gameCode)
          stopScanner()
          handleJoinWithCode(gameCode)
        },
        () => {}
      )
    } catch {
      setError('Could not access camera. Please allow camera permission or enter the code manually.')
      setScanning(false)
    }
  }

  const handleJoinWithCode = async (gameCode: string) => {
    const trimmed = gameCode.trim().toUpperCase()
    if (!trimmed) {
      setError('Please enter a game code')
      return
    }

    setLoading(true)
    setError('')

    const { data: game, error: fetchErr } = await supabase
      .from('games')
      .select('*')
      .ilike('code', trimmed)
      .single()

    if (fetchErr || !game) {
      setError(fetchErr?.message || 'Game not found. Check the code and try again.')
      setLoading(false)
      return
    }

    if (game.status === 'completed') {
      setError('This game has already ended.')
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', game.id)
      .eq('player_id', profile.id)
      .single()

    if (!existing) {
      await supabase.from('game_players').insert({ game_id: game.id, player_id: profile.id })
    }

    onJoined()
    router.push(`/game/${game.id}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-text/30 px-4 py-4 backdrop-blur-sm sm:items-center">
      <div className="soft-card w-full max-w-md p-5 sm:p-6 animate-slide-up">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Join a room</p>
            <h2 className="text-2xl font-black text-text">Join Game</h2>
          </div>
          <button
            onClick={() => {
              stopScanner()
              onClose()
            }}
            className="secondary-button h-11 w-11 rounded-full p-0"
          >
            X
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="field-label">Game Code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoinWithCode(code)}
              placeholder="ABC123"
              maxLength={6}
              className="field-input font-display text-center text-4xl uppercase tracking-[0.24em]"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <button onClick={() => handleJoinWithCode(code)} disabled={loading} className="primary-button w-full py-4 text-base">
            {loading ? 'Joining...' : 'Join Game'}
          </button>

          <div className="rounded-[24px] bg-secondary/20 p-4">
            <p className="text-center text-xs font-extrabold uppercase tracking-[0.18em] text-slate-soft">Camera option</p>
            {scanning ? (
              <div className="mt-4 space-y-4">
                <div
                  id={scannerContainerId}
                  className="overflow-hidden rounded-[24px] border border-primary/15 bg-white"
                  style={{ minHeight: '260px' }}
                />
                <button onClick={stopScanner} className="secondary-button w-full text-danger">
                  Stop Scanner
                </button>
              </div>
            ) : (
              <button onClick={startScanner} className="secondary-button mt-4 w-full">
                Scan QR Code
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
