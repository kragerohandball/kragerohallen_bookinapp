'use client'
import type { GoalZone } from '@prisma/client'
import { ZONE_LABELS, ZONE_ORDER } from '@/lib/kamper-constants'

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
        <svg viewBox="0 0 300 200" className="absolute inset-0 w-full h-full pointer-events-none">
          <rect x="10" y="10" width="280" height="180" fill="none" stroke="white" strokeWidth="6" />
          {[1, 2, 3, 4, 5].map(i => (
            <line key={`h${i}`} x1="10" y1={10 + i * 30} x2="290" y2={10 + i * 30} stroke="white" strokeOpacity="0.15" strokeWidth="1" />
          ))}
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <line key={`v${i}`} x1={10 + i * (280 / 9)} y1="10" x2={10 + i * (280 / 9)} y2="190" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
          ))}
        </svg>
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
