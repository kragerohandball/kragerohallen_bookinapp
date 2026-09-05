'use client'
import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useSiteSettings } from '@/components/SiteSettingsContext'

export default function ChangePasswordPage() {
  const { data: session } = useSession()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const { siteTitle, logoUrl, primaryColor, bgColor, navBgColor } = useSiteSettings()

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.next !== form.confirm) { setError('Nytt passord og bekreftelse stemmer ikke overens'); return }
    setStatus('loading')
    const res = await fetch('/api/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Noe gikk galt'); setStatus('error') }
    else { setStatus('success'); setTimeout(() => signOut({ callbackUrl: '/login' }), 2000) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: bgColor }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          {logoUrl && <Image src={logoUrl} alt={siteTitle} width={80} height={80} className="object-contain" unoptimized />}
          <h1 className="text-3xl font-bold" style={{ color: primaryColor }}>{siteTitle}</h1>
          <p className="text-gray-400 text-sm">Bytt passord</p>
        </div>
        <div className="rounded-2xl p-8" style={{ backgroundColor: navBgColor, border: `1px solid ${primaryColor}33` }}>
          {status === 'success' ? (
            <div className="text-center space-y-3">
              <div className="text-5xl">✅</div>
              <p className="font-medium text-white">Passordet er byttet!</p>
              <p className="text-sm text-gray-400">Sender deg til innlogging...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Hei, {session?.user?.name}</h2>
              {session?.user?.mustChangePassword && (
                <div className="text-sm px-4 py-3 rounded-lg mb-4" style={{ backgroundColor: `${primaryColor}18`, color: primaryColor, border: `1px solid ${primaryColor}40` }}>
                  Velkommen! Du må bytte passord før du kan bruke bookingsystemet.
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {[
                  { field: 'current', label: 'Nåværende passord' },
                  { field: 'next', label: 'Nytt passord', extra: { minLength: 8, placeholder: 'Minst 8 tegn' } },
                  { field: 'confirm', label: 'Bekreft nytt passord' },
                ].map(({ field, label, extra }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
                    <input type="password" value={form[field as keyof typeof form]}
                      onChange={e => set(field, e.target.value)} required {...(extra || {})}
                      className="w-full border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none placeholder-gray-600"
                      style={{ backgroundColor: bgColor }} />
                  </div>
                ))}
                {error && <div className="bg-red-900/40 text-red-300 text-sm px-4 py-3 rounded-lg border border-red-700">{error}</div>}
                <button type="submit" disabled={status === 'loading'}
                  className="w-full text-black font-bold py-2.5 rounded-lg transition-colors disabled:opacity-40"
                  style={{ backgroundColor: primaryColor }}>
                  {status === 'loading' ? 'Lagrer...' : 'Bytt passord'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-4">
                <Link href="/booking" className="hover:underline" style={{ color: primaryColor }}>Avbryt</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
