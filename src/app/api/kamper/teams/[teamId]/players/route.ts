export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: { teamId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }

  const team = await prisma.team.findUnique({ where: { id: params.teamId } })
  if (!team) return NextResponse.json({ error: 'Fant ikke lag' }, { status: 404 })

  const { name, number, isGoalkeeper } = await req.json()
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Navn er påkrevd' }, { status: 400 })
  }

  const player = await prisma.player.create({
    data: {
      teamId: params.teamId,
      name: name.trim(),
      number: number != null && number !== '' ? Number(number) : null,
      isGoalkeeper: !!isGoalkeeper,
    },
  })

  return NextResponse.json(player)
}
