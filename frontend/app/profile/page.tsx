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
    if (!error) setProfile((current: any) => ({ ...current, name, nickname }))
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
    const { error: profileErr } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', session.user.id)

    setMessage(profileErr ? profileErr.message : 'Profile picture updated!')
    if (!profileErr) setProfile((current: any) => ({ ...current, avatar_url: avatarUrl }))

    setUploading(false)
    e.target.value = ''
    setTimeout(() => setMessage(''), 3000)
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-display text-3xl text-gradient animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Header profile={profile} />

      <div className="soft-card mx-auto max-w-2xl p-5 sm:p-6 animate-scale-in">
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="secondary-button -ml-1 h-11 w-11 rounded-xl p-0"
            aria-label="Back to Dashboard"
            title="Back to Dashboard"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-2xl font-black text-text">Profile Settings</h1>
        </div>

        <div className="mb-8 rounded-[28px] bg-secondary/20 p-5">
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center sm:gap-5">
            <div className="relative mb-4 h-28 w-28 shrink-0 overflow-hidden rounded-full bg-secondary text-4xl font-black text-text sm:mb-0">
              <Image src={profile.avatar_url || '/default-avatar.jpg'} alt="avatar" fill sizes="112px" className="object-cover" />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-text/40">
                  <div className="h-7 w-7 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Avatar</p>
              <h2 className="mt-1 text-xl font-black text-text">{profile.nickname}</h2>
              <label className="primary-button mt-4 cursor-pointer">
                {uploading ? 'Uploading...' : 'Change Photo'}
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="field-label">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="field-input" />
          </div>

          <div>
            <label className="field-label">Nickname</label>
            <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="field-input" />
          </div>

          {message && (
            <div className={`rounded-2xl px-4 py-3 text-sm ${message.includes('updated') ? 'border border-success/20 bg-success/10 text-success' : 'border border-danger/20 bg-danger/10 text-danger'}`}>
              {message}
            </div>
          )}

          <button onClick={handleSave} disabled={saving} className="primary-button w-full py-4 text-base">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
