import { Link, Navigate, useNavigate } from 'react-router'
import { SignUpForm } from '../features/auth/components/SignUpForm'
import { appMessages } from './messages'
import { useSession } from './SessionContext'

export function SignUpPage() {
  const { session } = useSession().state
  const navigate = useNavigate()

  if (session) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">{appMessages.signUpPage.heading}</h1>
      <SignUpForm onSignedUp={() => navigate('/', { replace: true })} />
      <p className="text-sm">
        {appMessages.signUpPage.haveAccount}{' '}
        <Link to="/signin" className="underline">
          {appMessages.signUpPage.toSignIn}
        </Link>
      </p>
    </main>
  )
}
