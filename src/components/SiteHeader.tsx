'use client'
import Link from 'next/link'
import Image from 'next/image'
import { signOut, useSession } from 'next-auth/react'
import { useSiteSettings } from './SiteSettingsContext'

type Props = {
  backHref?: string
  backLabel?: string
  title?: string
}

export default function SiteHeader({ backHref, backLabel, title }: Props) {
  const { siteTitle, logoUrl, primaryColor, navBgColor } = useSiteSettings()
  const { data: session } = useSession()

  return (
    <nav style={{ backgroundColor: navBgColor, borderBottom: `1px solid ${primaryColor}30` }} className="px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <Image
              src={logoUrl}
              alt="Logo"
              width={36}
              height={36}
              className="object-contain rounded"
              style={{ background: 'transparent' }}
              unoptimized
            />
          )}
          {backHref ? (
            <>
              <Link href={backHref} className="text-gray-400 hover:text-gray-200 text-sm">{backLabel ?? '← Tilbake'}</Link>
              <span className="text-gray-600">|</span>
              <span className="font-bold" style={{ color: primaryColor }}>{title ?? siteTitle}</span>
            </>
          ) : (
            <h1 className="font-bold text-lg" style={{ color: primaryColor }}>{title ?? siteTitle}</h1>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 hidden sm:block">{session?.user?.name}</span>
          <Link href="/change-password" className="text-sm text-gray-400 hover:text-white">Bytt passord</Link>
          {session?.user?.role === 'ADMIN' && (
            <Link href="/admin" className="text-sm font-medium hover:underline" style={{ color: primaryColor }}>Admin</Link>
          )}
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm text-gray-400 hover:text-white">
            Logg ut
          </button>
        </div>
      </div>
    </nav>
  )
}
