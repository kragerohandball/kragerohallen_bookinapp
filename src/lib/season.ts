export function getSeasonForDate(date: Date): string {
  const y = date.getFullYear()
  const month = date.getMonth() + 1 // 1-12
  return month >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`
}
