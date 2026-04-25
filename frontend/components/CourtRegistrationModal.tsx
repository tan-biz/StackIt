'use client'

import { useState } from 'react'

interface CourtRegistrationModalProps {
  onClose: () => void
}

export default function CourtRegistrationModal({ onClose }: CourtRegistrationModalProps) {
  const [name, setName] = useState('')
  const [courtCount, setCourtCount] = useState('')
  const [courtNames, setCourtNames] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (!name.trim() || !courtCount.trim() || !courtNames.trim() || !location.trim()) {
      setError('Please answer all questions before submitting.')
      return
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
    const apiUrl = `${backendUrl}/api/court-registration`

    setSending(true)

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          courtCount: Number(courtCount),
          courtNames: courtNames.trim(),
          location: location.trim(),
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(body?.error || 'Unable to submit your registration request.')
      } else {
        setSuccess('Your court registration request has been sent successfully!')
      }
    } catch (error) {
      setError('Unable to send the registration request right now. Please try again later.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/40 p-4 pt-8">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-[36px] border border-primary/10 bg-white/95 p-6 shadow-[0_24px_60px_rgba(76,154,138,0.24)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between rounded-[28px] bg-secondary/10 p-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Court registration</p>
            <p className="mt-2 text-sm text-slate-soft">Tell us about your courts so local players can find you.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="primary-button rounded-[24px] px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="field-label">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">How many courts</label>
            <input
              type="number"
              min={1}
              value={courtCount}
              onChange={e => setCourtCount(e.target.value)}
              placeholder="1, 2, 3..."
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">Name of courts</label>
            <textarea
              value={courtNames}
              onChange={e => setCourtNames(e.target.value)}
              placeholder="Court A, Court B, etc."
              rows={3}
              className="field-input min-h-[100px] resize-none"
            />
          </div>

          <div>
            <label className="field-label">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Makati, Metro Manila"
              className="field-input"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
              {success}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending}
            className="primary-button w-full rounded-[28px] py-4 text-base disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? 'Sending request...' : 'Submit request'}
          </button>
        </div>
      </div>
    </div>
  )
}
