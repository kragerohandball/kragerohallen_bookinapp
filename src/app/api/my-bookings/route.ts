import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })

  const bookings = await prisma.booking.findMany({
    where: {
      userId: session.user.id,
      endTime: { gte: new Date() },
    },
    include: { room: true },
    orderBy: { startTime: 'asc' },
  })

  return NextResponse.json(bookings)
}
