'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', group: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')
    const res = await fetch('/api/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Noe gikk galt'); setStatus('error') }
    else setStatus('success')
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4">
        <div className="bg-[#2a2a2a] rounded-2xl border border-[#FFD400]/20 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-white mb-2">Registrering mottatt!</h2>
          <p className="text-gray-400 text-sm">Administrator behandler søknaden din. Du får passord når du er godkjent.</p>
          <Link href="/login" className="mt-6 inline-block text-[#FFD400] hover:underline text-sm">Tilbake til innlogging</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-small.png" alt="KIF Håndball" width={100} height={100} style={{ borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '0 auto' }} />
          <div>
            <h1 className="text-3xl font-bold text-[#FFD400]">Kragerøhallen</h1>
            <p className="text-gray-400 mt-1 text-sm">Søk om tilgang til bookingsystemet</p>
          </div>
        </div>
        <div className="bg-[#2a2a2a] rounded-2xl border border-[#FFD400]/20 p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Registrer deg</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { field: 'name', label: 'Fullt navn', type: 'text', placeholder: 'Ola Nordmann' },
              { field: 'email', label: 'E-post', type: 'email', placeholder: 'din@epost.no' },
              { field: 'phone', label: 'Mobilnummer', type: 'tel', placeholder: '99999999' },
              { field: 'group', label: 'Gruppe / lag', type: 'text', placeholder: 'F.eks. Kragerø IL' },
            ].map(({ field, label, type, placeholder }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
                <input type={type} value={form[field as keyof typeof form]}
                  onChange={e => set(field, e.target.value)} required placeholder={placeholder}
                  className="w-full bg-[#1a1a1a] border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFD400] focus:border-transparent placeholder-gray-600" />
              </div>
            ))}
            {error && <div className="bg-red-900/40 text-red-300 text-sm px-4 py-3 rounded-lg border border-red-700">{error}</div>}
            <button type="submit" disabled={status === 'loading'}
              className="w-full bg-[#FFD400] hover:bg-[#e6be00] disabled:bg-[#FFD400]/40 text-black font-bold py-2.5 rounded-lg transition-colors">
              {status === 'loading' ? 'Sender...' : 'Send søknad'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Allerede bruker?{' '}
            <Link href="/login" className="text-[#FFD400] hover:underline font-medium">Logg inn</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
