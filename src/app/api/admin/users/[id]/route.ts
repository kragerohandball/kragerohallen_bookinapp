export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendApprovalEmail, sendRejectionEmail } from '@/lib/email'
import { generatePassword } from '@/lib/utils'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 })
  }

  const { action, bookingAccess, kamperAccess } = await req.json() // 'approve' | 'reject' | undefined

  const user = await prisma.user.findUnique({ where: { id: params.id } })
  if (!user) return NextResponse.json({ error: 'Bruker ikke funnet' }, { status: 404 })

  if (action === 'approve') {
    const plainPassword = generatePassword()
    const hashed = await bcrypt.hash(plainPassword, 12)

    await prisma.user.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        password: hashed,
        mustChangePassword: true,
        bookingAccess: bookingAccess !== false,
        kamperAccess: kamperAccess === true,
      },
    })

    return NextResponse.json({ ok: true, password: plainPassword })
  }

  if (action === 'reject') {
    await prisma.user.update({
      where: { id: params.id },
      data: { status: 'REJECTED' },
    })

    try {
      await sendRejectionEmail(user.email, user.name)
    } catch {
      // ignorer e-postfeil
    }

    return NextResponse.json({ ok: true })
  }

  if (action == null && (bookingAccess !== undefined || kamperAccess !== undefined)) {
    const data: { bookingAccess?: boolean; kamperAccess?: boolean } = {}
    if (bookingAccess !== undefined) data.bookingAccess = !!bookingAccess
    if (kamperAccess !== undefined) data.kamperAccess = !!kamperAccess

    const updated = await prisma.user.update({ where: { id: params.id }, data })
    return NextResponse.json({ ok: true, bookingAccess: updated.bookingAccess, kamperAccess: updated.kamperAccess })
  }

  return NextResponse.json({ error: 'Ugyldig handling' }, { status: 400 })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 })
  }

  await prisma.booking.deleteMany({ where: { userId: params.id } })
  await prisma.user.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}
