'use client'

export type PlayerLite = { id: string; name: string; number: number | null; isGoalkeeper: boolean }

type Props = {
  players: PlayerLite[]
  excludePlayerId?: string | null
  onSelect: (playerId: string) => void
  primaryColor: string
  emptyMessage?: string
}

export default function PlayerPicker({ players, excludePlayerId, onSelect, primaryColor, emptyMessage }: Props) {
  const list = players.filter(p => p.id !== excludePlayerId)

  if (list.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">{emptyMessage ?? 'Ingen spillere tilgjengelig'}</p>
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {list.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          className="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-gray-600 bg-[#1a1a1a] active:border-white py-3 px-1"
          style={{ minHeight: 64 }}
        >
          <span className="text-lg font-bold" style={{ color: primaryColor }}>{p.number ?? '–'}</span>
          <span className="text-xs text-gray-300 text-center leading-tight">{p.name}</span>
        </button>
      ))}
    </div>
  )
}
