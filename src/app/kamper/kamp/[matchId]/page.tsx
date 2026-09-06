'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import type { GoalZone, MatchEventType, MatchStatus, Punishment, ShotPosition, TechnicalFaultType } from '@prisma/client'
import SiteHeader from '@/components/SiteHeader'
import { useSiteSettings } from '@/components/SiteSettingsContext'
import GoalZoneGrid from '@/components/GoalZoneGrid'
import CourtPositionPicker from '@/components/CourtPositionPicker'
import PlayerPicker, { type PlayerLite } from '@/components/PlayerPicker'
import { computeStats, computePositionStats, computeZoneStats, computeOutfieldTotals, computeGoalkeeperTotals } from '@/lib/kamper-stats'
import CourtPositionChart from '@/components/CourtPositionChart'
import GoalZoneHeatmap from '@/components/GoalZoneHeatmap'
import { PrintOutfieldTable, PrintGoalkeeperTable, PrintPositionTable } from '@/components/print/PrintTables'
import {
  EVENT_TYPE_LABELS, FAULT_TYPE_LABELS, FAULT_TYPE_ORDER,
  MATCH_STATUS_LABELS, PUNISHMENT_LABELS, PUNISHMENT_ORDER, SHOT_POSITION_LABELS, ZONE_LABELS,
} from '@/lib/kamper-constants'

type RosterPlayer = PlayerLite & { active: boolean; position: string | null }
type EventPlayerRef = { id: string; name: string; number: number | null }
type MatchEventRow = {
  id: string
  type: MatchEventType
  period: number
  minute: number | null
  playerId: string | null
  assistPlayerId: string | null
  zone: GoalZone | null
  shotPosition: ShotPosition | null
  faultType: TechnicalFaultType | null
  punishment: Punishment | null
  player: EventPlayerRef | null
  assistPlayer: EventPlayerRef | null
}
type MatchDetail = {
  id: string
  opponentName: string
  season: string
  date: string
  status: MatchStatus
  period: number
  clockRunning: boolean
  clockStartedAt: string | null
  accumulatedSeconds: number
  team: { id: string; name: string; players: RosterPlayer[] }
  squad: PlayerLite[]
  events: MatchEventRow[]
}

type Flow = {
  type: MatchEventType
  step: string
  playerId?: string
  assistPlayerId?: string | null
  zone?: GoalZone
  shotPosition?: ShotPosition
  faultType?: TechnicalFaultType
  punishment?: Punishment
}

type ActionCategory = 'skudd' | 'feil' | 'forsvar' | 'keeper'

const CATEGORY_STYLES: Record<ActionCategory, string> = {
  skudd: 'border-sky-700 bg-sky-950/40',
  feil: 'border-red-800 bg-red-950/40',
  forsvar: 'border-emerald-700 bg-emerald-950/40',
  keeper: 'border-purple-700 bg-purple-950/40',
}

function pad(n: number) { return n.toString().padStart(2, '0') }

