import { Link, Navigate, useNavigate } from 'react-router'
import { SignInForm } from '../features/auth/components/SignInForm'
import { appMessages } from './messages'
import { useSession } from './SessionContext'

export function SignInPage() {
  const { session } = useSession().state
  const navigate = useNavigate()

  if (session) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">{appMessages.signInPage.heading}</h1>
      <SignInForm onSignedIn={() => navigate('/', { replace: true })} />
      <p className="text-sm">
        {appMessages.signInPage.noAccount}{' '}
        <Link to="/signup" className="underline">
          {appMessages.signInPage.toSignUp}
        </Link>
      </p>
    </main>
  )
}
