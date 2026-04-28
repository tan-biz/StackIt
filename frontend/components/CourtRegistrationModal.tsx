'use client'

import { useEffect, useState } from 'react'

interface CourtRegistrationModalProps {
  onClose: () => void
}

export default function CourtRegistrationModal({ onClose }: CourtRegistrationModalProps) {
  const [name, setName] = useState('')
  const [courtCount, setCourtCount] = useState('')
  const [courtNames, setCourtNames] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [mapsUrl, setMapsUrl] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return
    }

    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [imageFile])

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (!name.trim() || !courtCount.trim() || !courtNames.trim() || !location.trim() || !mapsUrl.trim() || !imageFile) {
      setError('Please complete all fields, including court image and Google Maps link.')
      return
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001'
    const apiUrl = `${backendUrl}/api/court-registration`

    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('courtCount', String(Number(courtCount)))
    formData.append('courtNames', courtNames.trim())
    formData.append('mapsUrl', mapsUrl.trim())
    formData.append('location', location.trim())

    formData.append('image', imageFile)

    setSending(true)

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(body?.error || 'Unable to submit your registration request.')
      } else {
        setSuccess('Your court registration request has been sent successfully and is pending approval.')
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
            <label className="field-label">Name of place</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Central Park Courts"
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
            <label className="field-label">Upload a court image</label>
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="court-image"
                className="inline-flex cursor-pointer items-center justify-center rounded-[24px] bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary/90"
              >
                Choose image
              </label>
              <span className="text-sm text-slate-soft">{imageFile?.name ?? 'No image selected'}</span>
            </div>
            <input
              id="court-image"
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0] ?? null
                setImageFile(file)
              }}
              className="sr-only"
            />
            <p className="text-xs text-slate-soft">Required, upload a photo so players can verify the place.</p>
          </div>

          {imagePreview && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              <img
                src={imagePreview}
                alt="Court preview"
                className="h-40 w-full object-cover"
              />
            </div>
          )}

          <div>
            <label className="field-label">Google Maps link</label>
            <input
              type="url"
              value={mapsUrl}
              onChange={e => setMapsUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              className="field-input"
            />
            <p className="text-xs text-slate-soft">Required, paste the exact Maps URL so users can preview the location.</p>
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

          {mapsUrl.trim() && (
            <a
              href={mapsUrl.trim()}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-bold text-primary transition hover:text-primary/80"
            >
              Open map preview
            </a>
          )}

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
