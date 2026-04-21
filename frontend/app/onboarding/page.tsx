'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim() || !nickname.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    const { error: err } = await supabase.from('profiles').insert({
      id: session.user.id,
      name: name.trim(),
      nickname: nickname.trim(),
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen relative z-10 px-5">
      <div className="glass rounded-3xl p-12 max-w-md w-full animate-scale-in">
        <div className="font-display text-4xl text-gradient text-center mb-2">STACKIT</div>
        <p className="text-center text-gray-400 mb-8">Set up your player profile</p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
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
              placeholder="JD"
              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">This is how other players see you</p>
          </div>

          {error && <p className="text-danger text-sm text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary-dark text-dark font-bold rounded-xl uppercase tracking-widest hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Let\'s Play'}
          </button>
        </div>
      </div>
    </div>
  )
}
