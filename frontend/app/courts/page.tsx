'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import CourtRegistrationModal from '@/components/CourtRegistrationModal';

interface Court {
  id: string;
  name: string;
  location: string;
  court_count: number;
  court_names: string;
  maps_url?: string;
  image_url?: string;
  created_at: string;
}

export default function CourtsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [courts, setCourts] = useState<Court[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCourtRegistration, setShowCourtRegistration] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/');
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!data) {
        router.push('/onboarding');
      } else {
        setProfile(data);
      }

      setProfileLoading(false);
    });
  }, [router]);

  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001';
        const response = await fetch(`${backendUrl}/api/court-registration`);

        if (!response.ok) {
          throw new Error('Unable to load courts');
        }

        const data = await response.json();
        setCourts(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Could not load courts right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourts();
  }, []);

  const filteredCourts = courts.filter((court) =>
    court.name.toLowerCase().includes(appliedSearch.toLowerCase()) ||
    court.location.toLowerCase().includes(appliedSearch.toLowerCase())
  );

  if (profileLoading) {
    return (
      <main className="app-shell">
        <div className="soft-card p-6 text-sm text-slate-soft">Loading...</div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="page-stack">
        <Header profile={profile} />

        <section className="soft-card relative overflow-hidden p-4 sm:p-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-accent/25 blur-2xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
          <p className="pill">Find Courts</p>
          <h1 className="mt-3 font-display text-3xl leading-tight text-gradient sm:text-4xl">
            Pick your next
            <br />
            favorite spot
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-soft sm:text-base">
            Tap any court card to view the exact place photo and map location.
          </p>

          <button
            type="button"
            onClick={() => setShowCourtRegistration(true)}
            className="primary-button mt-4 rounded-xl px-4 py-2.5 text-xs sm:text-sm"
          >
            Register Court
          </button>

          <form
            className="mt-5 flex gap-2 rounded-2xl border border-primary/10 bg-white/80 p-2 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedSearch(searchQuery.trim());
            }}
          >
            <input
              type="text"
              placeholder="Search by court name or location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field-input border-0 bg-transparent p-2.5 shadow-none focus:ring-0"
            />
            <button type="submit" className="primary-button shrink-0 rounded-xl px-4 py-2.5 text-xs sm:text-sm">
              Search
            </button>
          </form>
        </section>

        {loading ? (
          <section className="soft-card p-6 text-sm text-slate-soft">Loading registered courts...</section>
        ) : error ? (
          <section className="soft-card border border-danger/20 bg-danger/5 p-6 text-sm text-danger">{error}</section>
        ) : filteredCourts.length === 0 ? (
          <section className="soft-card p-6 text-sm text-slate-soft">No courts found for this search.</section>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourts.map((court) => (
              <Link
                key={court.id}
                href={`/courts/${court.id}`}
                className="group soft-card block overflow-hidden p-2 transition duration-200 hover:-translate-y-1"
              >
                <div className="relative h-44 overflow-hidden rounded-2xl sm:h-48">
                  {court.image_url ? (
                    <img
                      src={court.image_url}
                      alt={court.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-primary/10 text-sm font-bold text-primary">
                      No image yet
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-3 py-2">
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/90">
                      {court.court_count} courts
                    </p>
                  </div>
                </div>

                <div className="p-3">
                  <h2 className="font-display text-2xl leading-tight text-text">{court.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-soft">{court.location}</p>
                  <div className="mt-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
                    Open Court Page
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}

        {showCourtRegistration && (
          <CourtRegistrationModal onClose={() => setShowCourtRegistration(false)} />
        )}
      </div>
    </main>
  );
}
