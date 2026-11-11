export const dynamic = 'force-dynamic'
export const maxDuration = 60
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { syncBanedagbok } from '@/lib/banedagbok'

// Kalles daglig av Vercel Cron (Authorization: Bearer $CRON_SECRET),
// eller manuelt av en innlogget admin.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const fromCron = !!secret && req.headers.get('authorization') === `Bearer ${secret}`

  if (!fromCron) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
    }
  }

  try {
    const result = await syncBanedagbok()
    console.log('[banedagbok] synk ferdig', JSON.stringify(result))
    return NextResponse.json(result)
  } catch (e) {
    console.error('[banedagbok] synk feilet', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Synk feilet' }, { status: 500 })
  }
}
