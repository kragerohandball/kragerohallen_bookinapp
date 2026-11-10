import { fromZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Oslo'

function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Tidspunkt i norsk tid. hour = 24 gir midnatt neste dag. */
export function osloDate(date: string, hour: number, minute = 0): Date {
  if (hour >= 24) return osloDate(nextDay(date), hour - 24, minute)
  return fromZonedTime(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`, TZ)
}

export function osloStartOfDay(date: string): Date {
  return fromZonedTime(`${date}T00:00:00`, TZ)
}

export function osloEndOfDay(date: string): Date {
  return fromZonedTime(`${date}T23:59:59`, TZ)
}
