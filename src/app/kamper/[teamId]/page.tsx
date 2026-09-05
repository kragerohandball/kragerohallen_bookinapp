'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SiteHeader from '@/components/SiteHeader'
import { useSiteSettings } from '@/components/SiteSettingsContext'
import { getSeasonForDate } from '@/lib/season'
import { MATCH_STATUS_LABELS } from '@/lib/kamper-constants'

type Player = { id: string; name: string; number: number | null; position: string | null; isGoalkeeper: boolean; active: boolean }
type Match = { id: string; opponentName: string; date: string; season: string; status: string; ourScore: number; opponentScore: number }
type Team = { id: string; name: string; rosterImportUrl: string | null }

function todayStr() { return new Date().toISOString().split('T')[0] }

export default function TeamPage() {
  const params = useParams<{ teamId: string }>()
  const router = useRouter()
  const { primaryColor } = useSiteSettings()

  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [newPlayer, setNewPlayer] = useState({ name: '', number: '', isGoalkeeper: false })
  const [addingPlayer, setAddingPlayer] = useState(false)

  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)

  const [showNewMatch, setShowNewMatch] = useState(false)
  const [nm, setNm] = useState({ opponentName: '', date: todayStr(), season: getSeasonForDate(new Date()) })
  const [creatingMatch, setCreatingMatch] = useState(false)

  useEffect(() => { fetchTeam() }, [params.teamId])

  function flash(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  async function fetchTeam() {
    setLoading(true)
    const res = await fetch(`/api/kamper/teams/${params.teamId}`)
    if (res.ok) {
      const data = await res.json()
      setTeam(data.team)
      setPlayers(data.players)
      setMatches(data.matches)
      setImportUrl(data.team.rosterImportUrl ?? '')
    }
    setLoading(false)
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!newPlayer.name.trim()) return
    setAddingPlayer(true)
    const res = await fetch(`/api/kamper/teams/${params.teamId}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPlayer),
    })
    const data = await res.json()
    if (res.ok) {
      setNewPlayer({ name: '', number: '', isGoalkeeper: false })
      fetchTeam()
    } else {
      flash('error', data.error)
    }
    setAddingPlayer(false)
  }

  async function handleImportRoster(e: React.FormEvent) {
    e.preventDefault()
    if (!importUrl.trim()) return
    setImporting(true)
    const res = await fetch(`/api/kamper/teams/${params.teamId}/import-roster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: importUrl.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      flash('success', `Hentet spillerstall: ${data.added} nye, ${data.updated} oppdatert, ${data.unchanged} uendret.`)
      fetchTeam()
    } else {
      flash('error', data.error)
    }
    setImporting(false)
  }

  async function handleToggleActive(p: Player) {
    await fetch(`/api/kamper/players/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !p.active }),
    })
    fetchTeam()
  }

  async function handleDeletePlayer(p: Player) {
    if (!confirm(`Fjerne ${p.name} fra stallen?`)) return
    const res = await fetch(`/api/kamper/players/${p.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.deactivated) flash('success', `${p.name} har historikk og ble derfor markert som inaktiv i stedet for slettet.`)
    fetchTeam()
  }

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault()
    if (!nm.opponentName.trim()) return
    setCreatingMatch(true)
    const res = await fetch(`/api/kamper/teams/${params.teamId}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nm),
    })
    const data = await res.json()
    if (res.ok) {
      router.push(`/kamper/kamp/${data.id}`)
    } else {
      flash('error', data.error)
      setCreatingMatch(false)
    }
  }

  const matchesBySeason = new Map<string, Match[]>()
  for (const m of matches) {
    const list = matchesBySeason.get(m.season) ?? []
    list.push(m)
    matchesBySeason.set(m.season, list)
  }
  const seasons = Array.from(matchesBySeason.keys()).sort().reverse()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a]">
        <SiteHeader backHref="/kamper" backLabel="← Kamper" title="Laster..." />
      </div>
    )
  }

  if (!team) return null

  const inputCls = "w-full bg-[#1a1a1a] border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD400] placeholder-gray-600"

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <SiteHeader backHref="/kamper" backLabel="← Kamper" title={team.name} />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {msg && (
          <div className={`text-sm px-4 py-3 rounded-lg border ${
            msg.type === 'success' ? 'bg-green-900/40 text-green-300 border-green-700' : 'bg-red-900/40 text-red-300 border-red-700'
          }`}>{msg.text}</div>
        )}

        {/* Hent fra Topphåndball */}
        <section className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-6 space-y-3">
          <h3 className="font-semibold text-white">Hent spillere fra Topphåndball</h3>
          <p className="text-sm text-gray-400">
            Lim inn lenken til lagets spillerstall-side (f.eks. https://klubbnavn.admin.topphandball.no/spillerstall/).
            Kan brukes flere ganger for å oppdatere stallen — dette sletter aldri spillere.
          </p>
          <form onSubmit={handleImportRoster} className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              placeholder="https://kragerohandball.admin.topphandball.no/spillerstall/"
              className={inputCls}
            />
            <button
              type="submit"
              disabled={importing || !importUrl.trim()}
              className="text-black font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-40 whitespace-nowrap"
              style={{ backgroundColor: primaryColor }}
            >
              {importing ? 'Henter...' : 'Hent spillere'}
            </button>
          </form>
        </section>

        {/* Stall */}
        <section className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-6 space-y-4">
          <h3 className="font-semibold text-white">Spillerstall ({players.filter(p => p.active).length} aktive)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#111] border-b border-gray-700">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-400">#</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-400">Navn</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-400 hidden sm:table-cell">Posisjon</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {players.map(p => (
                  <tr key={p.id} className={!p.active ? 'opacity-40' : ''}>
                    <td className="px-3 py-2 font-bold" style={{ color: primaryColor }}>{p.number ?? '–'}</td>
                    <td className="px-3 py-2 text-white">
                      {p.name}
                      {p.isGoalkeeper && <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">MV</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{p.position ?? '–'}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => handleToggleActive(p)} className="text-gray-400 hover:text-white text-xs mr-3">
                        {p.active ? 'Deaktiver' : 'Aktiver'}
                      </button>
                      <button onClick={() => handleDeletePlayer(p)} className="text-red-400 hover:text-red-300 text-xs">Fjern</button>
                    </td>
                  </tr>
                ))}
                {players.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">Ingen spillere ennå</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <form onSubmit={handleAddPlayer} className="flex flex-wrap gap-2 items-end pt-2 border-t border-gray-700">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-gray-400 mb-1">Navn</label>
              <input type="text" value={newPlayer.name} onChange={e => setNewPlayer(p => ({ ...p, name: e.target.value }))} className={inputCls} />
            </div>
            <div className="w-20">
              <label className="block text-xs text-gray-400 mb-1">Nummer</label>
              <input type="number" value={newPlayer.number} onChange={e => setNewPlayer(p => ({ ...p, number: e.target.value }))} className={inputCls} />
            </div>
            <label className="flex items-center gap-1.5 text-sm text-gray-300 pb-2">
              <input type="checkbox" checked={newPlayer.isGoalkeeper} onChange={e => setNewPlayer(p => ({ ...p, isGoalkeeper: e.target.checked }))} />
              Målvakt
            </label>
            <button type="submit" disabled={addingPlayer || !newPlayer.name.trim()}
              className="text-black font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-40" style={{ backgroundColor: primaryColor }}>
              {addingPlayer ? 'Legger til...' : 'Legg til spiller'}
            </button>
          </form>
        </section>

        {/* Kamper */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Kamper</h3>
            <button onClick={() => setShowNewMatch(true)} className="text-black font-bold text-sm px-4 py-2 rounded-lg" style={{ backgroundColor: primaryColor }}>
              Ny kamp
            </button>
          </div>

          {matches.length === 0 ? (
            <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-8 text-center text-gray-500">Ingen kamper ennå</div>
          ) : (
            seasons.map(season => (
              <div key={season}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">{season}</h4>
                <div className="space-y-2">
                  {matchesBySeason.get(season)!.map(m => (
                    <a key={m.id} href={`/kamper/kamp/${m.id}`} className="bg-[#2a2a2a] rounded-xl border border-gray-700 hover:border-gray-500 p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-white">vs {m.opponentName}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(m.date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{m.ourScore} – {m.opponentScore}</div>
                        <div className="text-xs text-gray-500">{MATCH_STATUS_LABELS[m.status] ?? m.status}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        {showNewMatch && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
            <form onSubmit={handleCreateMatch} className="bg-[#2a2a2a] rounded-2xl border border-gray-700 p-6 max-w-md w-full space-y-4">
              <h3 className="font-semibold text-white">Ny kamp</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Motstander</label>
                <input type="text" required value={nm.opponentName} onChange={e => setNm(p => ({ ...p, opponentName: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Dato</label>
                <input type="date" required value={nm.date} onChange={e => {
                  const date = e.target.value
                  setNm(p => ({ ...p, date, season: getSeasonForDate(new Date(date)) }))
                }} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Sesong</label>
                <input type="text" required value={nm.season} onChange={e => setNm(p => ({ ...p, season: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowNewMatch(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
                  Avbryt
                </button>
                <button type="submit" disabled={creatingMatch || !nm.opponentName.trim()}
                  className="flex-1 text-black font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-40" style={{ backgroundColor: primaryColor }}>
                  {creatingMatch ? 'Oppretter...' : 'Opprett'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
