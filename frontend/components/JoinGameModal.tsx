'use client'
import { useState, useRef, useEffect } from 'react'
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

  // Cleanup scanner on unmount
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
      } catch (e) {
        // ignore cleanup errors
      }
      scannerRef.current = null
    }
    setScanning(false)
  }

  const startScanner = async () => {
    setError('')
    setScanning(true)

    // Dynamic import to avoid SSR issues
    const { Html5Qrcode } = await import('html5-qrcode')

    // Small delay to let the container render
    await new Promise(r => setTimeout(r, 100))

    const scanner = new Html5Qrcode(scannerContainerId)
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
        },
        (decodedText: string) => {
          // Extract code from "STACKIT:XXXXXX" format
          let gameCode = decodedText
          if (decodedText.startsWith('STACKIT:')) {
            gameCode = decodedText.replace('STACKIT:', '')
          }
          gameCode = gameCode.trim().toUpperCase()

          setCode(gameCode)
          stopScanner()

          // Auto-join after scan
          handleJoinWithCode(gameCode)
        },
        () => {
          // QR code not detected — ignore
        }
      )
    } catch (err: any) {
      setError('Could not access camera. Please allow camera permissions or enter the code manually.')
      setScanning(false)
    }
  }

  const handleJoinWithCode = async (gameCode: string) => {
    const trimmed = gameCode.trim().toUpperCase()
    if (!trimmed) { setError('Please enter a game code'); return }
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

    // Check if already joined
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

  const handleJoin = () => handleJoinWithCode(code)

  return (
    <div className="fixed inset-0 bg-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-5 animate-fade-in">
      <div className="glass rounded-3xl p-8 max-w-md w-full animate-slide-up">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Join Game</h2>
          <button onClick={() => { stopScanner(); onClose() }} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all hover:rotate-90">
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Game Code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="ABC123"
              maxLength={6}
              className="w-full px-5 py-5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-display text-3xl text-center tracking-[12px] uppercase"
            />
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-danger text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary-dark text-dark font-bold rounded-xl uppercase tracking-widest hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>

          <div className="text-center">
            <p className="text-gray-500 text-sm mb-3">— or —</p>

            {scanning ? (
              <div className="space-y-4">
                <div
                  id={scannerContainerId}
                  className="w-full rounded-2xl overflow-hidden border-2 border-primary/30"
                  style={{ minHeight: '280px' }}
                />
                <button
                  onClick={stopScanner}
                  className="w-full py-3 glass rounded-xl font-semibold hover:bg-white/10 transition-all text-danger"
                >
                  ✕ Stop Scanner
                </button>
              </div>
            ) : (
              <button
                onClick={startScanner}
                className="w-full py-3 glass rounded-xl font-semibold hover:bg-white/10 transition-all text-gray-300"
              >
                📷 Scan QR Code
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

