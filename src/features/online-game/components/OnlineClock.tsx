import { useEffect, useEffectEvent, useState } from 'react'
import { sideKey } from '../../../shared/lib/clock'
import type { Side } from '../../../shared/lib/chess'
import { Clock } from '../../../shared/ui/Clock'
import type { OnlineGame } from '../api'
import { liveRemaining, runningMs, runningSide } from '../clock'
import { onlineGameMessages as messages } from '../messages'

type OnlineClockProps = {
  game: OnlineGame
  side: Side
  /** Called once when this clock shows zero; the server, not this clock, decides the timeout. */
  onFlagFall: () => void
}

/**
 * One player's clock as the server's remaining time and turn start imply (BR-MOVE-005). Only the running
 * clock re-renders, on each whole second it shows, so its last tick lands on the flag fall.
 */
export function OnlineClock({ game, side, onFlagFall }: OnlineClockProps) {
  const [now, setNow] = useState(Date.now)
  const running = runningSide(game) === side
  const storedMs = side === 'WHITE' ? game.whiteRemainingMs : game.blackRemainingMs
  const turnStartedAt = game.turnStartedAt
  const flagFall = useEffectEvent(onFlagFall)

  useEffect(() => {
    if (!running || storedMs == null || !turnStartedAt) {
      return
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = (at: number) => {
      const ms = runningMs(storedMs, turnStartedAt, at)
      if (ms === 0) {
        flagFall()
      } else {
        timer = setTimeout(tick, ms % 1000 || 1000)
      }
    }
    const tick = () => {
      const at = Date.now()
      setNow(at)
      schedule(at)
    }
    schedule(Date.now())
    return () => clearTimeout(timer)
  }, [running, storedMs, turnStartedAt])

  const remaining = liveRemaining(game, now)
  if (!remaining) {
    return null
  }
  return <Clock label={messages.clock(side)} ms={remaining[sideKey(side)]} active={running} />
}
