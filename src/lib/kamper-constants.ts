import type { GoalZone, MatchEventType, Punishment, ShotPosition, TechnicalFaultType } from '@prisma/client'

export const EVENT_TYPE_LABELS: Record<MatchEventType, string> = {
  GOAL: 'Mål',
  SHOT_SAVED: 'Skudd reddet',
  SHOT_MISSED: 'Skudd utenfor',
  TECHNICAL_FAULT: 'Teknisk feil',
  DEFENSIVE_FOUL: 'Forsvarsfeil',
  GOAL_CONCEDED: 'Baklengs mål',
  SAVE: 'Redning',
  STEAL: 'Snappet ball',
  FREE_THROW_WON: 'Vunnet frikast',
}

export const FAULT_TYPE_LABELS: Record<TechnicalFaultType, string> = {
  STEPS: 'Skritt',
  CHARGING: 'Brøyt',
  DOUBLE_DRIBBLE: 'Dobbelstuss',
  PASSIVE: 'Passivt spill',
  OTHER: 'Annet',
}

export const PUNISHMENT_LABELS: Record<Punishment, string> = {
  NONE: 'Ingen',
  YELLOW: 'Gult kort',
  TWO_MIN: '2 minutter',
  RED: 'Rødt kort',
}

export const ZONE_LABELS: Record<GoalZone, string> = {
  TL: 'Øverst til venstre',
  TC: 'Øverst i midten',
  TR: 'Øverst til høyre',
  ML: 'Midt til venstre',
  MC: 'Midt i midten',
  MR: 'Midt til høyre',
  BL: 'Nederst til venstre',
  BC: 'Nederst i midten',
  BR: 'Nederst til høyre',
}

export const ZONE_ORDER: GoalZone[] = ['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR']

export const SHOT_POSITION_LABELS: Record<ShotPosition, string> = {
  LEFT_WING: 'Venstre kant',
  LEFT_BACK: 'Venstre bak',
  CENTER_BACK: 'Midtback',
  RIGHT_BACK: 'Høyre bak',
  RIGHT_WING: 'Høyre kant',
  PIVOT: 'Strek',
  SEVEN_METER: '7-meter',
  FAST_BREAK: 'Gjennombrudd/kontring',
}

export const SHOT_POSITION_ORDER: ShotPosition[] = [
  'LEFT_WING', 'LEFT_BACK', 'CENTER_BACK', 'RIGHT_BACK', 'RIGHT_WING', 'PIVOT', 'SEVEN_METER', 'FAST_BREAK',
]

export const SHOT_POSITION_SHORT: Record<ShotPosition, string> = {
  LEFT_WING: 'VK',
  LEFT_BACK: 'VB',
  CENTER_BACK: 'M',
  RIGHT_BACK: 'HB',
  RIGHT_WING: 'HK',
  PIVOT: 'S',
  SEVEN_METER: '7m',
  FAST_BREAK: 'GJ',
}

export const SHOT_POSITION_COORDS: Record<ShotPosition, { x: number; y: number }> = {
  LEFT_WING: { x: 8, y: 27 },
  LEFT_BACK: { x: 23, y: 58 },
  CENTER_BACK: { x: 50, y: 66 },
  RIGHT_BACK: { x: 77, y: 58 },
  RIGHT_WING: { x: 92, y: 27 },
  PIVOT: { x: 50, y: 24 },
  SEVEN_METER: { x: 50, y: 40 },
  FAST_BREAK: { x: 50, y: 92 },
}

export const FAULT_TYPE_ORDER: TechnicalFaultType[] = ['STEPS', 'CHARGING', 'DOUBLE_DRIBBLE', 'PASSIVE', 'OTHER']

export const PUNISHMENT_ORDER: Punishment[] = ['NONE', 'YELLOW', 'TWO_MIN', 'RED']

export const MATCH_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Ikke startet',
  LIVE: 'Pågår',
  HALFTIME: 'Pause',
  FINISHED: 'Ferdig',
}
