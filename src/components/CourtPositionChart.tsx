'use client'
import { SHOT_POSITION_COORDS, SHOT_POSITION_LABELS, SHOT_POSITION_ORDER, SHOT_POSITION_SHORT } from '@/lib/kamper-constants'
import type { PositionRow } from '@/lib/kamper-stats'
import CourtFrame from './CourtFrame'

type Props = {
  stats: PositionRow[]
  primaryColor: string
  title?: string
  theme?: 'dark' | 'light'
}

function alphaHex(intensity: number) {
  const clamped = Math.max(0, Math.min(1, intensity))
  return Math.round(25 + clamped * 190).toString(16).padStart(2, '0')
}

export default function CourtPositionChart({ stats, primaryColor, title, theme = 'dark' }: Props) {
  const byPosition = new Map(stats.map(s => [s.position, s]))
  const maxShots = Math.max(1, ...stats.map(s => s.shots))
  const isLight = theme === 'light'

  return (
    <div className="space-y-2">
      {title && <p className={`text-sm font-medium text-center ${isLight ? 'text-black' : 'text-gray-300'}`}>{title}</p>}
      <div className="relative w-full max-w-sm mx-auto aspect-[6/5]">
        <CourtFrame stroke={isLight ? '#333' : 'white'} />
        {SHOT_POSITION_ORDER.map(position => {
          const c = SHOT_POSITION_COORDS[position]
          const row = byPosition.get(position)
          const shots = row?.shots ?? 0
          const size = 30 + Math.round((shots / maxShots) * 34)
          return (
            <div
              key={position}
              title={SHOT_POSITION_LABELS[position]}
              className={`absolute flex flex-col items-center justify-center rounded-full border-2 -translate-x-1/2 -translate-y-1/2 ${isLight ? 'border-gray-500 text-black' : 'border-white/40 text-white'}`}
              style={{
                left: `${c.x}%`, top: `${c.y}%`, width: size, height: size,
                backgroundColor: shots > 0 ? `${primaryColor}${alphaHex(shots / maxShots)}` : (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.3)'),
              }}
            >
              <span className="text-[10px] font-bold leading-tight">{SHOT_POSITION_SHORT[position]}</span>
              {shots > 0 && <span className={`text-[9px] leading-tight ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{row!.goals}/{shots}</span>}
            </div>
          )
        })}
      </div>
      <div className={`grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs max-w-sm mx-auto ${isLight ? 'text-gray-700' : 'text-gray-500'}`}>
        {SHOT_POSITION_ORDER.map(position => (
          <div key={position}>{SHOT_POSITION_SHORT[position]} = {SHOT_POSITION_LABELS[position]}</div>
        ))}
      </div>
    </div>
  )
}
