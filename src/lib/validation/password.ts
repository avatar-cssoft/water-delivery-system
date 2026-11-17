import { LIMITS } from './register'

export const PASSWORD_MIN_LENGTH = 8

export function validateNewPassword(password: string): string | null {
  if (!password) return 'Enter a new password.'
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (new TextEncoder().encode(password).length > LIMITS.password.max) {
    return `Password must be no more than ${LIMITS.password.max} bytes.`
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
