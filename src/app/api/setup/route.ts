export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 })
  }

  const existing = await prisma.user.findUnique({
    where: { email: 'admin@kragerophallen.no' },
  })
  if (existing) {
    return NextResponse.json({ message: 'Databasen er allerede satt opp.' })
  }

  const hash = await bcrypt.hash('Admin123!', 12)

  await prisma.user.create({
    data: {
      name: 'Administrator',
      email: 'admin@kragerophallen.no',
      phone: '00000000',
      group: 'Administrasjon',
      password: hash,
      role: 'ADMIN',
      status: 'APPROVED',
    },
  })

  await prisma.room.upsert({
    where: { id: 'room-kafeen' },
    update: {},
    create: {
      id: 'room-kafeen',
      name: 'Kaféen',
      capacity: 50,
      description: 'Plass til 50 personer og stor TV.',
    },
  })

  await prisma.room.upsert({
    where: { id: 'room-trykkerommet' },
    update: {},
    create: {
      id: 'room-trykkerommet',
      name: 'Trykkerommet',
      capacity: 8,
      description: 'Plass til 8 personer.',
    },
  })

  return NextResponse.json({
    ok: true,
    message: 'Database satt opp! Admin: admin@kragerophallen.no / Admin123!',
  })
}
