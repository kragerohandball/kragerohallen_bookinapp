'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ChangePasswordPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.next !== form.confirm) {
      setError('Nytt passord og bekreftelse stemmer ikke overens')
      return
    }

    setStatus('loading')
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Noe gikk galt')
      setStatus('error')
    } else {
      setStatus('success')
      setTimeout(() => router.push('/booking'), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Kragerøhallen</h1>
          <p className="text-gray-500 mt-1">Bytt passord</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {status === 'success' ? (
            <div className="text-center space-y-3">
              <div className="text-5xl">✅</div>
              <p className="font-medium text-gray-800">Passordet er byttet!</p>
              <p className="text-sm text-gray-500">Sender deg tilbake...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Hei, {session?.user?.name}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nåværende passord
                  </label>
                  <input
                    type="password"
                    value={form.current}
                    onChange={e => set('current', e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nytt passord
                  </label>
                  <input
                    type="password"
                    value={form.next}
                    onChange={e => set('next', e.target.value)}
                    required
                    minLength={8}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Minst 8 tegn"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bekreft nytt passord
                  </label>
                  <input
                    type="password"
                    value={form.confirm}
                    onChange={e => set('confirm', e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  {status === 'loading' ? 'Lagrer...' : 'Bytt passord'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-4">
                <Link href="/booking" className="text-blue-600 hover:underline">
                  Avbryt
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
