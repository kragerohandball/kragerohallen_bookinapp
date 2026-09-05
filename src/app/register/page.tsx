'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSiteSettings } from '@/components/SiteSettingsContext'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', group: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const { siteTitle, logoUrl, primaryColor, bgColor, navBgColor } = useSiteSettings()

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
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: bgColor }}>
        <div className="rounded-2xl p-8 max-w-md w-full text-center" style={{ backgroundColor: navBgColor, border: `1px solid ${primaryColor}33` }}>
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-white mb-2">Registrering mottatt!</h2>
          <p className="text-gray-400 text-sm">Administrator behandler søknaden din. Du får passord når du er godkjent.</p>
          <Link href="/login" className="mt-6 inline-block hover:underline text-sm" style={{ color: primaryColor }}>Tilbake til innlogging</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: bgColor }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center gap-4">
          {logoUrl && <Image src={logoUrl} alt={siteTitle} width={100} height={100} className="object-contain" unoptimized />}
          <div>
            <h1 className="text-3xl font-bold" style={{ color: primaryColor }}>{siteTitle}</h1>
            <p className="text-gray-400 mt-1 text-sm">Søk om tilgang til bookingsystemet</p>
          </div>
        </div>
        <div className="rounded-2xl p-8" style={{ backgroundColor: navBgColor, border: `1px solid ${primaryColor}33` }}>
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
                  className="w-full border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none placeholder-gray-600"
                  style={{ backgroundColor: bgColor }} />
              </div>
            ))}
            {error && <div className="bg-red-900/40 text-red-300 text-sm px-4 py-3 rounded-lg border border-red-700">{error}</div>}
            <button type="submit" disabled={status === 'loading'}
              className="w-full text-black font-bold py-2.5 rounded-lg transition-colors disabled:opacity-40"
              style={{ backgroundColor: primaryColor }}>
              {status === 'loading' ? 'Sender...' : 'Send søknad'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Allerede bruker?{' '}
            <Link href="/login" className="hover:underline font-medium" style={{ color: primaryColor }}>Logg inn</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
