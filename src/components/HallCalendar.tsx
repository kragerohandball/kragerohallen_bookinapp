'use client'
import { RoomConfig, isDayAllowed, roomHours } from '@/lib/rooms'

export type CalBooking = {
  id: string
  startTime: string
  endTime: string
  notes?: string | null
  isBlocked: boolean
  externalId?: string | null
  user?: { name: string; group?: string }
}

export function isMatchBooking(b: CalBooking) {
  return !!b.externalId?.startsWith('hbno:')
}

export function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function bookingsOnDay<T extends CalBooking>(bookings: T[], date: string): T[] {
  const s = new Date(`${date}T00:00:00`).getTime()
  const e = s + 24 * 3600 * 1000
  return bookings.filter(b => new Date(b.startTime).getTime() < e && new Date(b.endTime).getTime() > s)
}

/** Måned som vises: YYYY-MM-01 → [første dag, siste dag] som datostrenger. */
export function monthRange(monthStart: string): [string, string] {
  const d = new Date(`${monthStart}T12:00:00`)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12)
  return [localDateStr(new Date(d.getFullYear(), d.getMonth(), 1, 12)), localDateStr(last)]
}

export function matchTime(b: CalBooking) {
  return /Kamp (\d{1,2}:\d{2})/.exec(b.notes ?? '')?.[1]
    ?? new Date(b.startTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
}

const TILFELDIG_UTLEIE_URL =
  'https://www.kragero.kommune.no/tjenester/kultur-idrett-og-fritid/idrett-og-friluftsliv/idrett/leie-av-lokaler-og-idrettsanlegg/tilfeldig-utleie/oversikt-over-utleie-idrettshallen/'

/** Gul boks med lenke til kommunens oversikt over tilfeldig utleie av hallen. */
export function TilfeldigUtleieLink() {
  return (
    <a
      href={TILFELDIG_UTLEIE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block mb-4 rounded-xl px-5 py-4 font-bold text-black underline underline-offset-2 hover:opacity-90"
      style={{ backgroundColor: '#FFD400' }}
    >
      Husk å sjekke tilfeldig utleie også HER ↗
    </a>
  )
}

const WEEKDAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']

export default function HallCalendar({
  room, month, onMonthChange, bookings, selectedDate, onSelectDate, primaryColor, loading,
}: {
  room: RoomConfig
  month: string // YYYY-MM-01
  onMonthChange: (m: string) => void
  bookings: CalBooking[]
  selectedDate: string | null
  onSelectDate: (d: string) => void
  primaryColor: string
  loading?: boolean
}) {
  const today = localDateStr(new Date())
  const m = new Date(`${month}T12:00:00`)
  const year = m.getFullYear()
  const mon = m.getMonth()
  const daysInMonth = new Date(year, mon + 1, 0).getDate()
  const offset = (new Date(year, mon, 1).getDay() + 6) % 7 // mandag først
  const thisMonth = localDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12))
  const maxMonth = (() => { const d = new Date(); return localDateStr(new Date(d.getFullYear() + 1, d.getMonth(), 1, 12)) })()

  function shift(n: number) {
    onMonthChange(localDateStr(new Date(year, mon + n, 1, 12)))
  }

  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => localDateStr(new Date(year, mon, i + 1, 12))),
  ]
  while (cells.length % 7) cells.push(null)

  return (
    <div className="bg-[#2a2a2a] rounded-xl border border-gray-700 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => shift(-1)}
          disabled={month <= thisMonth}
          className="px-3 py-1 rounded-lg text-white hover:bg-gray-700 disabled:opacity-30"
          aria-label="Forrige måned"
        >‹</button>
        <div className="font-semibold text-white capitalize">
          {m.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })}
          {loading && <span className="ml-2 text-xs text-gray-500">laster…</span>}
        </div>
        <button
          onClick={() => shift(1)}
          disabled={month >= maxMonth}
          className="px-3 py-1 rounded-lg text-white hover:bg-gray-700 disabled:opacity-30"
          aria-label="Neste måned"
        >›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500 mb-1">
        {WEEKDAYS.map(w => <div key={w}>{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const allowed = isDayAllowed(room, d)
          const past = d < today
          const enabled = allowed && !past
          const onDay = bookingsOnDay(bookings, d)
          const matches = onDay.filter(isMatchBooking)
          const others = onDay.filter(b => !isMatchBooking(b))
          const hours = roomHours(room, d)
          const busyHours = hours.filter(h => {
            const s = new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime()
            return onDay.some(b => new Date(b.startTime).getTime() < s + 3600000 && new Date(b.endTime).getTime() > s)
          }).length
          const full = busyHours >= hours.length
          const sel = d === selectedDate
          return (
            <button
              key={d}
              disabled={!enabled}
              onClick={() => onSelectDate(d)}
              className={`min-h-[56px] sm:min-h-[68px] rounded-lg border p-1 text-left flex flex-col transition-all ${
                enabled ? 'hover:border-gray-400 cursor-pointer' : 'cursor-default opacity-35'
              }`}
              style={sel
                ? { borderColor: primaryColor, backgroundColor: `${primaryColor}22` }
                : { borderColor: enabled ? '#4b5563' : '#2f2f2f', backgroundColor: enabled ? '#1f1f1f' : 'transparent' }}
              title={enabled ? undefined : past ? 'Passert' : 'Kan ikke bookes denne dagen'}
            >
              <span className={`text-xs font-semibold ${d === today ? 'underline' : ''}`} style={{ color: sel ? primaryColor : 'white' }}>
                {Number(d.slice(8))}
              </span>
              {enabled && (
                <span className="mt-auto space-y-0.5 text-[10px] leading-tight">
                  {matches.length > 0 && (
                    <span className="block text-blue-300 truncate">
                      <span className="hidden sm:inline">⚽ </span>
                      {matches.length === 1
                        ? matchTime(matches[0])
                        : <>{matches.length}<span className="hidden sm:inline"> kamper</span><span className="sm:hidden"> k.</span></>}
                    </span>
                  )}
                  {others.length > 0 && <span className="block text-red-400">● {others.length} booket</span>}
                  {onDay.length === 0 && <span className="block text-green-400">Ledig</span>}
                  {full && <span className="block text-gray-400">Fullt</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex gap-4 mt-3 text-[11px] text-gray-500 flex-wrap">
        <span><span className="text-blue-300">Blå tid</span> = kamp</span>
        <span><span className="text-red-400">●</span> Booket</span>
        <span><span className="text-green-400">Ledig</span> = ingen bookinger</span>
        <span className="opacity-60">Grå dager kan ikke bookes</span>
      </div>
    </div>
  )
}
