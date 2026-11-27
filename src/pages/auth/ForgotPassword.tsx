import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { appPath } from '../../lib/navigation'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setError('')
    setMessage('')
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          // Where the link in the email sends the user
          redirectTo: window.location.origin + appPath('/reset-password'),
        },
      )

      if (resetError) {
        setError(resetError.message)
        return
      }

      // Same message whether or not the email has an account,
      // so strangers can't check who is registered.
      setMessage(
        'If an account exists for that email, we sent a link to reset your password. Check your inbox and spam folder.',
      )
      setEmail('')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Water Delivery System</h1>

      <h2>Forgot Password</h2>

      <p>Enter your email and we will send you a link to reset your password.</p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>

          <br />

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset link'}
        </button>

        {error && (
          <p style={{ color: 'red' }} role="alert">
            {error}
          </p>
        )}

        {message && <p role="status">{message}</p>}
      </form>

      <p>
        <a href={appPath('/login')}>Back to login</a>
      </p>
    </div>
  )
}

export default ForgotPassword