// Felles romoppsett – brukes både i nettleseren og på serveren.

export type RoomConfig = {
  id: string
  name: string
  capacity: number
  description: string
  openHour: number // første time som kan bookes (0–23)
  closeHour: number // siste sluttid (1–24)
  /** Egne åpningstider for enkelte ukedager (0 = søndag): [fra, til]. */
  dayHours?: Partial<Record<number, [number, number]>>
  /** Ukedager som kan bookes (0 = søndag … 6 = lørdag). Udefinert = alle dager. */
  allowedWeekdays?: number[]
  /** Bane-navn i banedagboken på handball.no, brukes til kampsynk. */
  banedagbokPlace?: string
}

const HALL_DAYS = [3, 5, 6, 0] // onsdag, fredag, lørdag, søndag
const NY_HALL_HOURS: Partial<Record<number, [number, number]>> = {
  3: [18, 22], // onsdag 18–22
  5: [17, 22], // fredag 17–22
  6: [9, 22],  // lørdag 09–22
  0: [9, 22],  // søndag 09–22
}

const GAMMEL_HALL_HOURS: Partial<Record<number, [number, number]>> = {
  3: [20, 22], // onsdag 20–22
  5: [20, 22], // fredag 20–22
  6: [20, 22], // lørdag 20–22
  0: [20, 22], // søndag 20–22
}

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
    description: 'Bane 1 • Ons 18–22 • Fre 17–22 • Lør og søn 09–22',
    openHour: 0,
    closeHour: 22,
    dayHours: NY_HALL_HOURS,
    allowedWeekdays: HALL_DAYS,
    banedagbokPlace: 'Kragerøhallen bane 1',
  },
  {
    id: 'room-gammel-hall',
    name: 'Gammel hall',
    capacity: 0,
    description: 'Bane 2 • Ons, Fre, Lør og søn 20–22',
    openHour: 0,
    closeHour: 22,
    dayHours: GAMMEL_HALL_HOURS,
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

/** Åpningstid for rommet en gitt dato (uten dato: standardtidene). */
export function hoursFor(room: RoomConfig, date?: string | null): { open: number; close: number } {
  const special = date ? room.dayHours?.[weekdayOf(date)] : undefined
  return special ? { open: special[0], close: special[1] } : { open: room.openHour, close: room.closeHour }
}

/** Timene (starttid) som kan bookes. */
export function roomHours(room: RoomConfig, date?: string | null): number[] {
  const { open, close } = hoursFor(room, date)
  return Array.from({ length: close - open }, (_, i) => open + i)
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
  const { open, close } = hoursFor(room, date)
  if (startHour < open || endHour > close || startHour >= endHour) {
    return `${room.name} kan bookes ${String(open).padStart(2, '0')}:00–${String(close).padStart(2, '0')}:00 denne dagen`
  }
  if (!isDayAllowed(room, date)) return `${room.name} kan bare bookes på ${allowedDaysText(room)}`
  return null
}
