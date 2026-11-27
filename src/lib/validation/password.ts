import { LIMITS } from './register'

export const PASSWORD_MIN_LENGTH = LIMITS.password.min
export const PASSWORD_MAX_LENGTH = LIMITS.password.max

export function validateNewPassword(password: string): string | null {
  if (!password) return 'Enter a new password.'
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Use no more than ${PASSWORD_MAX_LENGTH} characters.`
  }
  return null
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | null {
  if (!confirmation) return 'Confirm your new password.'
  if (password !== confirmation) return 'Passwords do not match.'
  return null
}
