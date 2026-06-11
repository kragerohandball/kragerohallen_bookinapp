export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmationEmail } from '@/lib/email'

export async function GET() {
  const session = await getServerSession()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 })
  }

  const bookings = await prisma.booking.findMany({
    where: { startTime: { gte: new Date() } },
    include: {
      room: true,
      user: { select: { name: true, email: true, group: true } },
    },
    orderBy: { startTime: 'asc' },
  })

  return NextResponse.json(bookings)
}

export async function POST(req: Request) {
  const session = await getServerSession()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 })
  }

  const { roomId, userId, date, startHour, endHour, notes, isBlocked } = await req.json()

  if (!roomId || !date || startHour == null || endHour == null) {
    return NextResponse.json({ error: 'Mangler felt' }, { status: 400 })
  }

  if (startHour < 8 || endHour > 22 || startHour >= endHour) {
    return NextResponse.json({ error: 'Ugyldig tidspunkt' }, { status: 400 })
  }

  const startTime = new Date(`${date}T${String(startHour).padStart(2, '0')}:00:00`)
  const endTime = new Date(`${date}T${String(endHour).padStart(2, '0')}:00:00`)

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

  const targetUserId = isBlocked ? session.user.id : (userId || session.user.id)
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  const user = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!room || !user) return NextResponse.json({ error: 'Ikke funnet' }, { status: 404 })

  const booking = await prisma.booking.create({
    data: {
      roomId,
      userId: targetUserId,
      startTime,
      endTime,
      notes: notes?.trim() || null,
      isBlocked: isBlocked ?? false,
    },
    include: { room: true },
  })

  if (!isBlocked) {
    try {
      await sendBookingConfirmationEmail(user.email, user.name, room.name, startTime, endTime, notes)
    } catch {
      // ignorer e-postfeil
    }
  }

  return NextResponse.json(booking)
}
