// Henter kamper fra banedagboken på handball.no og legger dem inn som
// blokkerte tider i hallene. Kjøres daglig av Vercel Cron (se vercel.json).
import { prisma } from '@/lib/prisma'
import { osloDate } from '@/lib/date-utils'
import { ROOMS, isDayAllowed } from '@/lib/rooms'

const API_URL = 'https://www.handball.no/api/AjaxData/SortedMatchesReservationsForVenue'
const VENUE_UNIT_ID = 4248 // Kragerøhallen
const DAYS_AHEAD = 365
const CHUNK_DAYS = 90
const MINUTES_BEFORE = 60 // hallen sperres 1 time før kampstart
const MINUTES_AFTER = 15 // … og til 15 min etter kampslutt
const DEFAULT_MATCH_MINUTES = 65

export const SYSTEM_USER_EMAIL = 'banedagbok@system.invalid'
const EXTERNAL_PREFIX = 'hbno:'

type HbMatch = {
  matchDate: string // "2026-11-11T00:00:00"
  time: string // "18:00"
  detailedTime?: string // "18:00-19:05"
  tournamentName?: string
  matchId: string
  placeName: string
  homeTeamName?: string
  awayTeamName?: string
  isReservation?: boolean
  resPurpose?: string | null
}

export type SyncResult = {
  fetched: number
  upserted: number
  removed: number
  skipped: number
  conflicts: { room: string; match: string; existing: string }[]
}

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setUTCDate(r.getUTCDate() + n)
  return r
}

function parseHm(s: string): [number, number] | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  return m ? [Number(m[1]), Number(m[2])] : null
}

async function fetchRange(fom: string, tom: string): Promise<HbMatch[]> {
  const url = `${API_URL}?fom=${fom}&tom=${tom}&ids=${VENUE_UNIT_ID}&width=1400`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (KragerohallenBooking)',
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`handball.no svarte ${res.status} for ${fom}–${tom}`)
  const data = await res.json()
  if (data.maxMatchesText) console.warn('[banedagbok] Maks antall kamper nådd:', data.maxMatchesText)
  return Array.isArray(data.matches) ? data.matches : []
}

export async function syncBanedagbok(): Promise<SyncResult> {
  const today = new Date()
  const from = dateStr(today)
  const until = dateStr(addDays(today, DAYS_AHEAD))

  // 1. Hent alle kamper (i biter for å holde svarene små)
  const matches: HbMatch[] = []
  for (let start = today; dateStr(start) <= until; start = addDays(start, CHUNK_DAYS + 1)) {
    const end = addDays(start, CHUNK_DAYS)
    matches.push(...(await fetchRange(dateStr(start), dateStr(end) > until ? until : dateStr(end))))
  }

  // 2. Sørg for at rommene og systembrukeren finnes
  for (const r of ROOMS) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, name: r.name, capacity: r.capacity, description: r.description },
    })
  }
  const systemUser = await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    update: {},
    create: {
      email: SYSTEM_USER_EMAIL,
      name: 'Banedagbok (handball.no)',
      phone: '',
      group: 'Kamp',
      password: null,
      status: 'APPROVED',
      bookingAccess: false,
    },
  })

  const result: SyncResult = { fetched: matches.length, upserted: 0, removed: 0, skipped: 0, conflicts: [] }
  const seen = new Set<string>()

  // 3. Legg inn / oppdater kampene
  for (const m of matches) {
    const room = ROOMS.find(r => r.banedagbokPlace && r.banedagbokPlace === m.placeName?.trim())
    const date = m.matchDate?.slice(0, 10)
    const [startStr, endStr] = (m.detailedTime || m.time || '').split('-')
    const st = parseHm(startStr ?? '')
    if (!room || !date || !st || !isDayAllowed(room, date)) {
      result.skipped++
      continue
    }

    const matchStart = osloDate(date, st[0], st[1])
    const et = endStr ? parseHm(endStr) : null
    const matchEnd = et ? osloDate(date, et[0], et[1]) : new Date(matchStart.getTime() + DEFAULT_MATCH_MINUTES * 60000)
    const startTime = new Date(matchStart.getTime() - MINUTES_BEFORE * 60000)
    const endTime = new Date(matchEnd.getTime() + MINUTES_AFTER * 60000)

    const externalId = `${EXTERNAL_PREFIX}${String(m.matchId).trim()}:${room.id}`
    seen.add(externalId)

    const title = m.isReservation
      ? `Reservasjon: ${m.resPurpose ?? ''}`.trim()
      : `${m.homeTeamName ?? '?'} – ${m.awayTeamName ?? '?'}`
    const notes = [title, m.tournamentName?.trim(), `Kamp ${m.detailedTime || m.time}`].filter(Boolean).join(' · ')

    const conflict = await prisma.booking.findFirst({
      where: {
        roomId: room.id,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        OR: [{ externalId: null }, { NOT: { externalId: { startsWith: EXTERNAL_PREFIX } } }],
      },
      include: { user: { select: { name: true } } },
    })
    if (conflict) {
      result.conflicts.push({
        room: room.name,
        match: `${date} ${m.detailedTime || m.time} ${title}`,
        existing: `${conflict.user.name}${conflict.notes ? ` (${conflict.notes})` : ''}`,
      })
    }

    await prisma.booking.upsert({
      where: { externalId },
      update: { roomId: room.id, startTime, endTime, notes },
      create: { externalId, roomId: room.id, userId: systemUser.id, startTime, endTime, notes, isBlocked: true },
    })
    result.upserted++
  }

  // 4. Fjern kamper som er flyttet eller strøket (bare fremtidige)
  const removed = await prisma.booking.deleteMany({
    where: {
      externalId: { startsWith: EXTERNAL_PREFIX, notIn: Array.from(seen) },
      startTime: { gte: osloDate(from, 0) },
    },
  })
  result.removed = removed.count

  return result
}
