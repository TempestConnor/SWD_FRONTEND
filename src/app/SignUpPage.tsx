import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { SignUpForm } from '../features/auth/components/SignUpForm'
import { appMessages } from './messages'
import { returnPath } from './returnPath'
import { useSession } from './SessionContext'

export function SignUpPage() {
  const { session } = useSession().state
  const navigate = useNavigate()
  const location = useLocation()
  const from = returnPath(location.state)

  if (session) {
    return <Navigate to={from} replace />
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">{appMessages.signUpPage.heading}</h1>
      <SignUpForm onSignedUp={() => navigate(from, { replace: true })} />
      <p className="text-sm">
        {appMessages.signUpPage.haveAccount}{' '}
        <Link to="/signin" state={location.state} className="underline">
          {appMessages.signUpPage.toSignIn}
        </Link>
      </p>
    </main>
  )
}
