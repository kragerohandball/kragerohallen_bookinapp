export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { hasKamperAccess } from '@/lib/access'

type PrimePlayer = {
  name: string
  number: number | null
  position: string | null
  function: string
  active: boolean
}

export async function POST(req: Request, { params }: { params: { teamId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }
  if (!hasKamperAccess(session.user)) return NextResponse.json({ error: 'Ingen tilgang til kamper' }, { status: 403 })

  const team = await prisma.team.findUnique({ where: { id: params.teamId } })
  if (!team) return NextResponse.json({ error: 'Fant ikke lag' }, { status: 404 })

  const { url } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL er påkrevd' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Ugyldig URL' }, { status: 400 })
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.topphandball.no')) {
    return NextResponse.json({ error: 'URL må være en offentlig ...topphandball.no-side' }, { status: 400 })
  }

  let html: string
  try {
    const res = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KragerohallenBooking/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Kunne ikke hente siden (status ${res.status})` }, { status: 502 })
    }
    html = await res.text()
  } catch {
    return NextResponse.json({ error: 'Kunne ikke hente siden' }, { status: 502 })
  }

  // Spillerstallen lastes inn av siden via JavaScript fra Topphåndballs bakenforliggende
  // datakilde (prime.webcore.no). Vi henter derfor lag-ID-en fra sidens HTML og spør
  // den kilden direkte i stedet for å tolke gjengitt HTML.
  const teamIdMatch = html.match(/teams\/(\d+)\/players/)
  if (!teamIdMatch) {
    return NextResponse.json({ error: 'Fant ikke lag-data på siden. Sjekk at URL-en er riktig.' }, { status: 422 })
  }
  const primeTeamId = teamIdMatch[1]

  let players: PrimePlayer[]
  try {
    const res = await fetch(`https://prime.webcore.no/teams/${primeTeamId}/players?usenif&size=500`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KragerohallenBooking/1.0)', Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Kunne ikke hente spillerdata (status ${res.status})` }, { status: 502 })
    }
    players = await res.json()
  } catch {
    return NextResponse.json({ error: 'Kunne ikke hente spillerdata' }, { status: 502 })
  }

  const activePlayers = players.filter(p => p.function === 'Player' && p.active && p.name)

  if (activePlayers.length === 0) {
    return NextResponse.json({ error: 'Fant ingen aktive spillere på siden.' }, { status: 422 })
  }

  let added = 0
  let updated = 0
  let unchanged = 0

  for (const p of activePlayers) {
    const number = p.number != null && p.number > 0 ? p.number : null
    const isGoalkeeper = p.position === 'Målvakt'
    const existing = number != null
      ? await prisma.player.findFirst({ where: { teamId: params.teamId, number } })
      : await prisma.player.findFirst({ where: { teamId: params.teamId, number: null, name: p.name } })

    if (existing) {
      if (existing.name !== p.name || existing.position !== p.position || existing.isGoalkeeper !== isGoalkeeper) {
        await prisma.player.update({
          where: { id: existing.id },
          data: { name: p.name, position: p.position, isGoalkeeper },
        })
        updated++
      } else {
        unchanged++
      }
    } else {
      await prisma.player.create({
        data: { teamId: params.teamId, name: p.name, number, position: p.position, isGoalkeeper },
      })
      added++
    }
  }

  await prisma.team.update({ where: { id: params.teamId }, data: { rosterImportUrl: parsed.toString() } })

  return NextResponse.json({ added, updated, unchanged })
}
