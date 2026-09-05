export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { matchId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }

  const match = await prisma.match.findUnique({ where: { id: params.matchId } })
  if (!match) return NextResponse.json({ error: 'Fant ikke kamp' }, { status: 404 })

  const { playerIds } = await req.json()
  if (!Array.isArray(playerIds)) {
    return NextResponse.json({ error: 'playerIds må være en liste' }, { status: 400 })
  }

  const validPlayers = await prisma.player.findMany({
    where: { id: { in: playerIds }, teamId: match.teamId },
    select: { id: true },
  })
  if (validPlayers.length !== playerIds.length) {
    return NextResponse.json({ error: 'En eller flere spillere tilhører ikke laget' }, { status: 400 })
  }

  const updated = await prisma.match.update({
    where: { id: params.matchId },
    data: { squad: { set: playerIds.map((id: string) => ({ id })) } },
    include: { squad: { orderBy: [{ number: 'asc' }] } },
  })

  return NextResponse.json(updated)
}
