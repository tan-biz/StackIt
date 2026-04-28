'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AuthScreen from '@/components/AuthScreen'

const features = [
  {
    emoji: '🎾',
    title: 'Quick match setup',
    description: 'Create games, add players, and choose a court in just a few taps.',
  },
  {
    emoji: '🤝',
    title: 'Friendly invites',
    description: 'Send game invites, share details, and keep everyone in the loop.',
  },
  {
    emoji: '🏆',
    title: 'Scoreboard magic',
    description: 'Track winners, sets, and match status with a soft, simple view.',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) router.push('/dashboard')
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute left-8 top-10 h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-24 h-60 w-60 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-32 w-32 -translate-x-1/2 rounded-full bg-secondary/20 blur-3xl" />

      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-8 lg:grid-cols-[1.4fr_1fr] items-center">
        <section className="order-2 space-y-8 lg:order-1">
          <div className="soft-card rounded-[36px] border border-primary/10 bg-white/90 p-8 shadow-[0_24px_60px_rgba(76,154,138,0.14)]">
            <span className="pill">Pickleball planning</span>
            <div className="mt-6 max-w-2xl space-y-5">
              <h1 className="font-display text-5xl tracking-tight text-text sm:text-6xl">Organize games. Not group chats.</h1>
              <p className="text-lg leading-8 text-slate-soft">
                StackIt handles scheduling, invites, courts, and scores — so you can focus on playing, not coordinating.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="primary-button mt-6 w-full justify-center rounded-[28px] lg:hidden"
            >
              Get started
            </button>
          </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {features.map(feature => (
                <div key={feature.title} className="rounded-[24px] border border-primary/10 bg-primary/5 p-5 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-2xl shadow-[0_8px_20px_rgba(76,154,138,0.08)]">
                    {feature.emoji}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-text">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-soft">{feature.description}</p>
                </div>
              ))}
            </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="soft-card rounded-[28px] border border-primary/10 bg-white/90 p-6 shadow-[0_18px_48px_rgba(76,154,138,0.1)]">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Game Concierge</p>
              <h2 className="mt-4 text-2xl font-semibold text-text">Meeting your next match is a breeze.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-soft">
                Set skill levels, court types, and player invites, then let StackIt handle the rest.
              </p>
            </div>
            <div className="soft-card rounded-[28px] border border-primary/10 bg-white/90 p-6 shadow-[0_18px_48px_rgba(76,154,138,0.1)]">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Sweet scorekeeping</p>
              <h2 className="mt-4 text-2xl font-semibold text-text">Keep the score without the stress.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-soft">
                Every match, set, and outcome gets stored in a friendly layout so you never miss a moment.
              </p>
            </div>
          </div>
        </section>

        <section className="hidden lg:block order-2 relative lg:order-2">
          <div className="pointer-events-none absolute -right-10 top-12 h-28 w-28 rounded-full bg-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-10 h-24 w-24 rounded-full bg-primary/20 blur-3xl" />

          <div className="soft-card rounded-[36px] border border-primary/10 bg-white/95 p-6 shadow-[0_24px_60px_rgba(76,154,138,0.16)]">
            <div className="mb-6 rounded-[28px] bg-secondary/10 p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Welcome home</p>
              <h2 className="mt-3 text-3xl font-display tracking-tight text-text">Sign in or create your account</h2>
              <p className="mt-2 text-sm leading-6 text-slate-soft">
                Manage games, invites, and scores from your personal dashboard.
              </p>
            </div>
            <AuthScreen />
          </div>
        </section>

        {showAuth && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/40 p-4 pt-8 lg:hidden">
            <div
              className="absolute inset-0"
              onClick={() => setShowAuth(false)}
            />
            <div className="relative w-full max-w-md rounded-[36px] border border-primary/10 bg-white/95 p-6 shadow-[0_24px_60px_rgba(76,154,138,0.24)]">
              <div className="mb-5 flex items-center justify-between rounded-[28px] bg-secondary/10 p-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Login / Register</p>
                  <p className="mt-2 text-sm text-slate-soft">Tap outside or close to return to the landing details.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuth(false)}
                  className="primary-button rounded-[24px] px-4 py-2 text-sm"
                >
                  Close
                </button>
              </div>
              <AuthScreen />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
