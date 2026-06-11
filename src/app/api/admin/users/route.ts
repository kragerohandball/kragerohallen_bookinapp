export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, phone: true,
      group: true, role: true, status: true, createdAt: true,
    },
  })

  return NextResponse.json(users)
}
