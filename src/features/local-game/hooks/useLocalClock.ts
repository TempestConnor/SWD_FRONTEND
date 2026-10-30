import { useEffect, useEffectEvent, useState } from 'react'
import { remainingAfterElapsed, sideKey, type RemainingMs } from '../clock'
import type { Side } from '../storage'

const TICK_MS = 100

type LocalClockArgs = {
  /** Remaining time when the current turn started; null when the clock is disabled. */
  remaining: RemainingMs | null
  sideToMove: Side
  running: boolean
  turnStartedAt: number
  onTick: (remaining: RemainingMs) => void
  onTimeout: (side: Side) => void
}

/** The remaining time to display, ticking down for the side to move while the clock runs. */
export function useLocalClock({ remaining, sideToMove, running, turnStartedAt, onTick, onTimeout }: LocalClockArgs) {
  const [now, setNow] = useState(Date.now)

  const tick = useEffectEvent(() => {
    if (!remaining) {
      return
    }
    const time = Date.now()
    setNow(time)
    const current = remainingAfterElapsed(remaining, sideToMove, time - turnStartedAt)
    if (current[sideKey(sideToMove)] <= 0) {
      onTimeout(sideToMove)
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

  if (!remaining || !running) {
    return remaining
  }
  return remainingAfterElapsed(remaining, sideToMove, now - turnStartedAt)
}
