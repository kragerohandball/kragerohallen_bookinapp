import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.siteSettings.upsert({
    where: { id: 'default' },
    create: {},
    update: {},
  })
  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['siteTitle', 'logoUrl', 'primaryColor', 'bgColor', 'navBgColor', 'footerText']
  const data: Record<string, string> = {}
  for (const key of allowed) {
    if (typeof body[key] === 'string') data[key] = body[key]
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...data },
    update: data,
  })
  return NextResponse.json(settings)
}
