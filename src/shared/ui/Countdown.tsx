import { useEffect, useState } from 'react'
import { formatClock } from '../lib/clock'

type CountdownProps = {
  /** ISO instant the countdown runs to; the server decides what happens there, this only displays it. */
  until: string | undefined
  label: (remaining: string) => string
}

/** Time left until a server deadline as minutes and seconds, never below 0:00. */
export function Countdown({ until, label }: CountdownProps) {
  const now = useNow()
  const remainingMs = until ? Date.parse(until) - now : 0

  return <p className="text-sm text-muted">{label(formatClock(remainingMs))}</p>
}

/** The current time, refreshed every second. */
function useNow() {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [])

  return now
}
