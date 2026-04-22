'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/')
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (data) {
        setProfile(data)
        setName(data.name)
        setNickname(data.nickname)
      }
    })
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setSaving(false)
      return
    }

    const { error } = await supabase.from('profiles').update({ name, nickname }).eq('id', session.user.id)
    setMessage(error ? error.message : 'Profile updated!')
    if (!error) setProfile((p: any) => ({ ...p, name, nickname }))
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setUploading(false)
      setMessage('Please sign in again.')
      return
    }

    const path = `${session.user.id}/avatar`
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
      cacheControl: '0',
    })

    if (uploadErr) {
      setUploading(false)
      setMessage(uploadErr.message)
      e.target.value = ''
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = `${publicUrl}?t=${Date.now()}`
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', session.user.id)

    setMessage(profileErr ? profileErr.message : 'Profile picture updated!')
    if (!profileErr) {
      setProfile((p: any) => ({ ...p, avatar_url: avatarUrl }))
    }

    setUploading(false)
    e.target.value = ''
    setTimeout(() => setMessage(''), 3000)
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="font-display text-3xl text-gradient animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="relative z-10 max-w-2xl mx-auto px-5 py-5">
      <Header profile={profile} />

      <div className="glass rounded-3xl p-8 animate-scale-in">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-primary transition-colors">
            Back
          </button>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
        </div>

        <div className="flex flex-col items-center mb-10">
          <div className="relative w-28 h-28 mb-4">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold text-dark overflow-hidden">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt="avatar" width={112} height={112} className="rounded-full object-cover w-full h-full" />
              ) : (
                profile.nickname?.substring(0, 2).toUpperCase()
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-dark/60 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <label className="cursor-pointer text-primary hover:text-secondary transition-colors text-sm font-semibold">
            {uploading ? 'Uploading...' : 'Change Photo'}
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </label>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {message && (
            <div className={`rounded-xl px-4 py-3 text-sm ${message.includes('updated') ? 'bg-success/10 border border-success/30 text-success' : 'bg-danger/10 border border-danger/30 text-danger'}`}>
              {message}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary-dark text-dark font-bold rounded-xl uppercase tracking-widest hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
