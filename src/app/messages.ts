/** Every string the app shell and its pages show. */
export const appMessages = {
  siteName: 'Chess',
  home: {
    tagline: 'Play over the board, against the computer, or online with a rating that follows you.',
    modesHeading: 'Choose how to play',
    modes: {
      local: { title: 'Pass and play', description: 'Two players share one board on this device.' },
      cpu: { title: 'Challenge the engine', description: 'Pick a difficulty and a colour, then play the computer.' },
      online: { title: 'Find an opponent', description: 'Rated classical 30+10 against a player near your rating.' },
      friend: { title: 'Play a friend', description: 'Send a private link and play on your own terms.' },
      join: { title: 'Play online', description: 'Create a free account to get a rating and play other people.' },
    },
  },
  header: {
    localGame: 'Play on this device',
    cpuGame: 'Play the computer',
    playOnline: 'Play online',
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
