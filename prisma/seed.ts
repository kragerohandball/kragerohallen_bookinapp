import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = 'Admin123!'
  const hash = await bcrypt.hash(adminPassword, 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@kragerophallen.no' },
    update: {},
    create: {
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
      description: 'Stor sal med plass til 50 personer og stor TV.',
    },
  })

  await prisma.room.upsert({
    where: { id: 'room-trykkerommet' },
    update: {},
    create: {
      id: 'room-trykkerommet',
      name: 'Trykkerommet',
      capacity: 8,
      description: 'Mindre rom med plass til 8 personer.',
    },
  })

  console.log('✅ Database seeded!')
  console.log(`Admin: ${admin.email} / ${adminPassword}`)
  console.log('⚠️  Bytt adminpassord etter første innlogging!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
