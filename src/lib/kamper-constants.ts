import type { GoalZone, MatchEventType, Punishment, TechnicalFaultType } from '@prisma/client'

export const EVENT_TYPE_LABELS: Record<MatchEventType, string> = {
  GOAL: 'Mål',
  SHOT_SAVED: 'Skudd reddet',
  SHOT_MISSED: 'Skudd utenfor',
  TECHNICAL_FAULT: 'Teknisk feil',
  DEFENSIVE_FOUL: 'Forsvarsfeil',
  GOAL_CONCEDED: 'Baklengs mål',
  SAVE: 'Redning',
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

export const FAULT_TYPE_ORDER: TechnicalFaultType[] = ['STEPS', 'CHARGING', 'DOUBLE_DRIBBLE', 'PASSIVE', 'OTHER']

export const PUNISHMENT_ORDER: Punishment[] = ['NONE', 'YELLOW', 'TWO_MIN', 'RED']

export const MATCH_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Ikke startet',
  LIVE: 'Pågår',
  HALFTIME: 'Pause',
  FINISHED: 'Ferdig',
}
