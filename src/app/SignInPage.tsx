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
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">{appMessages.signInPage.heading}</h1>
      <SignInForm onSignedIn={() => navigate(from, { replace: true })} />
      <p className="text-sm">
        {appMessages.signInPage.noAccount}{' '}
        <Link to="/signup" state={location.state} className="underline">
          {appMessages.signInPage.toSignUp}
        </Link>
      </p>
    </main>
  )
}
