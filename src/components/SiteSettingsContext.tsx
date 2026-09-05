'use client'
import { createContext, useContext, useEffect, useState } from 'react'

export type SiteSettings = {
  siteTitle: string
  logoUrl: string
  primaryColor: string
  bgColor: string
  navBgColor: string
  footerText: string
}

const defaults: SiteSettings = {
  siteTitle: 'Kragerøhallen Booking',
  logoUrl: '/kif-logo.png',
  primaryColor: '#FFD400',
  bgColor: '#1a1a1a',
  navBgColor: '#111111',
  footerText: 'Kragerø IF Håndball · Frydensborgveien 13, 3770 Kragerø',
}

const SiteSettingsContext = createContext<SiteSettings>(defaults)

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaults)

  useEffect(() => {
    fetch('/api/site-settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setSettings({ ...defaults, ...d }))
      .catch(() => {})
  }, [])

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}
