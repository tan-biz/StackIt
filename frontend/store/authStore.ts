import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  name: string
  nickname: string
  avatar_url: string | null
}

interface AuthState {
  user: any | null
  profile: Profile | null
  loading: boolean
  setUser: (user: any) => void
  setProfile: (profile: Profile | null) => void
  fetchProfile: (userId: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  fetchProfile: async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    set({ profile: data, loading: false })
  },
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))
