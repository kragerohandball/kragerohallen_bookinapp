export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generatePassword } from '@/lib/utils'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 })
  }

  const { name, email, phone, group, bookingAccess, kamperAccess } = await req.json()
  if (!name || !email || !group) {
    return NextResponse.json({ error: 'Navn, e-post og gruppe er påkrevd' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'E-postadressen er allerede registrert' }, { status: 400 })
  }

  const plainPassword = generatePassword()
  const hashed = await bcrypt.hash(plainPassword, 12)

  await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: (phone ?? '').trim(),
      group: group.trim(),
      status: 'APPROVED',
      password: hashed,
      mustChangePassword: true,
      bookingAccess: bookingAccess !== false,
      kamperAccess: kamperAccess === true,
    },
  })

  return NextResponse.json({ ok: true, password: plainPassword, name: name.trim(), email: email.toLowerCase().trim() })
}
