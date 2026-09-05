'use client'
import { SessionProvider } from 'next-auth/react'
import { SiteSettingsProvider } from '@/components/SiteSettingsContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SiteSettingsProvider>{children}</SiteSettingsProvider>
    </SessionProvider>
  )
}
