'use client'

export default function CourtFrame() {
  return (
    <svg viewBox="0 0 300 250" className="absolute inset-0 w-full h-full pointer-events-none">
      <line x1="20" y1="10" x2="20" y2="245" stroke="white" strokeOpacity="0.25" strokeWidth="2" />
      <line x1="280" y1="10" x2="280" y2="245" stroke="white" strokeOpacity="0.25" strokeWidth="2" />
      <line x1="130" y1="6" x2="170" y2="6" stroke="white" strokeWidth="5" />
      <path d="M 65 10 A 85 85 0 0 0 150 96 A 85 85 0 0 0 235 10" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="2" />
      <path d="M 20 10 A 130 130 0 0 0 150 141 A 130 130 0 0 0 280 10" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="6 5" />
    </svg>
  )
}
