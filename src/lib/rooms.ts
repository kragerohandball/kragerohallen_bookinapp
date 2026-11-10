// Felles romoppsett – brukes både i nettleseren og på serveren.

export type RoomConfig = {
  id: string
  name: string
  capacity: number
  description: string
  openHour: number // første time som kan bookes (0–23)
  closeHour: number // siste sluttid (1–24)
  /** Ukedager som kan bookes (0 = søndag … 6 = lørdag). Udefinert = alle dager. */
  allowedWeekdays?: number[]
  /** Bane-navn i banedagboken på handball.no, brukes til kampsynk. */
  banedagbokPlace?: string
}

const HALL_DAYS = [3, 5, 6, 0] // onsdag, fredag, lørdag, søndag

export const ROOMS: RoomConfig[] = [
  {
    id: 'room-kafeen',
    name: 'Kaféen',
    capacity: 50,
    description: 'Plass til 50 personer • Stor TV',
    openHour: 8,
    closeHour: 22,
  },
  {
    id: 'room-trykkerommet',
    name: 'Trykkerommet',
    capacity: 8,
    description: 'Plass til 8 personer',
    openHour: 8,
    closeHour: 22,
  },
  {
    id: 'room-ny-hall',
    name: 'Ny hall',
    capacity: 0,
    description: 'Bane 1 • Ons, fre, lør og søn – hele døgnet',
    openHour: 0,
    closeHour: 24,
    allowedWeekdays: HALL_DAYS,
    banedagbokPlace: 'Kragerøhallen bane 1',
  },
  {
    id: 'room-gammel-hall',
    name: 'Gammel hall',
    capacity: 0,
    description: 'Bane 2 • Ons, fre, lør og søn – hele døgnet',
    openHour: 0,
    closeHour: 24,
    allowedWeekdays: HALL_DAYS,
    banedagbokPlace: 'Kragerøhallen bane 2',
  },
]

export function getRoom(id: string): RoomConfig | undefined {
  return ROOMS.find(r => r.id === id)
}

/** Ukedag (0 = søndag) for en dato på formen YYYY-MM-DD. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay()
}

export function isDayAllowed(room: RoomConfig, date: string): boolean {
  return !room.allowedWeekdays || room.allowedWeekdays.includes(weekdayOf(date))
}

export function roomHours(room: RoomConfig): number[] {
  return Array.from({ length: room.closeHour - room.openHour }, (_, i) => room.openHour + i)
}

const DAY_NAMES = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']

export function allowedDaysText(room: RoomConfig): string {
  if (!room.allowedWeekdays) return 'alle dager'
  return room.allowedWeekdays.map(d => DAY_NAMES[d]).join(', ')
}

/** Felles validering for nye bookinger. Returnerer feilmelding eller null. */
export function validateBookingRequest(roomId: string, date: string, startHour: number, endHour: number): string | null {
  const room = getRoom(roomId)
  if (!room) return 'Ukjent rom'
  if (!Number.isInteger(startHour) || !Number.isInteger(endHour)) return 'Ugyldig tidspunkt'
  if (startHour < room.openHour || endHour > room.closeHour || startHour >= endHour) return 'Ugyldig tidspunkt'
  if (!isDayAllowed(room, date)) return `${room.name} kan bare bookes på ${allowedDaysText(room)}`
  return null
}
