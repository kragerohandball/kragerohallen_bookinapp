import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { hasBookingAccess, hasKamperAccess } from '@/lib/access'

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    if (hasBookingAccess(session.user)) redirect('/booking')
    if (hasKamperAccess(session.user)) redirect('/kamper')
  }
  redirect('/login')
}