function describeEvent(e: MatchEventRow): string {
  let text = EVENT_TYPE_LABELS[e.type]
  if (e.player) text += ` – ${e.player.name}${e.player.number != null ? ` (#${e.player.number})` : ''}`
  if (e.type === 'GOAL' && e.assistPlayer) text += `, assist ${e.assistPlayer.name}`
  if (e.type === 'TECHNICAL_FAULT' && e.faultType) text += ` (${FAULT_TYPE_LABELS[e.faultType]})`
  if (e.type === 'DEFENSIVE_FOUL' && e.punishment && e.punishment !== 'NONE') text += ` – ${PUNISHMENT_LABELS[e.punishment]}`
  if (e.shotPosition) text += ` · ${SHOT_POSITION_LABELS[e.shotPosition]}`
  if (e.zone) text += ` · ${ZONE_LABELS[e.zone]}`
  return text
}

export default function MatchConsolePage() {
  const params = useParams<{ matchId: string }>()
  const { primaryColor } = useSiteSettings()

  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [flow, setFlow] = useState<Flow | null>(null)
  const [tick, setTick] = useState(0)

  const [showSquadPicker, setShowSquadPicker] = useState(false)
  const [squadSelection, setSquadSelection] = useState<Set<string>>(new Set())
  const [savingSquad, setSavingSquad] = useState(false)
  const [quickAdd, setQuickAdd] = useState({ name: '', number: '', isGoalkeeper: false })

  useEffect(() => { fetchMatch() }, [params.matchId])

  useEffect(() => {
    if (!match?.clockRunning) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [match?.clockRunning])

  useEffect(() => {
    if (match && match.status === 'SCHEDULED' && match.squad.length === 0) {
      setSquadSelection(new Set())
      setShowSquadPicker(true)
    }
  }, [match?.id, match?.status])

  function flash(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  async function fetchMatch() {
    setLoading(true)
    const res = await fetch(`/api/kamper/matches/${params.matchId}`)
    if (res.ok) setMatch(await res.json())
    setLoading(false)
  }

  async function handleClockAction(action: string) {
    const res = await fetch(`/api/kamper/matches/${params.matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    if (res.ok) setMatch(m => m ? { ...m, ...data } : m)
    else flash('error', data.error)
  }

  async function submitEvent(f: Flow) {
    const res = await fetch(`/api/kamper/matches/${params.matchId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: f.type,
        playerId: f.playerId ?? null,
        assistPlayerId: f.assistPlayerId ?? null,
        zone: f.zone ?? null,
        shotPosition: f.shotPosition ?? null,
        faultType: f.faultType ?? null,
        punishment: f.punishment ?? null,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setMatch(m => m ? { ...m, events: [data, ...m.events] } : m)
      setFlow(null)
    } else {
      flash('error', data.error)
    }
  }

  function advance(patch: Partial<Flow>) {
    if (!flow) return
    const next: Flow = { ...flow, ...patch }
    switch (next.type) {
      case 'GOAL':
        if (next.step === 'player') { setFlow({ ...next, step: 'assist' }); return }
        if (next.step === 'assist') { setFlow({ ...next, step: 'shotPosition' }); return }
        if (next.step === 'shotPosition') { setFlow({ ...next, step: 'zone' }); return }
        submitEvent(next)
        return
      case 'SHOT_SAVED':
        if (next.step === 'player') { setFlow({ ...next, step: 'shotPosition' }); return }
        if (next.step === 'shotPosition') { setFlow({ ...next, step: 'zone' }); return }
        submitEvent(next)
        return
      case 'SHOT_MISSED':
        if (next.step === 'player') { setFlow({ ...next, step: 'shotPosition' }); return }
        submitEvent(next)
        return
      case 'TECHNICAL_FAULT':
        if (next.step === 'faultType') {
          if (next.faultType === 'PASSIVE') { submitEvent(next); return }
          setFlow({ ...next, step: 'player' })
          return
        }
        submitEvent(next)
        return
      case 'DEFENSIVE_FOUL':
        if (next.step === 'player') { setFlow({ ...next, step: 'punishment' }); return }
        submitEvent(next)
        return
      case 'SAVE':
      case 'GOAL_CONCEDED':
        if (next.step === 'keeper') { setFlow({ ...next, step: 'zone' }); return }
        submitEvent(next)
        return
      case 'STEAL':
      case 'FREE_THROW_WON':
        submitEvent(next)
        return
    }
  }

  async function handleUndo(eventId: string) {
    if (!confirm('Angre denne hendelsen?')) return
    const res = await fetch(`/api/kamper/matches/${params.matchId}/events/${eventId}`, { method: 'DELETE' })
    if (res.ok) setMatch(m => m ? { ...m, events: m.events.filter(e => e.id !== eventId) } : m)
  }

  function openSquadPicker() {
    if (!match) return
    setSquadSelection(new Set(match.squad.map(p => p.id)))
    setShowSquadPicker(true)
  }

  async function handleSaveSquad() {
    setSavingSquad(true)
    const res = await fetch(`/api/kamper/matches/${params.matchId}/squad`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerIds: Array.from(squadSelection) }),
    })
    const data = await res.json()
    if (res.ok) {
      setMatch(m => m ? { ...m, squad: data.squad } : m)
      setShowSquadPicker(false)
    } else {
      flash('error', data.error)
    }
    setSavingSquad(false)
  }

  async function handleQuickAddPlayer() {
    if (!match || !quickAdd.name.trim()) return
    const res = await fetch(`/api/kamper/teams/${match.team.id}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quickAdd),
    })
    const data = await res.json()
    if (res.ok) {
      setMatch(m => m ? { ...m, team: { ...m.team, players: [...m.team.players, { ...data, active: true }] } } : m)
      setSquadSelection(s => { const next = new Set(s); next.add(data.id); return next })
      setQuickAdd({ name: '', number: '', isGoalkeeper: false })
    } else {
      flash('error', data.error)
    }
  }

  const rosterForPicking: PlayerLite[] = useMemo(() => {
    if (!match) return []
    return match.squad.length > 0 ? match.squad : match.team.players.filter(p => p.active)
  }, [match])

  const stats = useMemo(() => {
    if (!match) return null
    return computeStats(match.events, match.team.players)
  }, [match])

  const positionStats = useMemo(() => {
    if (!match) return null
    return computePositionStats(match.events).filter(p => p.shots > 0)
  }, [match])

  const zoneStats = useMemo(() => {
    if (!match) return null
    return computeZoneStats(match.events)
  }, [match])

  const outfieldTotals = useMemo(() => (stats ? computeOutfieldTotals(stats.players) : null), [stats])
  const goalkeeperTotals = useMemo(() => (stats ? computeGoalkeeperTotals(stats.players) : null), [stats])

  function elapsedSeconds(): number {
    if (!match) return 0
    if (match.clockRunning && match.clockStartedAt) {
      return match.accumulatedSeconds + Math.floor((Date.now() - new Date(match.clockStartedAt).getTime()) / 1000)
    }
    return match.accumulatedSeconds
  }

  if (loading || !match) {
    return (
      <div className="min-h-screen bg-[#1a1a1a]">
        <SiteHeader backHref="/kamper" backLabel="← Kamper" title="Laster..." />
      </div>
    )
  }

  const isFinished = match.status === 'FINISHED'
  const isLive = match.status === 'LIVE'
  const isHalftime = match.status === 'HALFTIME'
  const isScheduled = match.status === 'SCHEDULED'
  const secs = elapsedSeconds()
  const clockText = `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`

  const actionButtons: { type: MatchEventType; label: string; category: ActionCategory }[] = [
    { type: 'GOAL', label: 'Mål', category: 'skudd' },
    { type: 'SHOT_SAVED', label: 'Skudd reddet', category: 'skudd' },
    { type: 'SHOT_MISSED', label: 'Skudd utenfor', category: 'skudd' },
    { type: 'TECHNICAL_FAULT', label: 'Teknisk feil', category: 'feil' },
    { type: 'DEFENSIVE_FOUL', label: 'Forsvarsfeil/kort', category: 'feil' },
    { type: 'STEAL', label: 'Snappet ball', category: 'forsvar' },
    { type: 'FREE_THROW_WON', label: 'Vunnet frikast', category: 'forsvar' },
    { type: 'SAVE', label: 'Redning', category: 'keeper' },
    { type: 'GOAL_CONCEDED', label: 'Baklengs mål', category: 'keeper' },
  ]

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <SiteHeader backHref={`/kamper/${match.team.id}`} backLabel="← Lag" title={`vs ${match.opponentName}`} />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 print:hidden">
        {msg && (
          <div className={`text-sm px-4 py-3 rounded-lg border ${
            msg.type === 'success' ? 'bg-green-900/40 text-green-300 border-green-700' : 'bg-red-900/40 text-red-300 border-red-700'
          }`}>{msg.text}</div>
        )}

        {/* Header: score + klokke */}
        <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-5 text-center space-y-2">
          <div className="text-xs uppercase tracking-widest text-gray-500">{MATCH_STATUS_LABELS[match.status]} · {match.period}. omgang</div>
          <div className="text-3xl font-bold text-white">
            {match.team.name} <span style={{ color: primaryColor }}>{stats?.ourScore ?? 0}</span>
            {' – '}
            <span style={{ color: primaryColor }}>{stats?.opponentScore ?? 0}</span> {match.opponentName}
          </div>
          {(isLive || isHalftime) && <div className="text-2xl font-mono text-gray-300">{clockText}</div>}

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {isScheduled && (
              <button onClick={() => handleClockAction('start')} className="text-black font-bold text-sm px-4 py-2 rounded-lg" style={{ backgroundColor: primaryColor }}>
                Start kamp
              </button>
            )}
            {isLive && (
              <>
                <button onClick={() => handleClockAction(match.clockRunning ? 'pause' : 'resume')} className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
                  {match.clockRunning ? 'Pause' : 'Fortsett'}
                </button>
                <button onClick={() => handleClockAction('halftime')} className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
                  Pause til pause
                </button>
                <button onClick={() => handleClockAction('finish')} className="bg-red-800 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                  Avslutt kamp
                </button>
              </>
            )}
            {isHalftime && (
              <>
                <button onClick={() => handleClockAction('next-period')} className="text-black font-bold text-sm px-4 py-2 rounded-lg" style={{ backgroundColor: primaryColor }}>
                  Start neste omgang
                </button>
                <button onClick={() => handleClockAction('finish')} className="bg-red-800 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                  Avslutt kamp
                </button>
              </>
            )}
            {isFinished && (
              <button onClick={() => handleClockAction('reopen')} className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
                Gjenåpne kamp
              </button>
            )}
            {!isFinished && (
              <button onClick={openSquadPicker} className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
                {match.squad.length > 0 ? 'Rediger tropp' : 'Velg kamptropp'} ({match.squad.length})
              </button>
            )}
            <button onClick={() => setShowStats(s => !s)} className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
              {showStats || isFinished ? 'Skjul statistikk' : 'Vis statistikk'}
            </button>
            <button onClick={() => window.print()} className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Skriv ut rapport
            </button>
          </div>
        </div>

        {/* Handlingsknapper */}
        {isLive && !flow && (
          <div className="grid grid-cols-2 gap-2">
            {actionButtons.map(b => (
              <button
                key={b.type}
                onClick={() => setFlow({ type: b.type, step: b.type === 'SAVE' || b.type === 'GOAL_CONCEDED' ? 'keeper' : b.type === 'TECHNICAL_FAULT' ? 'faultType' : 'player' })}
                className={`rounded-xl border-2 text-white font-medium text-base py-4 active:border-white ${CATEGORY_STYLES[b.category]}`}
                style={{ minHeight: 64 }}
              >
                {b.label}
              </button>
            ))}
          </div>
        )}

        {/* Statistikk-panel */}
        {(showStats || isFinished) && stats && (
          <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 overflow-hidden">
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
                    <th className="text-right px-3 py-2 font-medium text-gray-400 hidden sm:table-cell">Feil</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-400 hidden sm:table-cell">Snapp/Frikast</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {stats.players.filter(p => !p.isGoalkeeper).filter(p => p.goals || p.assists || p.shotsTotal || p.technicalFaults || p.defensiveFouls || p.steals || p.freeThrowsWon).map(p => (
                    <tr key={p.playerId}>
                      <td className="px-3 py-2 font-bold" style={{ color: primaryColor }}>{p.number ?? '–'}</td>
                      <td className="px-3 py-2 text-white">{p.name}</td>
                      <td className="px-3 py-2 text-right text-white">{p.goals}</td>
                      <td className="px-3 py-2 text-right text-white">{p.assists}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{p.shootingPct != null ? `${p.shootingPct}%` : '–'}</td>
                      <td className="px-3 py-2 text-right text-gray-400 hidden sm:table-cell">{p.technicalFaults + p.defensiveFouls}</td>
                      <td className="px-3 py-2 text-right text-gray-400 hidden sm:table-cell">{p.steals}/{p.freeThrowsWon}</td>
                    </tr>
                  ))}
                  {outfieldTotals && (
                    <tr className="border-t-2 border-gray-600 font-semibold">
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-white">Totalt</td>
                      <td className="px-3 py-2 text-right text-white">{outfieldTotals.goals}</td>
                      <td className="px-3 py-2 text-right text-white">{outfieldTotals.assists}</td>
                      <td className="px-3 py-2 text-right text-gray-300">{outfieldTotals.shootingPct != null ? `${outfieldTotals.shootingPct}%` : '–'}</td>
                      <td className="px-3 py-2 text-right text-gray-300 hidden sm:table-cell">{outfieldTotals.technicalFaults + outfieldTotals.defensiveFouls}</td>
                      <td className="px-3 py-2 text-right text-gray-300 hidden sm:table-cell">{outfieldTotals.steals}/{outfieldTotals.freeThrowsWon}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(showStats || isFinished) && stats && stats.players.some(p => p.isGoalkeeper && (p.saves || p.goalsConceded)) && (
          <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 overflow-hidden">
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
                  {stats.players.filter(p => p.isGoalkeeper && (p.saves || p.goalsConceded)).map(p => (
                    <tr key={p.playerId}>
                      <td className="px-3 py-2 font-bold" style={{ color: primaryColor }}>{p.number ?? '–'}</td>
                      <td className="px-3 py-2 text-white">{p.name}</td>
                      <td className="px-3 py-2 text-right text-white">{p.saves}</td>
                      <td className="px-3 py-2 text-right text-white">{p.goalsConceded}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{p.savePct != null ? `${p.savePct}%` : '–'}</td>
                    </tr>
                  ))}
                  {goalkeeperTotals && (
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
          </div>
        )}

        {(showStats || isFinished) && zoneStats && (
          <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-4">
            <h3 className="font-semibold text-white mb-3">Skuddkart</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              <CourtPositionChart stats={positionStats ?? []} primaryColor={primaryColor} title="Hvor skuddene kommer fra" />
              <GoalZoneHeatmap stats={zoneStats} primaryColor={primaryColor} title="Hvor i målet det skytes" />
            </div>
          </div>
        )}

        {(showStats || isFinished) && positionStats && positionStats.length > 0 && (
          <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 overflow-hidden">
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
                  {positionStats.map(p => (
                    <tr key={p.position}>
                      <td className="px-3 py-2 text-white">{SHOT_POSITION_LABELS[p.position]}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{p.shots}</td>
                      <td className="px-3 py-2 text-right text-white">{p.goals}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{p.shootingPct != null ? `${p.shootingPct}%` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Siste hendelser */}
        <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-4 space-y-2">
          <h3 className="font-semibold text-white">Siste hendelser</h3>
          {match.events.length === 0 ? (
            <p className="text-sm text-gray-500">Ingen hendelser ennå</p>
          ) : (
            <ul className="space-y-1.5">
              {match.events.map(e => (
                <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-300">
                    <span className="text-gray-500">{e.minute != null ? `${e.minute}′` : ''} ({e.period}.)</span> {describeEvent(e)}
                  </span>
                  {!isFinished && (
                    <button onClick={() => handleUndo(e.id)} className="text-red-400 hover:text-red-300 text-xs shrink-0">Angre</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* Utskriftsvennlig rapport (kun synlig ved utskrift) */}
      {stats && (
        <div className="hidden print:block bg-white text-black p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{match.team.name} {stats.ourScore} – {stats.opponentScore} {match.opponentName}</h1>
            <p className="text-sm text-gray-700">
              {new Date(match.date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })} · {match.season} · {MATCH_STATUS_LABELS[match.status]}
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
          {positionStats && positionStats.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-2">Skudd etter posisjon</h2>
              <PrintPositionTable positions={positionStats} />
            </section>
          )}
          <section>
            <h2 className="text-lg font-semibold mb-2">Hendelser</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left border border-gray-400 px-2 py-1 bg-gray-100">Tid</th>
                  <th className="text-left border border-gray-400 px-2 py-1 bg-gray-100">Hendelse</th>
                </tr>
              </thead>
              <tbody>
                {[...match.events].reverse().map(e => (
                  <tr key={e.id}>
                    <td className="border border-gray-400 px-2 py-1 whitespace-nowrap">{e.minute != null ? `${e.minute}′ (${e.period}.)` : `(${e.period}.)`}</td>
                    <td className="border border-gray-400 px-2 py-1">{describeEvent(e)}</td>
                  </tr>
                ))}
                {match.events.length === 0 && <tr><td className="border border-gray-400 px-2 py-1" colSpan={2}>Ingen hendelser</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* Event-flow overlay */}
      {flow && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 print:hidden">
          <div className="bg-[#2a2a2a] rounded-2xl border border-gray-700 p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">{EVENT_TYPE_LABELS[flow.type]}</h3>
              <button onClick={() => setFlow(null)} className="text-gray-400 hover:text-white text-sm">Avbryt</button>
            </div>

            {flow.step === 'player' && (
              <>
                <p className="text-sm text-gray-400">Velg spiller</p>
                <PlayerPicker players={rosterForPicking} primaryColor={primaryColor} onSelect={playerId => advance({ playerId })} />
              </>
            )}

            {flow.step === 'assist' && (
              <>
                <p className="text-sm text-gray-400">Assist? (valgfritt)</p>
                <button onClick={() => advance({ assistPlayerId: null })} className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 rounded-lg">
                  Ingen assist
                </button>
                <PlayerPicker players={rosterForPicking} excludePlayerId={flow.playerId} primaryColor={primaryColor} onSelect={assistPlayerId => advance({ assistPlayerId })} />
              </>
            )}

            {flow.step === 'keeper' && (
              <>
                <p className="text-sm text-gray-400">Velg målvakt</p>
                <PlayerPicker
                  players={rosterForPicking.filter(p => p.isGoalkeeper).length ? rosterForPicking.filter(p => p.isGoalkeeper) : rosterForPicking}
                  primaryColor={primaryColor}
                  onSelect={playerId => advance({ playerId })}
                />
              </>
            )}

            {flow.step === 'shotPosition' && (
              <CourtPositionPicker primaryColor={primaryColor} onSelect={shotPosition => advance({ shotPosition })} />
            )}

            {flow.step === 'zone' && (
              <GoalZoneGrid
                primaryColor={primaryColor}
                label={flow.type === 'GOAL' ? 'Hvor gikk skuddet i mål?' : 'Hvor ble skuddet reddet?'}
                onSelect={zone => advance({ zone })}
              />
            )}

            {flow.step === 'faultType' && (
              <div className="grid grid-cols-2 gap-2">
                {FAULT_TYPE_ORDER.map(ft => (
                  <button key={ft} onClick={() => advance({ faultType: ft })} className="rounded-xl border border-gray-600 bg-[#1a1a1a] text-white py-4" style={{ minHeight: 56 }}>
                    {FAULT_TYPE_LABELS[ft]}
                  </button>
                ))}
              </div>
            )}

            {flow.step === 'punishment' && (
              <div className="grid grid-cols-2 gap-2">
                {PUNISHMENT_ORDER.map(p => (
                  <button key={p} onClick={() => advance({ punishment: p })} className="rounded-xl border border-gray-600 bg-[#1a1a1a] text-white py-4" style={{ minHeight: 56 }}>
                    {PUNISHMENT_LABELS[p]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kamptropp-overlay */}
      {showSquadPicker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 print:hidden">
          <div className="bg-[#2a2a2a] rounded-2xl border border-gray-700 p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Velg kamptropp ({squadSelection.size} valgt)</h3>
              {match.squad.length > 0 && (
                <button onClick={() => setShowSquadPicker(false)} className="text-gray-400 hover:text-white text-sm">Lukk</button>
              )}
            </div>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {match.team.players.filter(p => p.active).map(p => (
                <label key={p.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={squadSelection.has(p.id)}
                    onChange={e => setSquadSelection(s => {
                      const next = new Set(s)
                      if (e.target.checked) next.add(p.id); else next.delete(p.id)
                      return next
                    })}
                  />
                  <span className="font-bold w-6" style={{ color: primaryColor }}>{p.number ?? '–'}</span>
                  <span className="text-white text-sm">{p.name}</span>
                  {p.isGoalkeeper && <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">MV</span>}
                </label>
              ))}
            </div>

            <div className="border-t border-gray-700 pt-3 space-y-2">
              <p className="text-xs text-gray-500">Legg til ny spiller</p>
              <div className="flex flex-wrap gap-2">
                <input type="text" placeholder="Navn" value={quickAdd.name} onChange={e => setQuickAdd(q => ({ ...q, name: e.target.value }))}
                  className="flex-1 min-w-[100px] bg-[#1a1a1a] border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm" />
                <input type="number" placeholder="Nr" value={quickAdd.number} onChange={e => setQuickAdd(q => ({ ...q, number: e.target.value }))}
                  className="w-16 bg-[#1a1a1a] border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm" />
                <button onClick={handleQuickAddPlayer} disabled={!quickAdd.name.trim()} className="text-black font-bold text-sm px-3 py-1.5 rounded-lg disabled:opacity-40" style={{ backgroundColor: primaryColor }}>
                  Legg til
                </button>
              </div>
            </div>

            <button onClick={handleSaveSquad} disabled={savingSquad} className="w-full text-black font-bold text-sm py-2.5 rounded-lg disabled:opacity-40" style={{ backgroundColor: primaryColor }}>
              {savingSquad ? 'Lagrer...' : 'Lagre tropp'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
