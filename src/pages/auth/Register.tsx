
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { LIMITS } from '../../lib/validation/register'

function Register() {
  const [email, setEmail] = useState('')
  const [sentEmail, setSentEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (loading) return

    setError('')

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      setError('Email address is required.')
      return
    }

    if (
      cleanEmail.length > LIMITS.email.max ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      setError('Enter a valid email address.')
      return
    }

    setLoading(true)

    try {
      const redirectUrl = new URL(
        `${import.meta.env.BASE_URL}get-started`,
        window.location.origin,
      ).href

      const { error: signUpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      setSentEmail(cleanEmail)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (sentEmail) {
    return (
      <div>
        <h1>Water Delivery System</h1>
        <h2>Check your email</h2>

        <div role="status">
          <p>We've sent a verification link to:</p>
          <p><strong>{sentEmail}</strong></p>

          <p>
            Click the link in your email to verify your email
            address and continue setting up your account.
          </p>
        </div>

        <p>
          Didn't receive the email? Check your spam or junk folder.
        </p>

        <button
          type="button"
          onClick={() => {
            setSentEmail('')
            setError('')
          }}
        >
          Use a different email
        </button>

        <p>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1>Water Delivery System</h1>
      <h2>Customer Registration</h2>

      <form onSubmit={handleRegister} noValidate>
        <div>
          <label htmlFor="email">Email Address *</label>
          <br />

          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="Enter your email address"
            maxLength={LIMITS.email.max}
            disabled={loading}
            required
          />
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading ? 'Sending verification email...' : 'Register'}
        </button>

        {error && <p role="alert">{error}</p>}
      </form>

      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  )
}

export default Register
