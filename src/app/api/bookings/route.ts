export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmationEmail } from '@/lib/email'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId')
  const date = searchParams.get('date') // YYYY-MM-DD

  if (!roomId || !date) {
    return NextResponse.json({ error: 'roomId og date er påkrevd' }, { status: 400 })
  }

  const start = new Date(`${date}T00:00:00`)
  const end = new Date(`${date}T23:59:59`)

  const bookings = await prisma.booking.findMany({
    where: {
      roomId,
      startTime: { gte: start, lte: end },
    },
    include: { user: { select: { name: true, group: true } } },
    orderBy: { startTime: 'asc' },
  })

  return NextResponse.json(bookings)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  if (session.user.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Brukeren er ikke godkjent' }, { status: 403 })
  }

  const { roomId, date, startHour, endHour, notes } = await req.json()

  if (!roomId || !date || startHour == null || endHour == null) {
    return NextResponse.json({ error: 'Mangler felt' }, { status: 400 })
  }

  if (startHour < 8 || endHour > 22 || startHour >= endHour) {
    return NextResponse.json({ error: 'Ugyldig tidspunkt' }, { status: 400 })
  }

  const startTime = new Date(`${date}T${String(startHour).padStart(2, '0')}:00:00`)
  const endTime = new Date(`${date}T${String(endHour).padStart(2, '0')}:00:00`)

  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() + 1)
  if (startTime > maxDate) {
    return NextResponse.json({ error: 'Kan ikke booke mer enn 1 år frem i tid' }, { status: 400 })
  }

  if (startTime < new Date()) {
    return NextResponse.json({ error: 'Kan ikke booke i fortiden' }, { status: 400 })
  }

  const conflict = await prisma.booking.findFirst({
    where: {
      roomId,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  })

  if (conflict) {
    return NextResponse.json({ error: 'Rommet er allerede booket i dette tidsrommet' }, { status: 409 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!user || !room) return NextResponse.json({ error: 'Ikke funnet' }, { status: 404 })

  const booking = await prisma.booking.create({
    data: {
      roomId,
      userId: session.user.id,
      startTime,
      endTime,
      notes: notes?.trim() || null,
    },
    include: { room: true },
  })

  try {
    await sendBookingConfirmationEmail(user.email, user.name, room.name, startTime, endTime, notes)
  } catch {
    // e-post feiler ikke bookingen
  }

  return NextResponse.json(booking)
}
