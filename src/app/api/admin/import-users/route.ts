export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generatePassword } from '@/lib/utils'
import * as XLSX from 'xlsx'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Ingen fil lastet opp' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })

  const results: { name: string; email: string; group: string; password: string; error?: string }[] = []

  for (const row of rows) {
    const name = (row['Navn'] ?? row['name'] ?? '').toString().trim()
    const email = (row['E-post'] ?? row['email'] ?? row['Epost'] ?? '').toString().trim().toLowerCase()
    const phone = (row['Telefon'] ?? row['phone'] ?? row['Mobil'] ?? '').toString().trim()
    const group = (row['Gruppe'] ?? row['group'] ?? row['Lag'] ?? '').toString().trim()

    if (!name || !email) {
      results.push({ name, email, group, password: '', error: 'Mangler navn eller e-post' })
      continue
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      results.push({ name, email, group, password: '', error: 'E-post allerede registrert' })
      continue
    }

    const plainPassword = generatePassword()
    const hashed = await bcrypt.hash(plainPassword, 12)

    await prisma.user.create({
      data: {
        name,
        email,
        phone,
        group: group || 'Ukjent',
        status: 'APPROVED',
        password: hashed,
        mustChangePassword: true,
      },
    })

    results.push({ name, email, group, password: plainPassword })
  }

  return NextResponse.json({ ok: true, results })
}
