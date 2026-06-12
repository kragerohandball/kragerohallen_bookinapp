'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import KIFLogo from '@/components/KIFLogo'

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
    else if (res?.error === 'MUST_CHANGE_PASSWORD') router.push('/change-password')
    else if (res?.error) setError('Feil e-post eller passord')
    else router.push('/booking')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 100, height: 100 }}>
            <KIFLogo />
          </div>
          <h1 style={{ color: '#FFD400', fontSize: '2rem', fontWeight: 800, margin: 0 }}>Kragerøhallen</h1>
        </div>
        <div style={{ backgroundColor: '#2a2a2a', borderRadius: '1rem', border: '1px solid rgba(255,212,0,0.2)', padding: '2rem' }}>
          <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 600, marginTop: 0, marginBottom: '1.5rem' }}>Logg inn</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#d1d5db', marginBottom: '0.25rem' }}>E-post</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', backgroundColor: '#1a1a1a', border: '1px solid #4b5563', color: 'white', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#d1d5db', marginBottom: '0.25rem' }}>Passord</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: '100%', backgroundColor: '#1a1a1a', border: '1px solid #4b5563', color: 'white', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            {error && (
              <div style={{ backgroundColor: 'rgba(127,29,29,0.4)', color: '#fca5a5', fontSize: '0.875rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #b91c1c' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              style={{ width: '100%', backgroundColor: loading ? 'rgba(255,212,0,0.4)' : '#FFD400', color: '#000', fontWeight: 700, padding: '0.625rem', borderRadius: '0.5rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem' }}>
              {loading ? 'Logger inn...' : 'Logg inn'}
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', marginTop: '1.5rem', marginBottom: 0 }}>
            Ikke bruker?{' '}
            <Link href="/register" style={{ color: '#FFD400', fontWeight: 500, textDecoration: 'none' }}>Søk om tilgang</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
