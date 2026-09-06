'use client'
import type { ShotPosition } from '@prisma/client'
import { SHOT_POSITION_COORDS, SHOT_POSITION_LABELS, SHOT_POSITION_ORDER, SHOT_POSITION_SHORT } from '@/lib/kamper-constants'
import CourtFrame from './CourtFrame'

type Props = {
  onSelect: (position: ShotPosition) => void
  primaryColor: string
}

export default function CourtPositionPicker({ onSelect, primaryColor }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-300 text-center">Hvor på banen ble skuddet avfyrt fra?</p>
      <div className="relative w-full max-w-sm mx-auto aspect-[6/5]">
        <CourtFrame />
        {SHOT_POSITION_ORDER.map(position => {
          const c = SHOT_POSITION_COORDS[position]
          return (
            <button
              key={position}
              type="button"
              aria-label={SHOT_POSITION_LABELS[position]}
              onClick={() => onSelect(position)}
              className="absolute flex items-center justify-center rounded-full border-2 border-white/40 bg-black/30 active:bg-white/20 text-xs font-bold text-white -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${c.x}%`, top: `${c.y}%`, width: 44, height: 44, color: primaryColor }}
            >
              {SHOT_POSITION_SHORT[position]}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500 max-w-sm mx-auto">
        {SHOT_POSITION_ORDER.map(position => (
          <div key={position}>{SHOT_POSITION_SHORT[position]} = {SHOT_POSITION_LABELS[position]}</div>
        ))}
      </div>
    </div>
  )
}
