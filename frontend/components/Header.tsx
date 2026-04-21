'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

interface HeaderProps {
  profile: { name: string; nickname: string; avatar_url: string | null } | null
}

export default function Header({ profile }: HeaderProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials = profile?.nickname?.substring(0, 2).toUpperCase() || '?'

  return (
    <header className="flex justify-between items-center py-5 mb-10 animate-slide-up">
      <h1
        className="font-display text-4xl text-gradient tracking-wider cursor-pointer"
        onClick={() => router.push('/dashboard')}
      >
        STACKIT
      </h1>

      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 glass px-3 py-2 rounded-full hover:border-primary/50 transition-all"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-dark text-sm overflow-hidden">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="avatar" width={36} height={36} className="rounded-full object-cover" />
            ) : initials}
          </div>
          <span className="text-sm font-semibold pr-1">{profile?.nickname || 'Player'}</span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-14 glass rounded-2xl p-2 w-48 shadow-2xl z-50 animate-slide-up">
            <button
              onClick={() => { router.push('/profile'); setMenuOpen(false) }}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-sm transition-colors"
            >
              👤 Profile Settings
            </button>
            <button
              onClick={() => { router.push('/dashboard'); setMenuOpen(false) }}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-sm transition-colors"
            >
              🏠 Dashboard
            </button>
            <hr className="border-white/10 my-1" />
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-danger/10 text-danger text-sm transition-colors"
            >
              🚪 Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
