'use client'
import { ZONE_ORDER } from '@/lib/kamper-constants'
import type { ZoneRow } from '@/lib/kamper-stats'
import GoalFrame from './GoalFrame'

type Props = {
  stats: ZoneRow[]
  primaryColor: string
  title?: string
  theme?: 'dark' | 'light'
}

function alphaHex(intensity: number) {
  const clamped = Math.max(0, Math.min(1, intensity))
  return Math.round(20 + clamped * 190).toString(16).padStart(2, '0')
}

export default function GoalZoneHeatmap({ stats, primaryColor, title, theme = 'dark' }: Props) {
  const byZone = new Map(stats.map(s => [s.zone, s]))
  const maxShots = Math.max(1, ...stats.map(s => s.shots))
  const isLight = theme === 'light'

  return (
    <div className="space-y-2">
      {title && <p className={`text-sm font-medium text-center ${isLight ? 'text-black' : 'text-gray-300'}`}>{title}</p>}
      <div className="relative w-full max-w-sm mx-auto aspect-[3/2]">
        <GoalFrame stroke={isLight ? '#333' : 'white'} />
        <div className="absolute grid grid-cols-3 grid-rows-3" style={{ inset: '10px' }}>
          {ZONE_ORDER.map(zone => {
            const row = byZone.get(zone)
            const shots = row?.shots ?? 0
            return (
              <div
                key={zone}
                className={`border flex flex-col items-center justify-center ${isLight ? 'border-gray-400 text-black' : 'border-white/10 text-white'}`}
                style={{ backgroundColor: shots > 0 ? `${primaryColor}${alphaHex(shots / maxShots)}` : 'transparent' }}
              >
                {shots > 0 && (
                  <>
                    <span className="text-xs font-bold">{row!.goals}/{shots}</span>
                    <span className={`text-[10px] ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{row!.shootingPct}%</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
