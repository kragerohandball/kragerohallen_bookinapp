export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { hasKamperAccess } from '@/lib/access'

export async function PATCH(req: Request, { params }: { params: { playerId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }
  if (!hasKamperAccess(session.user)) return NextResponse.json({ error: 'Ingen tilgang til kamper' }, { status: 403 })

  const body = await req.json()
  const data: { name?: string; number?: number | null; isGoalkeeper?: boolean; active?: boolean } = {}
  if (body.name != null) {
    if (!body.name.trim()) return NextResponse.json({ error: 'Navn kan ikke være tomt' }, { status: 400 })
    data.name = body.name.trim()
  }
  if (body.number !== undefined) data.number = body.number === '' || body.number == null ? null : Number(body.number)
  if (body.isGoalkeeper !== undefined) data.isGoalkeeper = !!body.isGoalkeeper
  if (body.active !== undefined) data.active = !!body.active

  const player = await prisma.player.update({ where: { id: params.playerId }, data })
  return NextResponse.json(player)
}

export async function DELETE(req: Request, { params }: { params: { playerId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }
  if (!hasKamperAccess(session.user)) return NextResponse.json({ error: 'Ingen tilgang til kamper' }, { status: 403 })

  const player = await prisma.player.findUnique({ where: { id: params.playerId } })
  if (!player) return NextResponse.json({ error: 'Fant ikke spiller' }, { status: 404 })

  const eventCount = await prisma.matchEvent.count({
    where: { OR: [{ playerId: params.playerId }, { assistPlayerId: params.playerId }] },
  })

  if (eventCount === 0) {
    await prisma.player.delete({ where: { id: params.playerId } })
    return NextResponse.json({ deleted: true })
  }

  await prisma.player.update({ where: { id: params.playerId }, data: { active: false } })
  return NextResponse.json({ deactivated: true })
}
