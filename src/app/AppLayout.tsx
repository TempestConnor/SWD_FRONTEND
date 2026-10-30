import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import type { Session } from '../api/session'
import { useCurrentAccountQuery } from '../features/auth/hooks/useCurrentAccountQuery'
import { Button } from '../shared/ui/Button'
import { appMessages } from './messages'
import { useSession } from './SessionContext'

export function AppLayout() {
  const { session } = useSession().state

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-lg bg-brand text-lg leading-none text-white"
            >
              ♞
            </span>
            {appMessages.siteName}
          </Link>
          <div className="order-last -mx-1 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1">
            <NavItem to="/local">{appMessages.header.localGame}</NavItem>
            <NavItem to="/cpu">{appMessages.header.cpuGame}</NavItem>
            {session ? (
              <>
                <NavItem to="/play">{appMessages.header.playOnline}</NavItem>
                <NavItem to="/invite">{appMessages.header.invite}</NavItem>
                <NavItem to="/history">{appMessages.header.matchHistory}</NavItem>
              </>
            ) : null}
          </div>
          <div className="ml-auto">{session ? <AccountMenu session={session} /> : <GuestMenu />}</div>
        </nav>
      </header>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}

type NavItemProps = { to: string; children: ReactNode }

function NavItem({ to, children }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
          isActive ? 'bg-brand-soft text-brand-strong' : 'text-muted hover:bg-paper hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function GuestMenu() {
  return (
    <div className="flex items-center gap-2">
      <Link to="/signin" className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:text-ink">
        {appMessages.header.signIn}
      </Link>
      <Link
        to="/signup"
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-strong"
      >
        {appMessages.header.signUp}
      </Link>
    </div>
  )
}

type AccountMenuProps = { session: Session }

function AccountMenu({ session }: AccountMenuProps) {
  const { signOut } = useSession().actions
  // Ratings change after rated games, so prefer the server's copy over the one stored at sign-in.
  const account = useCurrentAccountQuery(true).data ?? session.account
  const rating = account.ratings?.find((entry) => entry.mode === 'CLASSICAL')?.rating

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end leading-tight">
        <span className="text-sm font-semibold">{account.displayName}</span>
        {rating === undefined ? null : (
          <span className="text-xs text-muted">{appMessages.header.classicalRating(rating)}</span>
        )}
      </div>
      <Button variant="secondary" size="sm" onClick={signOut}>
        {appMessages.header.signOut}
      </Button>
    </div>
  )
}
