/** Every string the app shell and its pages show. */
export const appMessages = {
  siteName: 'Chess',
  header: {
    localGame: 'Play on this device',
    cpuGame: 'Play the computer',
    invite: 'Invite a friend',
    matchHistory: 'Match history',
    signIn: 'Sign in',
    signUp: 'Sign up',
    signOut: 'Sign out',
    classicalRating: (rating: number) => `Classical ${rating}`,
  },
  gameRating: {
    modes: { CLASSICAL: 'Classical' } as Partial<Record<string, string>>,
    rated: (mode: string, rating: number) => `Rated game. Your ${mode} rating is now ${rating}.`,
    draw: (mode: string, rating: number) => `Draws do not change ratings. Your ${mode} rating is ${rating}.`,
    unrated: 'This game was unrated, so ratings did not change.',
  },
  signInPage: {
    heading: 'Sign in',
    noAccount: 'New here?',
    toSignUp: 'Create an account',
  },
  signUpPage: {
    heading: 'Sign up',
    haveAccount: 'Already have an account?',
    toSignIn: 'Go to sign in',
  },
}
