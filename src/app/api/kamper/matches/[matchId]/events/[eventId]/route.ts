export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: Request, { params }: { params: { matchId: string; eventId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }

  const event = await prisma.matchEvent.findUnique({ where: { id: params.eventId } })
  if (!event || event.matchId !== params.matchId) {
    return NextResponse.json({ error: 'Fant ikke hendelse' }, { status: 404 })
  }

  await prisma.matchEvent.delete({ where: { id: params.eventId } })
  return NextResponse.json({ ok: true })
}
