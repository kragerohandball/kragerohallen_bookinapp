import { fromZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Oslo'

export function osloDate(date: string, hour: number): Date {
  return fromZonedTime(`${date}T${String(hour).padStart(2, '0')}:00:00`, TZ)
}

export function osloStartOfDay(date: string): Date {
  return fromZonedTime(`${date}T00:00:00`, TZ)
}

export function osloEndOfDay(date: string): Date {
  return fromZonedTime(`${date}T23:59:59`, TZ)
}
