'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Dashboard from '@/components/Dashboard'
import LoadingScreen from '@/components/LoadingScreen'
import Header from '@/components/Header'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/')
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!data) {
        router.push('/onboarding')
      } else {
        setProfile(data)
        setLoading(false)
      }
    })
  }, [router])

  if (loading) return <LoadingScreen />

  return (
    <div className="app-shell">
      <Header profile={profile} />
      <Dashboard profile={profile} />
    </div>
  )
}

