'use client'
import { useEffect, useState } from 'react'
import SiteHeader from '@/components/SiteHeader'
import { useSiteSettings } from '@/components/SiteSettingsContext'
import { getSeasonForDate } from '@/lib/season'
import type { PlayerRow, PositionRow, ZoneRow } from '@/lib/kamper-stats'
import { computeOutfieldTotals, computeGoalkeeperTotals } from '@/lib/kamper-stats'
import { SHOT_POSITION_LABELS } from '@/lib/kamper-constants'
import CourtPositionChart from '@/components/CourtPositionChart'
import GoalZoneHeatmap from '@/components/GoalZoneHeatmap'
import { PrintOutfieldTable, PrintGoalkeeperTable, PrintPositionTable } from '@/components/print/PrintTables'

type Team = { id: string; name: string }
type Stats = {
  team: Team
  matchesPlayed: number
  matchesFinished: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  players: PlayerRow[]
  positions: PositionRow[]
  zones: ZoneRow[]
}

const inputCls = "bg-[#1a1a1a] border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"

export default function StatistikkPage() {
  const { primaryColor } = useSiteSettings()
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState('')
  const [seasons, setSeasons] = useState<string[]>([])
  const [season, setSeason] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/kamper/teams').then(r => r.json()).then((ts: Team[]) => {
      setTeams(ts)
      if (ts.length > 0) setTeamId(ts[0].id)
    })
  }, [])

  useEffect(() => {
    if (!teamId) return
    fetch(`/api/kamper/teams/${teamId}`).then(r => r.json()).then(data => {
      const uniqueSeasons = Array.from(new Set(data.matches.map((m: { season: string }) => m.season))) as string[]
      uniqueSeasons.sort().reverse()
      const current = getSeasonForDate(new Date())
      if (!uniqueSeasons.includes(current)) uniqueSeasons.unshift(current)
      setSeasons(uniqueSeasons)
      setSeason(uniqueSeasons[0])
    })
  }, [teamId])

  useEffect(() => {
    if (!teamId || !season) return
    setLoading(true)
    fetch(`/api/kamper/stats?teamId=${teamId}&season=${encodeURIComponent(season)}`)
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [teamId, season])

  const outPlayers = stats?.players.filter(p => !p.isGoalkeeper) ?? []
  const keepers = stats?.players.filter(p => p.isGoalkeeper) ?? []
  const outfieldTotals = stats ? computeOutfieldTotals(stats.players) : null
  const goalkeeperTotals = stats ? computeGoalkeeperTotals(stats.players) : null

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <SiteHeader backHref="/kamper" backLabel="← Kamper" title="Sesongstatistikk" />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6 print:hidden">
        <div className="flex flex-wrap gap-3">
          <select value={teamId} onChange={e => setTeamId(e.target.value)} className={inputCls}>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={season} onChange={e => setSeason(e.target.value)} className={inputCls}>
            {seasons.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {stats && (
            <button onClick={() => window.print()} className="bg-[#2a2a2a] border border-gray-600 hover:border-gray-400 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Skriv ut rapport
            </button>
          )}
        </div>

        {loading && <div className="text-gray-500 text-sm">Laster...</div>}

        {stats && !loading && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Kamper', stats.matchesPlayed],
                ['Seire / Uavgjort / Tap', `${stats.wins} / ${stats.draws} / ${stats.losses}`],
                ['Mål for', stats.goalsFor],
                ['Mål mot', stats.goalsAgainst],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-4 text-center">
                  <div className="text-2xl font-bold" style={{ color: primaryColor }}>{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>

            <section className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-4">
              <h3 className="font-semibold text-white mb-3">Skuddkart</h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <CourtPositionChart stats={stats.positions} primaryColor={primaryColor} title="Hvor skuddene kommer fra" />
                <GoalZoneHeatmap stats={stats.zones} primaryColor={primaryColor} title="Hvor i målet det skytes" />
              </div>
            </section>

            <section className="bg-[#2a2a2a] rounded-xl border border-gray-700 overflow-hidden">
              <h3 className="font-semibold text-white px-4 pt-4">Utespillere</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-2">
                  <thead className="bg-[#111] border-b border-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-400">#</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-400">Navn</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400">Mål</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400">Assist</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400">Skudd%</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400 hidden sm:table-cell">Skudd</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400 hidden md:table-cell">Tekn. feil</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400 hidden md:table-cell">Forsvarsfeil</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400 hidden lg:table-cell">Snapp</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400 hidden lg:table-cell">Frikast vunnet</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400">🟨</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400">2'</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400">🟥</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {outPlayers.map(p => (
                      <tr key={p.playerId}>
                        <td className="px-3 py-2 font-bold" style={{ color: primaryColor }}>{p.number ?? '–'}</td>
                        <td className="px-3 py-2 text-white">{p.name}</td>
                        <td className="px-3 py-2 text-right text-white">{p.goals}</td>
                        <td className="px-3 py-2 text-right text-white">{p.assists}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{p.shootingPct != null ? `${p.shootingPct}%` : '–'}</td>
                        <td className="px-3 py-2 text-right text-gray-400 hidden sm:table-cell">{p.shotsTotal}</td>
                        <td className="px-3 py-2 text-right text-gray-400 hidden md:table-cell">{p.technicalFaults}</td>
                        <td className="px-3 py-2 text-right text-gray-400 hidden md:table-cell">{p.defensiveFouls}</td>
                        <td className="px-3 py-2 text-right text-gray-400 hidden lg:table-cell">{p.steals}</td>
                        <td className="px-3 py-2 text-right text-gray-400 hidden lg:table-cell">{p.freeThrowsWon}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{p.yellowCards}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{p.twoMinutes}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{p.redCards}</td>
                      </tr>
                    ))}
                    {outPlayers.length === 0 && (
                      <tr><td colSpan={13} className="px-3 py-6 text-center text-gray-500">Ingen data</td></tr>
                    )}
                    {outfieldTotals && outPlayers.length > 0 && (
                      <tr className="border-t-2 border-gray-600 font-semibold">
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-white">Totalt</td>
                        <td className="px-3 py-2 text-right text-white">{outfieldTotals.goals}</td>
                        <td className="px-3 py-2 text-right text-white">{outfieldTotals.assists}</td>
                        <td className="px-3 py-2 text-right text-gray-300">{outfieldTotals.shootingPct != null ? `${outfieldTotals.shootingPct}%` : '–'}</td>
                        <td className="px-3 py-2 text-right text-gray-300 hidden sm:table-cell">{outfieldTotals.shotsTotal}</td>
                        <td className="px-3 py-2 text-right text-gray-300 hidden md:table-cell">{outfieldTotals.technicalFaults}</td>
                        <td className="px-3 py-2 text-right text-gray-300 hidden md:table-cell">{outfieldTotals.defensiveFouls}</td>
                        <td className="px-3 py-2 text-right text-gray-300 hidden lg:table-cell">{outfieldTotals.steals}</td>
                        <td className="px-3 py-2 text-right text-gray-300 hidden lg:table-cell">{outfieldTotals.freeThrowsWon}</td>
                        <td className="px-3 py-2 text-right text-gray-300">{outfieldTotals.yellowCards}</td>
                        <td className="px-3 py-2 text-right text-gray-300">{outfieldTotals.twoMinutes}</td>
                        <td className="px-3 py-2 text-right text-gray-300">{outfieldTotals.redCards}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-[#2a2a2a] rounded-xl border border-gray-700 overflow-hidden">
              <h3 className="font-semibold text-white px-4 pt-4">Målvakter</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-2">
                  <thead className="bg-[#111] border-b border-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-400">#</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-400">Navn</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400">Redninger</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400">Baklengs mål</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400">Redning%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {keepers.map(p => (
                      <tr key={p.playerId}>
                        <td className="px-3 py-2 font-bold" style={{ color: primaryColor }}>{p.number ?? '–'}</td>
                        <td className="px-3 py-2 text-white">{p.name}</td>
                        <td className="px-3 py-2 text-right text-white">{p.saves}</td>
                        <td className="px-3 py-2 text-right text-white">{p.goalsConceded}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{p.savePct != null ? `${p.savePct}%` : '–'}</td>
                      </tr>
                    ))}
                    {keepers.length === 0 && (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Ingen data</td></tr>
                    )}
                    {goalkeeperTotals && keepers.length > 0 && (
                      <tr className="border-t-2 border-gray-600 font-semibold">
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-white">Totalt</td>
                        <td className="px-3 py-2 text-right text-white">{goalkeeperTotals.saves}</td>
                        <td className="px-3 py-2 text-right text-white">{goalkeeperTotals.goalsConceded}</td>
                        <td className="px-3 py-2 text-right text-gray-300">{goalkeeperTotals.savePct != null ? `${goalkeeperTotals.savePct}%` : '–'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-[#2a2a2a] rounded-xl border border-gray-700 overflow-hidden">
              <h3 className="font-semibold text-white px-4 pt-4">Skudd etter posisjon</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-2">
                  <thead className="bg-[#111] border-b border-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-400">Posisjon</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400">Skudd</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400">Mål</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-400">Skudd%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {stats.positions.filter(p => p.shots > 0).map(p => (
                      <tr key={p.position}>
                        <td className="px-3 py-2 text-white">{SHOT_POSITION_LABELS[p.position]}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{p.shots}</td>
                        <td className="px-3 py-2 text-right text-white">{p.goals}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{p.shootingPct != null ? `${p.shootingPct}%` : '–'}</td>
                      </tr>
                    ))}
                    {stats.positions.every(p => p.shots === 0) && (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">Ingen data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Utskriftsvennlig rapport (kun synlig ved utskrift) */}
      {stats && (
        <div className="hidden print:block bg-white text-black p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{stats.team.name} — Sesongstatistikk {season}</h1>
            <p className="text-sm text-gray-700">
              {stats.matchesPlayed} kamper · {stats.wins} S / {stats.draws} U / {stats.losses} T · Mål {stats.goalsFor}–{stats.goalsAgainst}
            </p>
          </div>
          <section>
            <h2 className="text-lg font-semibold mb-2">Utespillere</h2>
            <PrintOutfieldTable players={stats.players} totals={outfieldTotals!} />
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-2">Målvakter</h2>
            <PrintGoalkeeperTable players={stats.players} totals={goalkeeperTotals!} />
          </section>
          <section>
            <h2 className="text-lg font-semibold mb-2">Skudd etter posisjon</h2>
            <PrintPositionTable positions={stats.positions} />
          </section>
        </div>
      )}
    </div>
  )
}
