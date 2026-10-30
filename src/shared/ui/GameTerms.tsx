import type { ClockSettings } from '../lib/clock'
import { sharedUiMessages } from './messages'

const messages = sharedUiMessages.terms

type GameTermsProps = {
  rated: boolean
  clock: ClockSettings | undefined
}

/** Whether a game is rated and its time control, as the backend reports them. */
export function GameTerms({ rated, clock }: GameTermsProps) {
  return (
    <ul className="flex flex-wrap gap-2 text-sm">
      <li className="rounded bg-gray-100 px-2 py-1">{rated ? messages.rated : messages.unrated}</li>
      <li className="rounded bg-gray-100 px-2 py-1">
        {clock?.enabled
          ? messages.clock(clock.initialMinutes ?? 0, clock.incrementSeconds ?? 0)
          : messages.noClock}
      </li>
    </ul>
  )
}
