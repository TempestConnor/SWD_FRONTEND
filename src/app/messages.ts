/** Every string the app shell and its pages show. */
export const appMessages = {
  siteName: 'Chess',
  header: {
    localGame: 'Play on this device',
    cpuGame: 'Play the computer',
    signIn: 'Sign in',
    signUp: 'Sign up',
    signOut: 'Sign out',
    classicalRating: (rating: number) => `Classical ${rating}`,
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
