export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { sendBookingCancellationEmail } from '@/lib/email'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  if (!session?.user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { room: true, user: true },
  })

  if (!booking) return NextResponse.json({ error: 'Booking ikke funnet' }, { status: 404 })

  const isOwner = booking.userId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 })
  }

  await prisma.booking.delete({ where: { id: params.id } })

  if (!booking.isBlocked) {
    try {
      await sendBookingCancellationEmail(
        booking.user.email,
        booking.user.name,
        booking.room.name,
        booking.startTime
      )
    } catch {
      // ignorer e-postfeil
    }
  }

  return NextResponse.json({ ok: true })
}
