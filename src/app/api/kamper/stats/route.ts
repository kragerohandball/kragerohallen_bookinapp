export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { computeStats, computePositionStats, computeZoneStats, type StatEvent } from '@/lib/kamper-stats'
import { hasKamperAccess } from '@/lib/access'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (!hasKamperAccess(session.user)) return NextResponse.json({ error: 'Ingen tilgang til kamper' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('teamId')
  const season = searchParams.get('season')
  if (!teamId || !season) {
    return NextResponse.json({ error: 'teamId og season er påkrevd' }, { status: 400 })
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) return NextResponse.json({ error: 'Fant ikke lag' }, { status: 404 })

  const players = await prisma.player.findMany({ where: { teamId, active: true }, orderBy: [{ number: 'asc' }] })

  const matches = await prisma.match.findMany({
    where: { teamId, season, status: { in: ['LIVE', 'HALFTIME', 'FINISHED'] } },
    include: { events: true },
    orderBy: { date: 'asc' },
  })

  let wins = 0
  let draws = 0
  let losses = 0
  let goalsFor = 0
  let goalsAgainst = 0
  const allEvents: StatEvent[] = []

  for (const m of matches) {
    let mFor = 0
    let mAgainst = 0
    for (const e of m.events) {
      if (e.type === 'GOAL') mFor++
      if (e.type === 'GOAL_CONCEDED') mAgainst++
      allEvents.push(e)
    }
    goalsFor += mFor
    goalsAgainst += mAgainst
    if (m.status === 'FINISHED') {
      if (mFor > mAgainst) wins++
      else if (mFor < mAgainst) losses++
      else draws++
    }
  }

  const stats = computeStats(allEvents, players)
  const positionStats = computePositionStats(allEvents)
  const zoneStats = computeZoneStats(allEvents)

  return NextResponse.json({
    team,
    matchesPlayed: matches.length,
    matchesFinished: matches.filter(m => m.status === 'FINISHED').length,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    players: stats.players,
    positions: positionStats,
    zones: zoneStats,
  })
}
