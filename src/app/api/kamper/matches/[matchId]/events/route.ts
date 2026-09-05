export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { GoalZone, MatchEventType, Punishment, ShotPosition, TechnicalFaultType } from '@prisma/client'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { currentMinute } from '@/lib/match-clock'
import { hasKamperAccess } from '@/lib/access'

const EVENT_TYPES: MatchEventType[] = [
  'GOAL', 'SHOT_SAVED', 'SHOT_MISSED', 'TECHNICAL_FAULT', 'DEFENSIVE_FOUL', 'GOAL_CONCEDED', 'SAVE',
]
const ZONES: GoalZone[] = ['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR']
const SHOT_POSITIONS: ShotPosition[] = [
  'LEFT_WING', 'LEFT_BACK', 'CENTER_BACK', 'RIGHT_BACK', 'RIGHT_WING', 'PIVOT', 'SEVEN_METER', 'FAST_BREAK',
]
const FAULT_TYPES: TechnicalFaultType[] = ['STEPS', 'CHARGING', 'DOUBLE_DRIBBLE', 'PASSIVE', 'OTHER']
const PUNISHMENTS: Punishment[] = ['NONE', 'YELLOW', 'TWO_MIN', 'RED']

export async function POST(req: Request, { params }: { params: { matchId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }
  if (!hasKamperAccess(session.user)) return NextResponse.json({ error: 'Ingen tilgang til kamper' }, { status: 403 })

  const match = await prisma.match.findUnique({ where: { id: params.matchId } })
  if (!match) return NextResponse.json({ error: 'Fant ikke kamp' }, { status: 404 })
  if (match.status !== 'LIVE') {
    return NextResponse.json({ error: 'Kampen er ikke i gang' }, { status: 409 })
  }

  const body = await req.json()
  const { type, playerId, assistPlayerId, zone, faultType, punishment, shotPosition } = body as {
    type: MatchEventType
    playerId?: string | null
    assistPlayerId?: string | null
    zone?: GoalZone | null
    faultType?: TechnicalFaultType | null
    punishment?: Punishment | null
    shotPosition?: ShotPosition | null
  }

  if (!EVENT_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Ukjent hendelsestype' }, { status: 400 })
  }

  const playerIds = [playerId, assistPlayerId].filter((id): id is string => !!id)
  if (playerIds.length) {
    const validCount = await prisma.player.count({ where: { id: { in: playerIds }, teamId: match.teamId } })
    if (validCount !== new Set(playerIds).size) {
      return NextResponse.json({ error: 'Spilleren tilhører ikke laget' }, { status: 400 })
    }
  }

  const data: {
    matchId: string
    type: MatchEventType
    period: number
    minute: number
    playerId: string | null
    assistPlayerId: string | null
    zone: GoalZone | null
    shotPosition: ShotPosition | null
    faultType: TechnicalFaultType | null
    punishment: Punishment | null
  } = {
    matchId: params.matchId,
    type,
    period: match.period,
    minute: currentMinute(match),
    playerId: playerId ?? null,
    assistPlayerId: null,
    zone: null,
    shotPosition: null,
    faultType: null,
    punishment: null,
  }

  switch (type) {
    case 'GOAL':
      if (!playerId) return NextResponse.json({ error: 'Målscorer er påkrevd' }, { status: 400 })
      if (!zone || !ZONES.includes(zone)) return NextResponse.json({ error: 'Sone i mål er påkrevd' }, { status: 400 })
      if (!shotPosition || !SHOT_POSITIONS.includes(shotPosition)) {
        return NextResponse.json({ error: 'Skuddposisjon er påkrevd' }, { status: 400 })
      }
      if (assistPlayerId && assistPlayerId === playerId) {
        return NextResponse.json({ error: 'Assist kan ikke være samme spiller som målscorer' }, { status: 400 })
      }
      data.assistPlayerId = assistPlayerId ?? null
      data.zone = zone
      data.shotPosition = shotPosition
      break
    case 'SHOT_SAVED':
      if (!playerId) return NextResponse.json({ error: 'Skytter er påkrevd' }, { status: 400 })
      if (!zone || !ZONES.includes(zone)) return NextResponse.json({ error: 'Sone i mål er påkrevd' }, { status: 400 })
      if (!shotPosition || !SHOT_POSITIONS.includes(shotPosition)) {
        return NextResponse.json({ error: 'Skuddposisjon er påkrevd' }, { status: 400 })
      }
      data.zone = zone
      data.shotPosition = shotPosition
      break
    case 'SHOT_MISSED':
      if (!playerId) return NextResponse.json({ error: 'Skytter er påkrevd' }, { status: 400 })
      if (!shotPosition || !SHOT_POSITIONS.includes(shotPosition)) {
        return NextResponse.json({ error: 'Skuddposisjon er påkrevd' }, { status: 400 })
      }
      data.shotPosition = shotPosition
      break
    case 'TECHNICAL_FAULT':
      if (!faultType || !FAULT_TYPES.includes(faultType)) {
        return NextResponse.json({ error: 'Type teknisk feil er påkrevd' }, { status: 400 })
      }
      if (faultType !== 'PASSIVE' && !playerId) {
        return NextResponse.json({ error: 'Spiller er påkrevd' }, { status: 400 })
      }
      data.faultType = faultType
      data.playerId = faultType === 'PASSIVE' ? null : (playerId ?? null)
      break
    case 'DEFENSIVE_FOUL':
      if (!playerId) return NextResponse.json({ error: 'Spiller er påkrevd' }, { status: 400 })
      if (!punishment || !PUNISHMENTS.includes(punishment)) {
        return NextResponse.json({ error: 'Straff er påkrevd' }, { status: 400 })
      }
      data.punishment = punishment
      break
    case 'SAVE':
      if (!playerId) return NextResponse.json({ error: 'Målvakt er påkrevd' }, { status: 400 })
      if (!zone || !ZONES.includes(zone)) return NextResponse.json({ error: 'Sone i mål er påkrevd' }, { status: 400 })
      data.zone = zone
      break
    case 'GOAL_CONCEDED':
      if (!playerId) return NextResponse.json({ error: 'Målvakt er påkrevd' }, { status: 400 })
      if (!zone || !ZONES.includes(zone)) return NextResponse.json({ error: 'Sone i mål er påkrevd' }, { status: 400 })
      data.zone = zone
      break
  }

  const event = await prisma.matchEvent.create({
    data,
    include: {
      player: { select: { id: true, name: true, number: true } },
      assistPlayer: { select: { id: true, name: true, number: true } },
    },
  })

  return NextResponse.json(event, { status: 201 })
}
