'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface CourtDetail {
  id: string
  name: string
  location: string
  court_count: number
  court_names: string
  maps_url?: string
  image_url?: string
  created_at: string
}

interface CourtDetailPageProps {
  params: {
    id: string
  }
}

export default function CourtDetailPage({ params }: CourtDetailPageProps) {
  const [court, setCourt] = useState<CourtDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'photo' | 'map' | 'info'>('photo')

  useEffect(() => {
    const fetchCourt = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001'
        const response = await fetch(`${backendUrl}/api/court-registration/${params.id}`)

        if (!response.ok) {
          throw new Error('Failed to fetch court details')
        }

        const data: CourtDetail = await response.json()
        setCourt(data)
      } catch {
        setError('Failed to fetch court details')
      } finally {
        setLoading(false)
      }
    }

    fetchCourt()
  }, [params.id])

  if (loading) {
    return (
      <main className="app-shell">
        <div className="soft-card p-6 text-sm text-slate-soft">Loading court details...</div>
      </main>
    )
  }

  if (error || !court) {
    return (
      <main className="app-shell">
        <div className="soft-card border border-danger/20 bg-danger/5 p-6">
          <p className="text-danger">{error || 'Court not found'}</p>
          <Link href="/courts" className="secondary-button mt-4 h-11 w-11 rounded-xl p-0" aria-label="Back to Courts" title="Back to Courts">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        </div>
      </main>
    )
  }

  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(court.location)}&output=embed`
  const mapOpenUrl = court.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(court.location)}`

  return (
    <main className="app-shell">
      <div className="page-stack">
        <Link href="/courts" className="secondary-button h-11 w-11 rounded-xl p-0" aria-label="Back to Courts" title="Back to Courts">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>

        <section className="soft-card relative overflow-hidden p-4 sm:p-6">
          <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-primary/20 blur-2xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-28 w-28 rounded-full bg-accent/25 blur-2xl" />
          <p className="pill">Court Profile</p>
          <h1 className="mt-3 font-display text-3xl leading-tight text-gradient sm:text-4xl">{court.name}</h1>
          <p className="mt-2 text-sm text-slate-soft sm:text-base">{court.location}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="surface-muted px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              {court.court_count} courts
            </span>
            <span className="surface-muted px-3 py-2 text-xs font-bold text-slate-soft">
              {new Date(court.created_at).toLocaleDateString()}
            </span>
          </div>
        </section>

        <section className="soft-card p-2 sm:hidden">
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-primary/10 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('photo')}
              className={`rounded-xl px-3 py-2 text-xs font-extrabold uppercase tracking-[0.14em] transition ${
                activeTab === 'photo' ? 'bg-white text-primary shadow-sm' : 'text-slate-soft'
              }`}
            >
              Photo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`rounded-xl px-3 py-2 text-xs font-extrabold uppercase tracking-[0.14em] transition ${
                activeTab === 'map' ? 'bg-white text-primary shadow-sm' : 'text-slate-soft'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`rounded-xl px-3 py-2 text-xs font-extrabold uppercase tracking-[0.14em] transition ${
                activeTab === 'info' ? 'bg-white text-primary shadow-sm' : 'text-slate-soft'
              }`}
            >
              Info
            </button>
          </div>
        </section>

        <section className={`soft-card overflow-hidden p-3 sm:p-4 ${activeTab !== 'photo' ? 'sm:block hidden' : ''}`}>
          <h2 className="px-2 pb-3 pt-1 font-display text-2xl text-text">Uploaded Court Photo</h2>
          {court.image_url ? (
            <img src={court.image_url} alt={court.name} className="h-72 w-full rounded-2xl object-cover sm:h-[420px]" />
          ) : (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-6 text-sm text-slate-soft">
              No image uploaded for this court.
            </div>
          )}
        </section>

        <section className={`soft-card p-3 sm:p-4 ${activeTab !== 'map' ? 'sm:block hidden' : ''}`}>
          <h2 className="px-2 pb-3 pt-1 font-display text-2xl text-text">Where It Is</h2>
          <div className="overflow-hidden rounded-2xl border border-primary/10">
            <iframe
              title={`${court.name} map`}
              src={mapEmbedUrl}
              className="h-72 w-full sm:h-[420px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <a href={mapOpenUrl} target="_blank" rel="noopener noreferrer" className="primary-button mt-3 w-full sm:w-fit">
            Open In Maps
          </a>
        </section>

        <section className={`soft-card p-4 ${activeTab !== 'info' ? 'sm:block hidden' : ''}`}>
          <h2 className="font-display text-2xl text-text">Court Names</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-soft">{court.court_names}</p>
        </section>
      </div>
    </main>
  )
}
