import { useEffect, useEffectEvent, useState } from 'react'
import { msAfterElapsed } from '../../../shared/lib/clock'

const TICK_MS = 100

type CpuClockArgs = {
  /** The player's remaining time when their turn started; null when the clock is disabled. */
  remainingMs: number | null
  running: boolean
  turnStartedAt: number
  onTick: (remainingMs: number) => void
  onTimeout: () => void
}

/** The player's remaining time to display, ticking down while their clock runs. The CPU has no clock. */
export function useCpuClock({ remainingMs, running, turnStartedAt, onTick, onTimeout }: CpuClockArgs) {
  const [now, setNow] = useState(Date.now)

  const tick = useEffectEvent(() => {
    if (remainingMs === null) {
      return
    }
    const time = Date.now()
    setNow(time)
    const current = msAfterElapsed(remainingMs, time - turnStartedAt)
    if (current <= 0) {
      onTimeout()
    } else {
      onTick(current)
    }
  })

  useEffect(() => {
    if (!running) {
      return
    }
    const id = setInterval(tick, TICK_MS)
    return () => clearInterval(id)
  }, [running])

  if (remainingMs === null || !running) {
    return remainingMs
  }
  return msAfterElapsed(remainingMs, now - turnStartedAt)
}
