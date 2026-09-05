export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { hasBookingAccess } from '@/lib/access'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (!hasBookingAccess(session.user)) return NextResponse.json({ error: 'Ingen tilgang til booking' }, { status: 403 })

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
