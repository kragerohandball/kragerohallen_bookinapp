import { fromZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Oslo'

function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Tidspunkt i norsk tid. hour kan være desimal (8.5 = 08:30). hour = 24 gir midnatt neste dag. */
export function osloDate(date: string, hour: number, minute = 0): Date {
  const totalMinutes = Math.round(hour * 60) + minute
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h >= 24) return osloDate(nextDay(date), h - 24, m)
  return fromZonedTime(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`, TZ)
}

export function osloStartOfDay(date: string): Date {
  return fromZonedTime(`${date}T00:00:00`, TZ)
}

export function osloEndOfDay(date: string): Date {
  return fromZonedTime(`${date}T23:59:59`, TZ)
}
