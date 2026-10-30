/** Every string the auth feature shows. Components contain no literal copy. */
export const authMessages = {
  fields: {
    email: 'Email',
    password: 'Password',
    displayName: 'Display name',
    signupSkill: 'Skill level',
  },
  skills: {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
    EXPERT: 'Expert',
  },
  actions: {
    signIn: 'Sign in',
    createAccount: 'Create account',
  },
  errors: {
    EMAIL_ALREADY_REGISTERED: 'An account with this email already exists.',
    DISPLAY_NAME_TAKEN: 'This display name is already taken.',
    PASSWORD_TOO_LONG: 'Password is too long.',
    INVALID_CREDENTIALS: 'Email or password is incorrect.',
  },
}
