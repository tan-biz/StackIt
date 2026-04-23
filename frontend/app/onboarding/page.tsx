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
    if (!session) {
      router.push('/')
      return
    }

    const { error: err } = await supabase.from('profiles').insert({
      id: session.user.id,
      name: name.trim(),
      nickname: nickname.trim(),
    })

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
          <div className="rounded-[28px] bg-secondary/20 p-5">
            <div className="font-display text-4xl leading-none text-gradient">StackIt</div>
            <p className="mt-2 text-sm leading-6 text-slate-soft">Let&apos;s set up your player card so you&apos;re ready to join matches fast.</p>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className="field-label">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
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
                placeholder="Jam"
                className="field-input"
              />
              <p className="mt-2 text-xs text-slate-soft">This name shows up in brackets, queues, and scoreboards.</p>
            </div>

            {error && <p className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

            <button onClick={handleSubmit} disabled={loading} className="primary-button w-full py-4 text-base">
              {loading ? 'Setting up...' : "Let's Play"}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
