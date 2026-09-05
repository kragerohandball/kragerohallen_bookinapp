type ClockState = {
  clockRunning: boolean
  clockStartedAt: Date | null
  accumulatedSeconds: number
}

export function elapsedSeconds(m: ClockState, now: Date = new Date()): number {
  if (m.clockRunning && m.clockStartedAt) {
    return m.accumulatedSeconds + Math.floor((now.getTime() - m.clockStartedAt.getTime()) / 1000)
  }
  return m.accumulatedSeconds
}

export function currentMinute(m: ClockState, now: Date = new Date()): number {
  return Math.floor(elapsedSeconds(m, now) / 60) + 1
}
