'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import { useSiteSettings } from '@/components/SiteSettingsContext'

type Team = { id: string; name: string; _count: { players: number; matches: number } }

export default function KamperPage() {
  const { primaryColor } = useSiteSettings()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchTeams() }, [])

  async function fetchTeams() {
    setLoading(true)
    const res = await fetch('/api/kamper/teams')
    if (res.ok) setTeams(await res.json())
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/kamper/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    const data = await res.json()
    if (res.ok) {
      setNewName('')
      fetchTeams()
    } else {
      setError(data.error)
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <SiteHeader backHref="/booking" backLabel="← Booking" title="Kamper" />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <form onSubmit={handleCreate} className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-4 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nytt lag, f.eks. G14 eller A-lag herrer"
            className="flex-1 bg-[#1a1a1a] border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD400] placeholder-gray-600"
          />
          <button
            type="submit"
            disabled={submitting || !newName.trim()}
            className="text-black font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-40"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting ? 'Oppretter...' : 'Nytt lag'}
          </button>
        </form>
        {error && <div className="text-sm text-red-300 bg-red-900/40 border border-red-700 rounded-lg px-4 py-2">{error}</div>}

        {loading ? (
          <div className="text-gray-500 text-sm">Laster...</div>
        ) : teams.length === 0 ? (
          <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-8 text-center text-gray-500">
            Ingen lag ennå. Opprett et lag for å komme i gang.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {teams.map(t => (
              <Link
                key={t.id}
                href={`/kamper/${t.id}`}
                className="bg-[#2a2a2a] rounded-xl border border-gray-700 hover:border-gray-500 p-4 block"
              >
                <div className="font-semibold text-white">{t.name}</div>
                <div className="text-sm text-gray-500">{t._count.players} spillere · {t._count.matches} kamper</div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
