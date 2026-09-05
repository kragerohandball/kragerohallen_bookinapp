'use client'
import type { ShotPosition } from '@prisma/client'
import { SHOT_POSITION_LABELS } from '@/lib/kamper-constants'

type Props = {
  onSelect: (position: ShotPosition) => void
  primaryColor: string
}

const SPOTS: { position: ShotPosition; x: number; y: number; short: string }[] = [
  { position: 'LEFT_WING', x: 8, y: 27, short: 'VK' },
  { position: 'LEFT_BACK', x: 23, y: 58, short: 'VB' },
  { position: 'CENTER_BACK', x: 50, y: 66, short: 'M' },
  { position: 'RIGHT_BACK', x: 77, y: 58, short: 'HB' },
  { position: 'RIGHT_WING', x: 92, y: 27, short: 'HK' },
  { position: 'PIVOT', x: 50, y: 24, short: 'S' },
  { position: 'SEVEN_METER', x: 50, y: 40, short: '7m' },
  { position: 'FAST_BREAK', x: 50, y: 92, short: 'GJ' },
]

export default function CourtPositionPicker({ onSelect, primaryColor }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-300 text-center">Hvor på banen ble skuddet avfyrt fra?</p>
      <div className="relative w-full max-w-sm mx-auto aspect-[6/5]">
        <svg viewBox="0 0 300 250" className="absolute inset-0 w-full h-full pointer-events-none">
          <line x1="20" y1="10" x2="20" y2="245" stroke="white" strokeOpacity="0.25" strokeWidth="2" />
          <line x1="280" y1="10" x2="280" y2="245" stroke="white" strokeOpacity="0.25" strokeWidth="2" />
          <line x1="130" y1="6" x2="170" y2="6" stroke="white" strokeWidth="5" />
          <path d="M 65 10 A 85 85 0 0 0 150 96 A 85 85 0 0 0 235 10" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="2" />
          <path d="M 20 10 A 130 130 0 0 0 150 141 A 130 130 0 0 0 280 10" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="6 5" />
        </svg>
        {SPOTS.map(s => (
          <button
            key={s.position}
            type="button"
            aria-label={SHOT_POSITION_LABELS[s.position]}
            onClick={() => onSelect(s.position)}
            className="absolute flex items-center justify-center rounded-full border-2 border-white/40 bg-black/30 active:bg-white/20 text-xs font-bold text-white -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: 44, height: 44, color: primaryColor }}
          >
            {s.short}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500 max-w-sm mx-auto">
        {SPOTS.map(s => (
          <div key={s.position}>{s.short} = {SHOT_POSITION_LABELS[s.position]}</div>
        ))}
      </div>
    </div>
  )
}
