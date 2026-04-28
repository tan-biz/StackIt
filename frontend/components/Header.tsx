'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface HeaderProps {
  profile: { name: string; nickname: string; avatar_url: string | null } | null
}

export default function Header({ profile }: HeaderProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const avatarSrc = profile?.avatar_url || '/default-avatar.jpg'

  return (
    <header className="mb-5 flex items-center justify-between gap-3 animate-slide-up">
      <button
        onClick={() => router.push('/dashboard')}
        className="text-left"
        aria-label="Go to dashboard"
      >
        <div className="font-display text-4xl leading-none">
          <span className="text-gradient">Stack</span>
          <span className="text-accent">It</span>
        </div>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-soft">
          Calm pickleball flow
        </p>
      </button>

      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="glass flex min-w-[128px] items-center gap-3 rounded-full px-2.5 py-2 pr-3 transition hover:-translate-y-0.5"
        >
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-extrabold text-text">
            <Image src={avatarSrc} alt="avatar" fill sizes="44px" className="object-cover" />
          </div>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-extrabold text-text">{profile?.nickname || 'Player'}</p>
            <p className="text-xs text-slate-soft">Menu</p>
          </div>
        </button>

        {menuOpen && (
          <div className="glass absolute right-0 top-14 z-50 w-52 rounded-3xl p-2 shadow-lg animate-slide-up">
            <button
              onClick={() => {
                router.push('/profile')
                setMenuOpen(false)
              }}
              className="ghost-button w-full justify-start rounded-2xl px-4 py-3"
            >
              Profile Settings
            </button>
            <button
              onClick={() => {
                router.push('/courts')
                setMenuOpen(false)
              }}
              className="ghost-button w-full justify-start rounded-2xl px-4 py-3"
            >
              Courts
            </button>
            <button
              onClick={() => {
                router.push('/dashboard')
                setMenuOpen(false)
              }}
              className="ghost-button w-full justify-start rounded-2xl px-4 py-3"
            >
              Dashboard
            </button>
            <div className="mx-2 my-1 h-px bg-primary/10" />
            <button
              onClick={handleLogout}
              className="w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-danger transition hover:bg-danger/10"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
