'use client'

export default function GoalFrame() {
  return (
    <svg viewBox="0 0 300 200" className="absolute inset-0 w-full h-full pointer-events-none">
      <rect x="10" y="10" width="280" height="180" fill="none" stroke="white" strokeWidth="6" />
      {[1, 2, 3, 4, 5].map(i => (
        <line key={`h${i}`} x1="10" y1={10 + i * 30} x2="290" y2={10 + i * 30} stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      ))}
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <line key={`v${i}`} x1={10 + i * (280 / 9)} y1="10" x2={10 + i * (280 / 9)} y2="190" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      ))}
    </svg>
  )
}
