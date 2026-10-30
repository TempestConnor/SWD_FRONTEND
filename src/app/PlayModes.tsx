import { Link } from 'react-router'
import { appMessages } from './messages'
import { useSession } from './SessionContext'

const messages = appMessages.home

type Mode = { to: string; icon: string; title: string; description: string }

/** The home page's ways to start a game; online play needs an account. */
export function PlayModes() {
  const { session } = useSession().state
  const modes: Mode[] = [
    { to: '/local', icon: '♙', ...messages.modes.local },
    { to: '/cpu', icon: '♜', ...messages.modes.cpu },
    ...(session
      ? [
          { to: '/play', icon: '♛', ...messages.modes.online },
          { to: '/invite', icon: '♞', ...messages.modes.friend },
        ]
      : [{ to: '/signup', icon: '♛', ...messages.modes.join }]),
  ]

  return (
    <section aria-labelledby="play-modes" className="mt-14 flex flex-col gap-4">
      <h2 id="play-modes" className="font-display text-2xl font-semibold tracking-tight">
        {messages.modesHeading}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {modes.map((mode) => (
          <li key={mode.to}>
            <Link
              to={mode.to}
              className="group flex h-full flex-col gap-3 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand/40"
            >
              <span
                aria-hidden="true"
                className="grid size-11 place-items-center rounded-xl bg-brand-soft text-2xl text-brand-strong transition-colors group-hover:bg-brand group-hover:text-white"
              >
                {mode.icon}
              </span>
              <span className="font-semibold">{mode.title}</span>
              <span className="text-sm text-muted">{mode.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
