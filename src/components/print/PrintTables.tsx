import type { OutfieldTotals, GoalkeeperTotals, PlayerRow, PositionRow } from '@/lib/kamper-stats'
import { SHOT_POSITION_LABELS } from '@/lib/kamper-constants'

const thCls = 'text-left border border-gray-400 px-2 py-1 bg-gray-100'
const thRightCls = 'text-right border border-gray-400 px-2 py-1 bg-gray-100'
const tdCls = 'border border-gray-400 px-2 py-1'
const tdRightCls = 'border border-gray-400 px-2 py-1 text-right'
const pct = (v: number | null) => (v != null ? `${v}%` : '–')

export function PrintOutfieldTable({ players, totals }: { players: PlayerRow[]; totals: OutfieldTotals }) {
  const rows = players.filter(p => !p.isGoalkeeper && (p.goals || p.assists || p.shotsTotal || p.technicalFaults || p.defensiveFouls || p.steals || p.freeThrowsWon || p.yellowCards || p.twoMinutes || p.redCards))
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className={thCls}>#</th>
          <th className={thCls}>Navn</th>
          <th className={thRightCls}>Mål</th>
          <th className={thRightCls}>Assist</th>
          <th className={thRightCls}>Skudd%</th>
          <th className={thRightCls}>Tekn. feil</th>
          <th className={thRightCls}>Forsvarsfeil</th>
          <th className={thRightCls}>Snapp</th>
          <th className={thRightCls}>Frikast</th>
          <th className={thRightCls}>Gult</th>
          <th className={thRightCls}>2 min</th>
          <th className={thRightCls}>Rødt</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(p => (
          <tr key={p.playerId}>
            <td className={tdCls}>{p.number ?? '–'}</td>
            <td className={tdCls}>{p.name}</td>
            <td className={tdRightCls}>{p.goals}</td>
            <td className={tdRightCls}>{p.assists}</td>
            <td className={tdRightCls}>{pct(p.shootingPct)}</td>
            <td className={tdRightCls}>{p.technicalFaults}</td>
            <td className={tdRightCls}>{p.defensiveFouls}</td>
            <td className={tdRightCls}>{p.steals}</td>
            <td className={tdRightCls}>{p.freeThrowsWon}</td>
            <td className={tdRightCls}>{p.yellowCards}</td>
            <td className={tdRightCls}>{p.twoMinutes}</td>
            <td className={tdRightCls}>{p.redCards}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td className={tdCls} colSpan={12}>Ingen data</td></tr>}
        {rows.length > 0 && (
          <tr className="font-bold">
            <td className={tdCls}></td>
            <td className={tdCls}>Totalt</td>
            <td className={tdRightCls}>{totals.goals}</td>
            <td className={tdRightCls}>{totals.assists}</td>
            <td className={tdRightCls}>{pct(totals.shootingPct)}</td>
            <td className={tdRightCls}>{totals.technicalFaults}</td>
            <td className={tdRightCls}>{totals.defensiveFouls}</td>
            <td className={tdRightCls}>{totals.steals}</td>
            <td className={tdRightCls}>{totals.freeThrowsWon}</td>
            <td className={tdRightCls}>{totals.yellowCards}</td>
            <td className={tdRightCls}>{totals.twoMinutes}</td>
            <td className={tdRightCls}>{totals.redCards}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

export function PrintGoalkeeperTable({ players, totals }: { players: PlayerRow[]; totals: GoalkeeperTotals }) {
  const rows = players.filter(p => p.isGoalkeeper && (p.saves || p.goalsConceded))
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className={thCls}>#</th>
          <th className={thCls}>Navn</th>
          <th className={thRightCls}>Redninger</th>
          <th className={thRightCls}>Baklengs mål</th>
          <th className={thRightCls}>Redning%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(p => (
          <tr key={p.playerId}>
            <td className={tdCls}>{p.number ?? '–'}</td>
            <td className={tdCls}>{p.name}</td>
            <td className={tdRightCls}>{p.saves}</td>
            <td className={tdRightCls}>{p.goalsConceded}</td>
            <td className={tdRightCls}>{pct(p.savePct)}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td className={tdCls} colSpan={5}>Ingen data</td></tr>}
        {rows.length > 0 && (
          <tr className="font-bold">
            <td className={tdCls}></td>
            <td className={tdCls}>Totalt</td>
            <td className={tdRightCls}>{totals.saves}</td>
            <td className={tdRightCls}>{totals.goalsConceded}</td>
            <td className={tdRightCls}>{pct(totals.savePct)}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

export function PrintPositionTable({ positions }: { positions: PositionRow[] }) {
  const rows = positions.filter(p => p.shots > 0)
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className={thCls}>Posisjon</th>
          <th className={thRightCls}>Skudd</th>
          <th className={thRightCls}>Mål</th>
          <th className={thRightCls}>Skudd%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(p => (
          <tr key={p.position}>
            <td className={tdCls}>{SHOT_POSITION_LABELS[p.position]}</td>
            <td className={tdRightCls}>{p.shots}</td>
            <td className={tdRightCls}>{p.goals}</td>
            <td className={tdRightCls}>{pct(p.shootingPct)}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td className={tdCls} colSpan={4}>Ingen data</td></tr>}
      </tbody>
    </table>
  )
}
