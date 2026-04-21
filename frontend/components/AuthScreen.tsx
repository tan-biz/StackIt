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
    if (!email || !password) { setError('Please fill in all fields'); return }
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
      if (err) { setError(err.message); setLoading(false); return }

      setSuccess('Account created! Check your email to confirm, then sign in.')
      setLoading(false)
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false) }
      else router.push('/dashboard')
    }
  }

  return (
    <div className="relative z-10 flex items-center justify-center min-h-screen px-5">
      <div className="glass rounded-3xl p-12 max-w-md w-full animate-scale-in shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-6xl text-gradient tracking-wider">STACKIT</h1>
          <p className="text-gray-400 mt-2">Manage your pickleball games with ease</p>
        </div>

        {/* Tabs */}
        <div className="flex glass rounded-xl p-1 mb-8">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setSuccess('') }}
              className={`flex-1 py-2.5 rounded-lg font-semibold capitalize transition-all ${
                mode === m ? 'bg-primary text-dark' : 'text-gray-400 hover:text-white'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* Full Name & Nickname — only shown during registration */}
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAuth()}
                  placeholder="John Doe"
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAuth()}
                  placeholder="JD"
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">This is how other players see you</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              placeholder="your@email.com"
              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              placeholder="••••••••"
              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-danger text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-3 text-success text-sm">
              {success}
            </div>
          )}

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full py-4 mt-2 bg-gradient-to-r from-primary to-primary-dark text-dark font-bold rounded-xl uppercase tracking-widest hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-dark/30 border-t-dark rounded-full animate-spin" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </div>

        <p className="text-center text-gray-500 text-xs mt-8">
          🏓 Your pickleball game manager
        </p>
      </div>
    </div>
  )
}
