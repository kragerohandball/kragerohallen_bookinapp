'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error === 'PENDING') setError('Brukeren din venter på godkjenning av administrator.')
    else if (res?.error === 'REJECTED') setError('Tilgangen din er avvist. Kontakt administrator.')
    else if (res?.error) setError('Feil e-post eller passord.')
    else router.push('/booking')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo og tittel */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="KIF Håndball"
            style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem' }}
          />
          <h1 style={{ color: '#FFD400', fontSize: '2rem', fontWeight: 800, margin: 0 }}>Kragerøhallen</h1>
          <p style={{ color: '#888', marginTop: '0.4rem', fontSize: '0.9rem' }}>Bookingsystem – KIF Håndball</p>
        </div>

        {/* Kortboks */}
        <div style={{ backgroundColor: '#2a2a2a', borderRadius: '1rem', border: '1px solid rgba(255,212,0,0.2)', padding: '2rem' }}>
          <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600, marginTop: 0, marginBottom: '1.5rem' }}>Logg inn</h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#ccc', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>E-post</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="din@epost.no"
                style={{ width: '100%', backgroundColor: '#1a1a1a', border: '1px solid #555', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', color: '#ccc', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Passord</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', backgroundColor: '#1a1a1a', border: '1px solid #555', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {error && (
              <div style={{ backgroundColor: 'rgba(180,40,40,0.3)', border: '1px solid #7f2020', color: '#fca5a5', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', backgroundColor: loading ? 'rgba(255,212,0,0.4)' : '#FFD400', color: '#000', fontWeight: 700, fontSize: '1rem', padding: '0.7rem', borderRadius: '0.5rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Logger inn...' : 'Logg inn'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#666', marginTop: '1.5rem', marginBottom: 0 }}>
            Ikke registrert?{' '}
            <Link href="/register" style={{ color: '#FFD400', textDecoration: 'none', fontWeight: 600 }}>Søk om tilgang</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
