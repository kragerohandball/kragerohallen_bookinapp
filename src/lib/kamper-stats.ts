import type { MatchEventType, Punishment, ShotPosition, TechnicalFaultType } from '@prisma/client'
import { FAULT_TYPE_ORDER, SHOT_POSITION_ORDER } from './kamper-constants'

export type StatEvent = {
  type: MatchEventType
  playerId: string | null
  assistPlayerId: string | null
  faultType: TechnicalFaultType | null
  punishment: Punishment | null
  shotPosition?: ShotPosition | null
}

export type StatPlayer = {
  id: string
  name: string
  number: number | null
  isGoalkeeper: boolean
}

export type PlayerRow = {
  playerId: string
  name: string
  number: number | null
  isGoalkeeper: boolean
  goals: number
  assists: number
  shotsTotal: number
  shotsOnTarget: number
  shootingPct: number | null
  technicalFaults: number
  technicalFaultsByType: Record<TechnicalFaultType, number>
  defensiveFouls: number
  yellowCards: number
  twoMinutes: number
  redCards: number
  saves: number
  goalsConceded: number
  savePct: number | null
}

export type MatchStats = {
  ourScore: number
  opponentScore: number
  players: PlayerRow[]
}

function emptyFaultCounts(): Record<TechnicalFaultType, number> {
  const counts = {} as Record<TechnicalFaultType, number>
  for (const t of FAULT_TYPE_ORDER) counts[t] = 0
  return counts
}

function emptyRow(p: StatPlayer): PlayerRow {
  return {
    playerId: p.id,
    name: p.name,
    number: p.number,
    isGoalkeeper: p.isGoalkeeper,
    goals: 0,
    assists: 0,
    shotsTotal: 0,
    shotsOnTarget: 0,
    shootingPct: null,
    technicalFaults: 0,
    technicalFaultsByType: emptyFaultCounts(),
    defensiveFouls: 0,
    yellowCards: 0,
    twoMinutes: 0,
    redCards: 0,
    saves: 0,
    goalsConceded: 0,
    savePct: null,
  }
}

export function computeStats(events: StatEvent[], players: StatPlayer[]): MatchStats {
  const rows = new Map<string, PlayerRow>()
  for (const p of players) rows.set(p.id, emptyRow(p))

  function rowFor(playerId: string | null): PlayerRow | null {
    if (!playerId) return null
    let row = rows.get(playerId)
    if (!row) return null
    return row
  }

  let ourScore = 0
  let opponentScore = 0

  for (const e of events) {
    switch (e.type) {
      case 'GOAL': {
        ourScore++
        const scorer = rowFor(e.playerId)
        if (scorer) { scorer.goals++; scorer.shotsTotal++; scorer.shotsOnTarget++ }
        const assist = rowFor(e.assistPlayerId)
        if (assist) assist.assists++
        break
      }
      case 'SHOT_SAVED': {
        const shooter = rowFor(e.playerId)
        if (shooter) { shooter.shotsTotal++; shooter.shotsOnTarget++ }
        break
      }
      case 'SHOT_MISSED': {
        const shooter = rowFor(e.playerId)
        if (shooter) shooter.shotsTotal++
        break
      }
      case 'TECHNICAL_FAULT': {
        const player = rowFor(e.playerId)
        if (player) {
          player.technicalFaults++
          if (e.faultType) player.technicalFaultsByType[e.faultType]++
        }
        break
      }
      case 'DEFENSIVE_FOUL': {
        const player = rowFor(e.playerId)
        if (player) {
          player.defensiveFouls++
          if (e.punishment === 'YELLOW') player.yellowCards++
          else if (e.punishment === 'TWO_MIN') player.twoMinutes++
          else if (e.punishment === 'RED') player.redCards++
        }
        break
      }
      case 'SAVE': {
        const keeper = rowFor(e.playerId)
        if (keeper) keeper.saves++
        break
      }
      case 'GOAL_CONCEDED': {
        opponentScore++
        const keeper = rowFor(e.playerId)
        if (keeper) keeper.goalsConceded++
        break
      }
    }
  }

  Array.from(rows.values()).forEach(row => {
    row.shootingPct = row.shotsTotal > 0 ? Math.round((row.goals / row.shotsTotal) * 1000) / 10 : null
    const facedShots = row.saves + row.goalsConceded
    row.savePct = facedShots > 0 ? Math.round((row.saves / facedShots) * 1000) / 10 : null
  })

  return { ourScore, opponentScore, players: Array.from(rows.values()) }
}

export type PositionRow = {
  position: ShotPosition
  shots: number
  goals: number
  shootingPct: number | null
}

export function computePositionStats(events: StatEvent[]): PositionRow[] {
  const rows = new Map<ShotPosition, PositionRow>()
  for (const p of SHOT_POSITION_ORDER) rows.set(p, { position: p, shots: 0, goals: 0, shootingPct: null })

  for (const e of events) {
    if (!e.shotPosition) continue
    if (e.type !== 'GOAL' && e.type !== 'SHOT_SAVED' && e.type !== 'SHOT_MISSED') continue
    const row = rows.get(e.shotPosition)
    if (!row) continue
    row.shots++
    if (e.type === 'GOAL') row.goals++
  }

  Array.from(rows.values()).forEach(row => {
    row.shootingPct = row.shots > 0 ? Math.round((row.goals / row.shots) * 1000) / 10 : null
  })

  return Array.from(rows.values())
}
