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
