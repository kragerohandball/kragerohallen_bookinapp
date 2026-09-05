export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { elapsedSeconds } from '@/lib/match-clock'
import { hasKamperAccess } from '@/lib/access'

export async function GET(req: Request, { params }: { params: { matchId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (!hasKamperAccess(session.user)) return NextResponse.json({ error: 'Ingen tilgang til kamper' }, { status: 403 })

  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
    include: {
      team: { include: { players: { orderBy: [{ active: 'desc' }, { number: 'asc' }] } } },
      squad: { orderBy: [{ number: 'asc' }] },
      events: {
        orderBy: { createdAt: 'desc' },
        include: {
          player: { select: { id: true, name: true, number: true } },
          assistPlayer: { select: { id: true, name: true, number: true } },
        },
      },
    },
  })

  if (!match) return NextResponse.json({ error: 'Fant ikke kamp' }, { status: 404 })

  return NextResponse.json(match)
}

export async function PATCH(req: Request, { params }: { params: { matchId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }
  if (!hasKamperAccess(session.user)) return NextResponse.json({ error: 'Ingen tilgang til kamper' }, { status: 403 })

  const match = await prisma.match.findUnique({ where: { id: params.matchId } })
  if (!match) return NextResponse.json({ error: 'Fant ikke kamp' }, { status: 404 })

  const { action } = await req.json()
  const now = new Date()

  if (action === 'start') {
    if (match.status !== 'SCHEDULED') {
      return NextResponse.json({ error: 'Kampen er allerede startet' }, { status: 409 })
    }
    const updated = await prisma.match.update({
      where: { id: params.matchId },
      data: { status: 'LIVE', period: 1, clockRunning: true, clockStartedAt: now, accumulatedSeconds: 0 },
    })
    return NextResponse.json(updated)
  }

  if (action === 'pause') {
    if (match.status !== 'LIVE' || !match.clockRunning) {
      return NextResponse.json({ error: 'Klokken går ikke' }, { status: 409 })
    }
    const updated = await prisma.match.update({
      where: { id: params.matchId },
      data: { clockRunning: false, accumulatedSeconds: elapsedSeconds(match, now), clockStartedAt: null },
    })
    return NextResponse.json(updated)
  }

  if (action === 'resume') {
    if (match.status !== 'LIVE' || match.clockRunning) {
      return NextResponse.json({ error: 'Klokken går allerede' }, { status: 409 })
    }
    const updated = await prisma.match.update({
      where: { id: params.matchId },
      data: { clockRunning: true, clockStartedAt: now },
    })
    return NextResponse.json(updated)
  }

  if (action === 'halftime') {
    if (match.status !== 'LIVE') {
      return NextResponse.json({ error: 'Kampen er ikke i gang' }, { status: 409 })
    }
    const updated = await prisma.match.update({
      where: { id: params.matchId },
      data: { status: 'HALFTIME', clockRunning: false, accumulatedSeconds: elapsedSeconds(match, now), clockStartedAt: null },
    })
    return NextResponse.json(updated)
  }

  if (action === 'next-period') {
    if (match.status !== 'HALFTIME') {
      return NextResponse.json({ error: 'Kampen er ikke i pause' }, { status: 409 })
    }
    const updated = await prisma.match.update({
      where: { id: params.matchId },
      data: { status: 'LIVE', period: match.period + 1, clockRunning: true, clockStartedAt: now, accumulatedSeconds: 0 },
    })
    return NextResponse.json(updated)
  }

  if (action === 'finish') {
    if (match.status !== 'LIVE' && match.status !== 'HALFTIME') {
      return NextResponse.json({ error: 'Kampen kan ikke avsluttes nå' }, { status: 409 })
    }
    const finalSeconds = match.status === 'LIVE' ? elapsedSeconds(match, now) : match.accumulatedSeconds
    const updated = await prisma.match.update({
      where: { id: params.matchId },
      data: { status: 'FINISHED', clockRunning: false, accumulatedSeconds: finalSeconds, finishedAt: now },
    })
    return NextResponse.json(updated)
  }

  if (action === 'reopen') {
    if (match.status !== 'FINISHED') {
      return NextResponse.json({ error: 'Kampen er ikke avsluttet' }, { status: 409 })
    }
    const updated = await prisma.match.update({
      where: { id: params.matchId },
      data: { status: 'LIVE', finishedAt: null, clockRunning: false },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Ukjent handling' }, { status: 400 })
}

export async function DELETE(req: Request, { params }: { params: { matchId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }
  if (!hasKamperAccess(session.user)) return NextResponse.json({ error: 'Ingen tilgang til kamper' }, { status: 403 })

  await prisma.match.delete({ where: { id: params.matchId } })
  return NextResponse.json({ ok: true })
}
