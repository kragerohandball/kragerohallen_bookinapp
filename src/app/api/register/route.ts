import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAdminNewUserEmail } from '@/lib/email'

export async function POST(req: Request) {
  const { name, email, phone, group } = await req.json()

  if (!name || !email || !phone || !group) {
    return NextResponse.json({ error: 'Alle felt er påkrevd' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })
  if (existing) {
    return NextResponse.json({ error: 'E-postadressen er allerede registrert' }, { status: 400 })
  }

  await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      group: group.trim(),
    },
  })

  try {
    await sendAdminNewUserEmail(name, email, group)
  } catch {
    // e-post feiler ikke registreringen
  }

  return NextResponse.json({ ok: true })
}
