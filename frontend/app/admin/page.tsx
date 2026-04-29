'use client'

import { useState, useEffect } from 'react'
import LoadingScreen from '@/components/LoadingScreen'

interface CourtRequest {
  id: string
  name: string
  courtCount: number
  courtNames: string
  location: string
  mapsUrl?: string
  imageUrl?: string
  createdAt: string
}

interface CourtRequestApi {
  id: string
  name: string
  court_count: number
  court_names: string
  location: string
  maps_url?: string | null
  image_url?: string | null
  created_at: string
}

export default function AdminPage() {
  const [requests, setRequests] = useState<CourtRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001'
      const response = await fetch(`${backendUrl}/api/court-registration/requests`)

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || 'Failed to fetch requests')
      }

      const data: CourtRequestApi[] = await response.json()
      const mapped = data.map((request) => ({
        id: request.id,
        name: request.name,
        courtCount: request.court_count,
        courtNames: request.court_names,
        location: request.location,
        mapsUrl: request.maps_url ?? undefined,
        imageUrl: request.image_url ?? undefined,
        createdAt: request.created_at,
      }))

      setRequests(mapped)
      setLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch requests'
      setError(message)
      setLoading(false)
    }
  }

  const handleApprove = async (request: CourtRequest) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001'
      const response = await fetch(`${backendUrl}/api/court-registration/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: request.name,
          courtCount: request.courtCount,
          courtNames: request.courtNames,
          mapsUrl: request.mapsUrl,
          imageUrl: request.imageUrl,
          location: request.location,
          requestId: request.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create court place')
      }

      // Remove the approved request from the list
      setRequests(requests.filter(r => r.id !== request.id))
      alert('Court place created successfully!')
    } catch (err) {
      alert('Failed to approve request')
    }
  }

  const handleReject = (requestId: string) => {
    const rejectRequest = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001'
        const response = await fetch(`${backendUrl}/api/court-registration/requests/${requestId}/reject`, {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Failed to reject request')
        }

        setRequests(requests.filter(r => r.id !== requestId))
        alert('Request rejected')
      } catch (err) {
        alert('Failed to reject request')
      }
    }

    rejectRequest()
  }

  if (loading) return <LoadingScreen />
  if (error) return <div className="p-4 text-red-500">{error}</div>

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin - Court Registration Requests</h1>

      {requests.length === 0 ? (
        <p className="text-gray-500">No pending requests</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="border border-gray-300 rounded p-4">
              <h2 className="text-xl font-semibold">{request.name}</h2>
              <p className="text-gray-600">Location: {request.location}</p>
              <p className="text-gray-600">Courts: {request.courtCount} ({request.courtNames})</p>
              {request.mapsUrl && (
                <p className="text-gray-600">
                  Maps: <a href={request.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {request.mapsUrl}
                  </a>
                </p>
              )}
              {request.imageUrl && (
                <img
                  src={request.imageUrl}
                  alt={`${request.name} preview`}
                  className="mt-3 h-40 w-full rounded object-cover"
                />
              )}
              <p className="text-gray-600 text-sm">Submitted: {new Date(request.createdAt).toLocaleDateString()}</p>

              <div className="mt-4 space-x-2">
                <button
                  onClick={() => handleApprove(request)}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
