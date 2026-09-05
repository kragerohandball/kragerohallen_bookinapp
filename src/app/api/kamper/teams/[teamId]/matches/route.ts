export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { hasKamperAccess } from '@/lib/access'

export async function POST(req: Request, { params }: { params: { teamId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }
  if (!hasKamperAccess(session.user)) return NextResponse.json({ error: 'Ingen tilgang til kamper' }, { status: 403 })

  const team = await prisma.team.findUnique({ where: { id: params.teamId } })
  if (!team) return NextResponse.json({ error: 'Fant ikke lag' }, { status: 404 })

  const { opponentName, date, season } = await req.json()
  if (!opponentName || !opponentName.trim() || !date || !season || !season.trim()) {
    return NextResponse.json({ error: 'Motstander, dato og sesong er påkrevd' }, { status: 400 })
  }

  const match = await prisma.match.create({
    data: {
      teamId: params.teamId,
      opponentName: opponentName.trim(),
      date: new Date(date),
      season: season.trim(),
      createdById: session.user.id,
    },
  })

  return NextResponse.json(match)
}
