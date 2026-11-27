import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PasswordRules from '../../components/PasswordRules'
import {
  validateNewPassword,
  validatePasswordConfirmation,
} from '../../lib/validation/password'

export default function ChangePassword() {
  const [checkingAccount, setCheckingAccount] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    const verifyAccount = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (!active) return

        if (userError) {
          setAccessError(
            'We could not verify your account. Please try again or sign in again.',
          )
        } else if (!user) {
          return
        } else {
          setAuthorized(true)
        }
      } catch {
        if (active) {
          setAccessError(
            'We could not verify your account. Check your connection and try again.',
          )
        }
      } finally {
        if (active) setCheckingAccount(false)
      }
    }

    void verifyAccount()

    return () => {
      active = false
    }
  }, [])

  const currentPasswordError = currentPassword
    ? null
    : 'Enter your current password.'
  const passwordError = validateNewPassword(newPassword)
  const confirmationError = validatePasswordConfirmation(
    newPassword,
    confirmation,
  )

  const handleChange = (update: (value: string) => void, value: string) => {
    update(value)
    setError('')
    setMessage('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    setError('')
    setMessage('')

    if (
      currentPasswordError ||
      passwordError ||
      confirmationError ||
      saving
    ) {
      return
    }

    setSaving(true)

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        current_password: currentPassword,
        password: newPassword,
      })

      if (updateError) {
        const detail = updateError.message.toLowerCase()
        if (/current.?password|password.{0,20}(incorrect|invalid)/.test(detail)) {
          setError('Your current password is incorrect. Please try again.')
          return
        }
        setError(`Could not update your password. ${updateError.message}`)
        return
      }

      if (!data.user) {
        setError('We could not confirm the password update. Please try again.')
        return
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setSubmitted(false)
      setMessage('Your password has been changed.')
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? `Could not update your password. ${updateError.message}`
          : 'Could not update your password. Check your connection and try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (checkingAccount) {
    return (
      <section aria-busy="true">
        <h1>Change Password</h1>
        <p role="status">Checking your account...</p>
      </section>
    )
  }

  if (accessError) {
    return (
      <section>
        <h1>Change Password</h1>
        <p role="alert">{accessError}</p>
        <Link className="settings-action" to="/settings">
          Back to Settings
        </Link>
      </section>
    )
  }

  if (!authorized) {
    return <Navigate to="/login" replace />
  }

  return (
    <section>
      <h1>Change Password</h1>
      <p>Confirm your current password, then choose a new one.</p>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <form aria-label="Change password" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) =>
              handleChange(setCurrentPassword, event.target.value)
            }
            aria-invalid={submitted && Boolean(currentPasswordError)}
            aria-describedby={
              submitted && currentPasswordError
                ? 'current-password-error'
                : undefined
            }
            disabled={saving}
            required
          />
          {submitted && currentPasswordError && (
            <p id="current-password-error" role="alert">
              {currentPasswordError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) =>
              handleChange(setNewPassword, event.target.value)
            }
            aria-invalid={submitted && Boolean(passwordError)}
            aria-describedby={submitted && passwordError ? 'new-password-error' : undefined}
            disabled={saving}
            required
          />
          <PasswordRules password={newPassword} />
          {submitted && passwordError && (
            <p id="new-password-error" role="alert">
              {passwordError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) =>
              handleChange(setConfirmation, event.target.value)
            }
            aria-invalid={submitted && Boolean(confirmationError)}
            aria-describedby={
              submitted && confirmationError
                ? 'confirm-password-error'
                : undefined
            }
            disabled={saving}
            required
          />
          {submitted && confirmationError && (
            <p id="confirm-password-error" role="alert">
              {confirmationError}
            </p>
          )}
        </div>

        <button type="submit" disabled={saving}>
          {saving ? 'Updating password...' : 'Update password'}
        </button>
      </form>

      <p>
        <Link className="settings-action" to="/settings">
          Back to Settings
        </Link>
      </p>
    </section>
  )
}
