export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })

  const teams = await prisma.team.findMany({
    include: { _count: { select: { players: true, matches: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(teams)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }

  const { name } = await req.json()
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Navn er påkrevd' }, { status: 400 })
  }

  const team = await prisma.team.create({ data: { name: name.trim() } })
  return NextResponse.json(team)
}
