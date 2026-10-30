import { Link, Outlet } from 'react-router'
import type { Session } from '../api/session'
import { useCurrentAccountQuery } from '../features/auth/hooks/useCurrentAccountQuery'
import { Button } from '../shared/ui/Button'
import { appMessages } from './messages'
import { useSession } from './SessionContext'

export function AppLayout() {
  const { session } = useSession().state

  return (
    <>
      <header className="border-b border-gray-200">
        <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4 p-4">
          <Link to="/" className="text-lg font-bold">
            {appMessages.siteName}
          </Link>
          {session ? <AccountMenu session={session} /> : <GuestMenu />}
        </nav>
      </header>
      <Outlet />
    </>
  )
}

function GuestMenu() {
  return (
    <div className="flex items-center gap-4">
      <Link to="/signin" className="underline">
        {appMessages.header.signIn}
      </Link>
      <Link to="/signup" className="underline">
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
    <div className="flex items-center gap-4">
      <span className="font-medium">{account.displayName}</span>
      {rating === undefined ? null : (
        <span className="text-sm text-gray-600">{appMessages.header.classicalRating(rating)}</span>
      )}
      <Button onClick={signOut}>{appMessages.header.signOut}</Button>
    </div>
  )
}
