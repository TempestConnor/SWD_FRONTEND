import { useEffect, useEffectEvent } from 'react'
import { opponent, toSide } from '../../../shared/lib/chess'
import { Countdown } from '../../../shared/ui/Countdown'
import type { OnlineGame } from '../api'
import { onlineGameMessages as messages } from '../messages'

/** A started game's reconnection grace, counted from the player's last contact (BR-GAME-015). */
const GRACE_MS = 3 * 60_000

type OpponentConnectionProps = {
  game: OnlineGame
  /** Called once when the opponent's grace has run out; the server, not this countdown, decides the forfeit. */
  onGraceEnd: () => void
}

/** Tells the viewer that the opponent has lost connection and how long they have to return (F11). */
export function OpponentConnection({ game, onGraceEnd }: OpponentConnectionProps) {
  const away = opponent(toSide(game.viewerColor)) === 'WHITE' ? game.white : game.black
  const lastSeen = game.status === 'ACTIVE' ? away?.disconnectedAt : undefined
  const graceEnd = useEffectEvent(onGraceEnd)

  useEffect(() => {
    if (!lastSeen) {
      return
    }
    const timer = setTimeout(graceEnd, Math.max(0, Date.parse(lastSeen) + GRACE_MS - Date.now()))
    return () => clearTimeout(timer)
  }, [lastSeen])

  if (!lastSeen) {
    return null
  }
  const name = away?.displayName ?? ''
  return (
    <Countdown
      until={new Date(Date.parse(lastSeen) + GRACE_MS).toISOString()}
      label={(remaining) => messages.opponentDisconnected(name, remaining)}
    />
  )
}
