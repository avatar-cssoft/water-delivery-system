import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { appPath } from '../../lib/navigation'
import {
  PASSWORD_MAX_LENGTH,
  validateNewPassword,
  validatePasswordConfirmation,
} from '../../lib/validation/password'

function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Clicking the email link signs the user in temporarily so they can
    // set a new password. Wait for that session before showing the form.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true)
        setChecking(false)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      setChecking(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const validationError =
      validateNewPassword(password) ||
      validatePasswordConfirmation(password, confirmPassword)

    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      setSuccess(true)

      // Sign out so the user logs in again with the new password.
      await supabase.auth.signOut()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div>
        <h1>Water Delivery System</h1>
        <p>Checking your reset link...</p>
      </div>
    )
  }

  if (success) {
    return (
      <div>
        <h1>Water Delivery System</h1>
        <h2>Password Updated</h2>
        <p role="status">Your password has been changed. You can now log in.</p>
        <p>
          <a href={appPath('/login')}>Go to login</a>
        </p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div>
        <h1>Water Delivery System</h1>
        <h2>Reset Password</h2>
        <p role="alert" style={{ color: 'red' }}>
          This reset link is invalid or has expired.
        </p>
        <p>
          <a href={appPath('/forgot-password')}>Request a new link</a>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1>Water Delivery System</h1>

      <h2>Reset Password</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="new-password">New password</label>

          <br />

          <input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="confirm-password">Confirm new password</label>

          <br />

          <input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            required
          />
        </div>

        <br />

        <label>
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />{' '}
          Show password
        </label>

        <p>Password must be 8 to 15 characters.</p>

        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Reset password'}
        </button>

        {error && (
          <p style={{ color: 'red' }} role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}

export default ResetPassword