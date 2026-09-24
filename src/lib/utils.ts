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

export function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => i + 8) // 8..21

export function toLocalDateString(date: Date): string {
  return date.toLocaleDateString('nb-NO', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

export function formatTime(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}
