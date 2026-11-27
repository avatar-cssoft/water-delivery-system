import { LIMITS } from './register'

export const PASSWORD_MIN_LENGTH = LIMITS.password.min
export const PASSWORD_MAX_LENGTH = LIMITS.password.max

export type PasswordRule = {
  id: string
  label: string
  passed: boolean
}

const COMPLEXITY_RULES = [
  {
    id: 'uppercase',
    label: 'At least 1 uppercase letter (A-Z)',
    error: 'Include at least 1 uppercase letter.',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'At least 1 lowercase letter (a-z)',
    error: 'Include at least 1 lowercase letter.',
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'At least 1 number (0-9)',
    error: 'Include at least 1 number.',
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    id: 'special',
    label: 'At least 1 special character (! @ # $ % ...)',
    error: 'Include at least 1 special character.',
    test: (password: string) => /[^A-Za-z0-9\s]/.test(password),
  },
]

/** The checklist shown to the user while they type. */
export function getPasswordRules(password: string): PasswordRule[] {
  return [
    {
      id: 'length',
      label: `${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`,
      passed:
        password.length >= PASSWORD_MIN_LENGTH &&
        password.length <= PASSWORD_MAX_LENGTH,
    },
    ...COMPLEXITY_RULES.map((rule) => ({
      id: rule.id,
      label: rule.label,
      passed: rule.test(password),
    })),
  ]
}

export function validateNewPassword(password: string): string | null {
  if (!password) return 'Enter a new password.'
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Use no more than ${PASSWORD_MAX_LENGTH} characters.`
  }
  const failed = COMPLEXITY_RULES.find((rule) => !rule.test(password))
  return failed ? failed.error : null
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | null {
  if (!confirmation) return 'Confirm your new password.'
  if (password !== confirmation) return 'Passwords do not match.'
  return null
}