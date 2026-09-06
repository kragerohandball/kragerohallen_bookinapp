'use client'
import type { GoalZone } from '@prisma/client'
import { ZONE_LABELS, ZONE_ORDER } from '@/lib/kamper-constants'
import GoalFrame from './GoalFrame'

type Props = {
  label: string
  onSelect: (zone: GoalZone) => void
  primaryColor: string
}

export default function GoalZoneGrid({ label, onSelect, primaryColor }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-300 text-center">{label}</p>
      <div className="relative w-full max-w-sm mx-auto aspect-[3/2]">
        <GoalFrame />
        <div className="absolute grid grid-cols-3 grid-rows-3" style={{ inset: '10px' }}>
          {ZONE_ORDER.map(zone => (
            <button
              key={zone}
              type="button"
              aria-label={ZONE_LABELS[zone]}
              onClick={() => onSelect(zone)}
              className="border border-white/10 active:bg-white/20 transition-colors touch-manipulation"
              style={{ minHeight: 44 }}
              onTouchStart={e => (e.currentTarget.style.backgroundColor = `${primaryColor}40`)}
              onTouchEnd={e => (e.currentTarget.style.backgroundColor = '')}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
