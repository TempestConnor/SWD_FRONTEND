import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { SignInForm } from '../features/auth/components/SignInForm'
import { appMessages } from './messages'
import { returnPath } from './returnPath'
import { useSession } from './SessionContext'

export function SignInPage() {
  const { session } = useSession().state
  const navigate = useNavigate()
  const location = useLocation()
  const from = returnPath(location.state)

  if (session) {
    return <Navigate to={from} replace />
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:py-16">
      <div className="flex flex-col gap-6 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line sm:p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{appMessages.signInPage.heading}</h1>
        <SignInForm onSignedIn={() => navigate(from, { replace: true })} />
      </div>
      <p className="text-center text-sm text-muted">
        {appMessages.signInPage.noAccount}{' '}
        <Link to="/signup" state={location.state} className="font-medium text-brand underline-offset-4 hover:underline">
          {appMessages.signInPage.toSignUp}
        </Link>
      </p>
    </main>
  )
}
