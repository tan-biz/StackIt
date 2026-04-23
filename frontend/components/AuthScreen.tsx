'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'register'

export default function AuthScreen() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAuth = async () => {
    setError('')
    setSuccess('')
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    if (mode === 'register' && (!fullName.trim() || !nickname.trim())) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)

    if (mode === 'register') {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            nickname: nickname.trim(),
          },
        },
      })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      setSuccess('Account created. Check your email to confirm, then sign in.')
      setLoading(false)
      return
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main className="relative z-10 min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <div className="soft-card w-full p-5 sm:p-7 animate-scale-in">
          <div className="surface-muted mb-5 rounded-[28px] p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">Welcome back</p>
            <h1 className="font-display text-5xl leading-none text-gradient">StackIt</h1>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-soft">
              A softer little home for organizing pickleball games on the go.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-[22px] bg-secondary/20 p-1.5">
            {(['login', 'register'] as Mode[]).map(currentMode => (
              <button
                key={currentMode}
                onClick={() => {
                  setMode(currentMode)
                  setError('')
                  setSuccess('')
                }}
                className={`rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
                  mode === currentMode ? 'bg-white text-text shadow-sm' : 'text-slate-soft'
                }`}
              >
                {currentMode === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="field-label">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAuth()}
                    placeholder="Jamie Rivera"
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Nickname</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAuth()}
                    placeholder="Jam"
                    className="field-input"
                  />
                  <p className="mt-2 text-xs text-slate-soft">This is what other players will see in games.</p>
                </div>
              </>
            )}

            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                placeholder="you@example.com"
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                placeholder="Enter password"
                className="field-input"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
                {success}
              </div>
            )}

            <button onClick={handleAuth} disabled={loading} className="primary-button w-full py-4 text-base">
              {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
