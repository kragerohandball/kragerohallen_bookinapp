export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: { teamId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })

  const team = await prisma.team.findUnique({ where: { id: params.teamId } })
  if (!team) return NextResponse.json({ error: 'Fant ikke lag' }, { status: 404 })

  const [players, matches] = await Promise.all([
    prisma.player.findMany({ where: { teamId: params.teamId }, orderBy: [{ active: 'desc' }, { number: 'asc' }] }),
    prisma.match.findMany({ where: { teamId: params.teamId }, orderBy: { date: 'desc' } }),
  ])

  const matchIds = matches.map(m => m.id)
  const grouped = matchIds.length
    ? await prisma.matchEvent.groupBy({
        by: ['matchId', 'type'],
        where: { matchId: { in: matchIds }, type: { in: ['GOAL', 'GOAL_CONCEDED'] } },
        _count: true,
      })
    : []

  const scoreByMatch = new Map<string, { ourScore: number; opponentScore: number }>()
  for (const g of grouped) {
    const entry = scoreByMatch.get(g.matchId) ?? { ourScore: 0, opponentScore: 0 }
    if (g.type === 'GOAL') entry.ourScore = g._count
    if (g.type === 'GOAL_CONCEDED') entry.opponentScore = g._count
    scoreByMatch.set(g.matchId, entry)
  }

  const matchesWithScore = matches.map(m => ({
    ...m,
    ourScore: scoreByMatch.get(m.id)?.ourScore ?? 0,
    opponentScore: scoreByMatch.get(m.id)?.opponentScore ?? 0,
  }))

  return NextResponse.json({ team, players, matches: matchesWithScore })
}

export async function PATCH(req: Request, { params }: { params: { teamId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }

  const { name, rosterImportUrl } = await req.json()
  const data: { name?: string; rosterImportUrl?: string | null } = {}
  if (name != null) {
    if (!name.trim()) return NextResponse.json({ error: 'Navn kan ikke være tomt' }, { status: 400 })
    data.name = name.trim()
  }
  if (rosterImportUrl !== undefined) data.rosterImportUrl = rosterImportUrl || null

  const team = await prisma.team.update({ where: { id: params.teamId }, data })
  return NextResponse.json(team)
}

export async function DELETE(req: Request, { params }: { params: { teamId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }

  await prisma.team.delete({ where: { id: params.teamId } })
  return NextResponse.json({ ok: true })
}
