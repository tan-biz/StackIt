'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
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
  const [mirrorPreview, setMirrorPreview] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const hasScannedRef = useRef(false)
  const mirrorPreviewRef = useRef(false)

  // Clean up stream + animation loop
  const stopScanner = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setScanning(false)
    setMirrorPreview(false)
    mirrorPreviewRef.current = false
  }, [])

  // Stop camera when modal unmounts
  useEffect(() => () => stopScanner(), [stopScanner])

  const handleJoinWithCode = useCallback(async (gameCode: string) => {
    const trimmed = gameCode.trim().toUpperCase()
    if (!trimmed) { setError('Please enter a game code'); return }

    setLoading(true)
    setError('')

    const { data: game, error: fetchErr } = await supabase
      .from('games').select('*').ilike('code', trimmed).single()

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
      .from('game_players').select('id')
      .eq('game_id', game.id).eq('player_id', profile.id).single()

    if (!existing) {
      await supabase.from('game_players').insert({ game_id: game.id, player_id: profile.id })
    }

    onJoined()
    router.push(`/game/${game.id}`)
  }, [profile.id, onJoined, router])

  const startScanner = async (preferFront = false) => {
    setError('')
    hasScannedRef.current = false
    setMirrorPreview(preferFront)
    mirrorPreviewRef.current = preferFront

    // Camera API is only available on HTTPS or localhost
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        window.location.protocol !== 'https:' && window.location.hostname !== 'localhost'
          ? 'Camera requires a secure connection (HTTPS). Ask your host to enable HTTPS, or enter the code manually.'
          : 'Your browser does not support camera access. Please enter the code manually.'
      )
      return
    }

    // Try to get the camera stream
    let stream: MediaStream | null = null

    try {
      // Try the preferred direction first, fall back to any camera
      const constraints: MediaStreamConstraints[] = preferFront
        ? [{ video: { facingMode: 'user' } }, { video: true }]
        : [{ video: { facingMode: { exact: 'environment' } } }, { video: { facingMode: 'environment' } }, { video: { facingMode: 'user' } }, { video: true }]

      for (const c of constraints) {
        try { stream = await navigator.mediaDevices.getUserMedia(c); break } catch { /* try next */ }
      }

      if (!stream) throw new Error('No camera available')
    } catch (err: any) {
      const msg = err?.message ?? ''
      setError(
        msg.includes('NotAllowed') || msg.includes('Permission')
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : msg.includes('NotReadable') || msg.includes('Could not start')
          ? 'Camera is in use by another app (Teams, Zoom, etc.). Close it and try again.'
          : 'Could not access camera. Please enter the code manually.'
      )
      return
    }

    streamRef.current = stream
    setScanning(true)

    // Mirror preview only for the front/selfie camera (user).
    // Some browsers ignore requested facingMode; detect what we actually got.
    try {
      const track = stream.getVideoTracks?.()?.[0]
      const facing = track?.getSettings?.()?.facingMode
      if (facing === 'environment') {
        setMirrorPreview(false)
        mirrorPreviewRef.current = false
      } else if (facing === 'user') {
        setMirrorPreview(true)
        mirrorPreviewRef.current = true
      }
    } catch {
      // If detection fails, keep the preferFront default.
    }

    // Attach stream to the video element — wait one tick for React to render it
    await new Promise(r => setTimeout(r, 50))
    if (!videoRef.current) { stopScanner(); return }

    const video = videoRef.current
    video.srcObject = stream
    video.setAttribute('playsinline', 'true') // iOS fix
    await video.play().catch(() => {})

    // Load jsQR dynamically
    const jsQR = (await import('jsqr')).default

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    const tick = () => {
      if (!videoRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const vw = video.videoWidth
      const vh = video.videoHeight
      canvas.width = vw
      canvas.height = vh

      // Draw frame to canvas. If we're using a mirrored preview (front camera),
      // un-mirror the pixels before decoding so jsQR can read it reliably.
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      if (mirrorPreviewRef.current) {
        ctx.translate(vw, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, 0, 0, vw, vh)

      const imageData = ctx.getImageData(0, 0, vw, vh)
      const result = jsQR(imageData.data, vw, vh, { inversionAttempts: 'attemptBoth' })

      if (result && !hasScannedRef.current) {
        hasScannedRef.current = true
        let gameCode = result.data
        if (gameCode.startsWith('STACKIT:')) gameCode = gameCode.replace('STACKIT:', '')
        gameCode = gameCode.trim().toUpperCase()
        setCode(gameCode)
        stopScanner()
        handleJoinWithCode(gameCode)
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
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
            onClick={() => { stopScanner(); onClose() }}
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
              <div className="mt-4 space-y-3">
                {/* Live video preview — CSS mirror for front cam is purely cosmetic */}
                <div className="relative overflow-hidden rounded-[24px] border border-primary/15 bg-black" style={{ aspectRatio: '4/3' }}>
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                    style={mirrorPreview ? { transform: 'scaleX(-1)' } : undefined}
                  />
                  {/* Viewfinder overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-48 w-48 rounded-2xl border-2 border-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  </div>
                </div>
                {/* Hidden canvas used for jsQR decoding — not displayed */}
                <canvas ref={canvasRef} className="hidden" />
                <button onClick={stopScanner} className="secondary-button w-full text-sm text-danger">
                  Stop Scanner
                </button>
                <p className="text-center text-xs text-slate-soft">
                  Point at the QR code — it'll scan automatically
                </p>
              </div>
            ) : (
              <button onClick={() => startScanner(false)} className="secondary-button mt-4 w-full">
                Scan QR Code
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
