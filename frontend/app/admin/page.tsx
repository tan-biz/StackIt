'use client'

import { useState, useEffect } from 'react'
import LoadingScreen from '@/components/LoadingScreen'

interface CourtRequest {
  id: string; name: string; courtCount: number; courtNames: string
  location: string; mapsUrl?: string; imageUrl?: string; createdAt: string
}
interface CourtRequestApi {
  id: string; name: string; court_count: number; court_names: string
  location: string; maps_url?: string | null; image_url?: string | null; created_at: string
}

function mapRequests(data: CourtRequestApi[]): CourtRequest[] {
  return data.map(r => ({
    id: r.id, name: r.name, courtCount: r.court_count, courtNames: r.court_names,
    location: r.location, mapsUrl: r.maps_url ?? undefined,
    imageUrl: r.image_url ?? undefined, createdAt: r.created_at,
  }))
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) { onLogin() }
      else { const d = await res.json(); setError(d.error || 'Invalid credentials'); setLoading(false) }
    } catch { setError('Network error. Please try again.'); setLoading(false) }
  }

  const inp = {
    width: '100%', boxSizing: 'border-box' as const, padding: '12px 16px', borderRadius: '14px',
    border: '1.5px solid rgba(76,154,138,0.18)', background: '#fff', color: '#2f3e46',
    fontSize: '14px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Nunito',sans-serif", background:'radial-gradient(circle at top left,rgba(164,195,178,0.42),transparent 28%),radial-gradient(circle at top right,rgba(246,189,96,0.18),transparent 24%),linear-gradient(180deg,#fcfdfb 0%,#f8f9f6 48%,#eef4ef 100%)' }}>
      <div style={{ width:'100%', maxWidth:'400px', margin:'0 16px', background:'rgba(255,255,255,0.84)', border:'1px solid rgba(76,154,138,0.18)', boxShadow:'0 24px 56px rgba(86,119,111,0.14)', backdropFilter:'blur(18px)', borderRadius:'28px', padding:'44px 36px' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:'60px', height:'60px', borderRadius:'18px', background:'linear-gradient(135deg,#4c9a8a,#7fae95)', boxShadow:'0 10px 28px rgba(76,154,138,0.28)', marginBottom:'16px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h1 style={{ fontFamily:"'Nunito',sans-serif", fontSize:'22px', fontWeight:800, color:'#2f3e46', margin:0 }}>Admin Portal</h1>
          <p style={{ color:'#5f6f76', fontSize:'13px', marginTop:'6px' }}>StackIt — restricted access</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:'16px' }}>
            <label style={{ display:'block', fontSize:'13px', fontWeight:700, color:'#5f6f76', marginBottom:'8px' }}>Email address</label>
            <input id="admin-email" type="email" value={email} required autoComplete="email" onChange={e=>setEmail(e.target.value)} placeholder="admin@stackit.com" style={inp}
              onFocus={e=>{e.target.style.borderColor='#4c9a8a';e.target.style.boxShadow='0 0 0 4px rgba(76,154,138,0.1)'}}
              onBlur={e=>{e.target.style.borderColor='rgba(76,154,138,0.18)';e.target.style.boxShadow='none'}} />
          </div>
          <div style={{ marginBottom:'22px' }}>
            <label style={{ display:'block', fontSize:'13px', fontWeight:700, color:'#5f6f76', marginBottom:'8px' }}>Password</label>
            <div style={{ position:'relative' }}>
              <input id="admin-password" type={showPass?'text':'password'} value={password} required autoComplete="current-password" onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••" style={{...inp, padding:'12px 44px 12px 16px'}}
                onFocus={e=>{e.target.style.borderColor='#4c9a8a';e.target.style.boxShadow='0 0 0 4px rgba(76,154,138,0.1)'}}
                onBlur={e=>{e.target.style.borderColor='rgba(76,154,138,0.18)';e.target.style.boxShadow='none'}} />
              <button type="button" onClick={()=>setShowPass(v=>!v)} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#5f6f76', display:'flex', alignItems:'center' }}>
                {showPass
                  ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>
          {error && (
            <div style={{ marginBottom:'16px', padding:'10px 14px', borderRadius:'10px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#dc2626', fontSize:'13px', display:'flex', alignItems:'center', gap:'8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}
          <button id="admin-login-btn" type="submit" disabled={loading} style={{ width:'100%', padding:'13px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#4c9a8a,#7fae95)', color:'#fff', fontSize:'15px', fontWeight:800, cursor:loading?'not-allowed':'pointer', boxShadow:'0 12px 24px rgba(76,154,138,0.28)', opacity:loading?0.7:1, transition:'opacity 0.2s, transform 0.15s' }}
            onMouseEnter={e=>{if(!loading)e.currentTarget.style.transform='translateY(-1px)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'}}>
            {loading?'Signing in…':'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

function RequestCard({ request, onApprove, onReject }: { request: CourtRequest; onApprove:(r:CourtRequest)=>void; onReject:(id:string)=>void }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.84)', backdropFilter:'blur(18px)', border:'1px solid rgba(76,154,138,0.16)', borderRadius:'24px', boxShadow:'0 12px 32px rgba(86,119,111,0.1)', overflow:'hidden', transition:'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLDivElement).style.boxShadow='0 20px 40px rgba(86,119,111,0.15)'}}
      onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform='translateY(0)';(e.currentTarget as HTMLDivElement).style.boxShadow='0 12px 32px rgba(86,119,111,0.1)'}}>
      {request.imageUrl && <div style={{ height:'180px', overflow:'hidden' }}><img src={request.imageUrl} alt={request.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /></div>}
      <div style={{ padding:'24px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'14px' }}>
          <div>
            <h2 style={{ fontFamily:"'Nunito',sans-serif", fontSize:'18px', fontWeight:800, color:'#2f3e46', margin:0 }}>{request.name}</h2>
            <span style={{ display:'inline-flex', alignItems:'center', marginTop:'6px', padding:'3px 10px', borderRadius:'999px', background:'rgba(246,189,96,0.18)', border:'1px solid rgba(246,189,96,0.3)', fontSize:'11px', fontWeight:800, color:'#b45309', letterSpacing:'0.1em', textTransform:'uppercase' }}>Pending</span>
          </div>
          <span style={{ fontSize:'12px', color:'#5f6f76', marginTop:'4px' }}>{new Date(request.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', color:'#5f6f76' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4c9a8a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {request.location}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', color:'#5f6f76' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4c9a8a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            {request.courtCount} {request.courtCount===1?'court':'courts'} — {request.courtNames}
          </div>
          {request.mapsUrl && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4c9a8a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
              <a href={request.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color:'#4c9a8a', fontWeight:700, textDecoration:'none' }}>View on Maps</a>
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={()=>onApprove(request)} style={{ flex:1, padding:'11px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#4c9a8a,#7fae95)', color:'#fff', fontSize:'13px', fontWeight:800, cursor:'pointer', boxShadow:'0 6px 16px rgba(76,154,138,0.24)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', transition:'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 10px 22px rgba(76,154,138,0.32)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 6px 16px rgba(76,154,138,0.24)'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Approve
          </button>
          <button onClick={()=>onReject(request.id)} style={{ flex:1, padding:'11px', borderRadius:'14px', border:'1.5px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.06)', color:'#dc2626', fontSize:'13px', fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', transition:'background 0.15s, transform 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.12)';e.currentTarget.style.transform='translateY(-1px)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(239,68,68,0.06)';e.currentTarget.style.transform='translateY(0)'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [requests, setRequests] = useState<CourtRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/requests').then(async res => {
      if (res.ok) { setRequests(mapRequests(await res.json())); setAuthenticated(true) }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/requests')
    if (res.ok) setRequests(mapRequests(await res.json()))
    setAuthenticated(true); setLoading(false)
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setAuthenticated(false); setRequests([])
  }

  const handleApprove = async (request: CourtRequest) => {
    try {
      const res = await fetch('/api/admin/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name:request.name, courtCount:request.courtCount, courtNames:request.courtNames, mapsUrl:request.mapsUrl, imageUrl:request.imageUrl, location:request.location, requestId:request.id }),
      })
      if (!res.ok) throw new Error('Failed')
      setRequests(prev => prev.filter(r => r.id !== request.id))
    } catch { alert('Failed to approve request') }
  }

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reject/${id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch { alert('Failed to reject request') }
  }

  if (loading) return <LoadingScreen />
  if (!authenticated) return <AdminLogin onLogin={handleLogin} />

  return (
    <div style={{ minHeight:'100vh', fontFamily:"'Nunito',sans-serif", background:'radial-gradient(circle at top left,rgba(164,195,178,0.42),transparent 28%),radial-gradient(circle at top right,rgba(246,189,96,0.18),transparent 24%),linear-gradient(180deg,#fcfdfb 0%,#f8f9f6 48%,#eef4ef 100%)' }}>
      <div style={{ background:'rgba(255,255,255,0.84)', backdropFilter:'blur(18px)', borderBottom:'1px solid rgba(76,154,138,0.14)', boxShadow:'0 4px 16px rgba(86,119,111,0.08)', padding:'0 24px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ maxWidth:'900px', margin:'0 auto', height:'64px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'linear-gradient(135deg,#4c9a8a,#7fae95)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <span style={{ fontWeight:800, fontSize:'15px', color:'#2f3e46' }}>StackIt Admin</span>
              <span style={{ display:'block', fontSize:'11px', color:'#5f6f76', lineHeight:'1' }}>Court Registration</span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            {requests.length > 0 && <span style={{ padding:'4px 12px', borderRadius:'999px', fontSize:'12px', fontWeight:800, background:'rgba(246,189,96,0.2)', border:'1px solid rgba(246,189,96,0.35)', color:'#b45309' }}>{requests.length} pending</span>}
            <button onClick={handleLogout} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'12px', border:'1.5px solid rgba(76,154,138,0.18)', background:'rgba(255,255,255,0.8)', color:'#5f6f76', fontSize:'13px', fontWeight:700, cursor:'pointer', transition:'background 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(76,154,138,0.06)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.8)'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign out
            </button>
          </div>
        </div>
      </div>
      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'32px 24px' }}>
        <div style={{ marginBottom:'28px' }}>
          <h1 style={{ fontFamily:"'Nunito',sans-serif", fontSize:'26px', fontWeight:800, color:'#2f3e46', margin:0 }}>Court Registration Requests</h1>
          <p style={{ color:'#5f6f76', fontSize:'14px', marginTop:'6px' }}>Review and approve new court venues submitted by venue owners.</p>
        </div>
        {error && <div style={{ padding:'14px 18px', borderRadius:'14px', marginBottom:'24px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#dc2626', fontSize:'14px' }}>{error}</div>}
        {requests.length === 0 ? (
          <div style={{ background:'rgba(255,255,255,0.84)', backdropFilter:'blur(18px)', border:'1px solid rgba(76,154,138,0.16)', borderRadius:'24px', padding:'56px 24px', textAlign:'center', boxShadow:'0 12px 32px rgba(86,119,111,0.08)' }}>
            <div style={{ width:'64px', height:'64px', borderRadius:'20px', margin:'0 auto 16px', background:'rgba(76,154,138,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4c9a8a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p style={{ fontWeight:800, fontSize:'16px', color:'#2f3e46', margin:0 }}>All clear!</p>
            <p style={{ color:'#5f6f76', fontSize:'14px', marginTop:'6px' }}>No pending court registration requests.</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'20px' }}>
            {requests.map(r => <RequestCard key={r.id} request={r} onApprove={handleApprove} onReject={handleReject} />)}
          </div>
        )}
      </div>
    </div>
  )
}
