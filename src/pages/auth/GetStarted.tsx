
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { LIMITS, validateName } from '../../lib/validation/register'
import { validateNewPassword } from '../../lib/validation/password'
import PasswordRules from '../../components/PasswordRules'

function GetStarted() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [checking, setChecking] = useState(true)
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const firstNameResult = validateName(firstName, 'First name')
  const lastNameResult = validateName(lastName, 'Last name')
  const passwordError = validateNewPassword(password)

  useEffect(() => {
    let active = true

    async function checkAccount() {
      try {
        const { data: { user }, error: authError } =
          await supabase.auth.getUser()

        if (!active) return

        if (authError || !user || !user.email_confirmed_at) {
          setError('Please verify your email address first.')
          return
        }

        const { data: profile, error: profileError } =
          await supabase
            .from('profiles')
            .select('role, department')
            .eq('id', user.id)
            .maybeSingle()

        if (!active) return

        if (profileError) {
          setError('Unable to check your account information.')
          return
        }

        // Existing accounts do not need to register again.
        if (profile) {
          if (profile.role === 'admin') {
            navigate('/admin', { replace: true })
          } else if (profile.role === 'employee') {
            navigate(
              profile.department === 'Delivery'
                ? '/driver'
                : '/employee',
              { replace: true },
            )
          } else if (
            profile.role === 'customer' ||
            profile.role === 'user'
          ) {
            navigate('/customerHome', { replace: true })
          } else {
            setError('Your account role is not recognized.')
          }

          return
        }

        setEmail(user.email ?? '')
        setVerified(true)

      } catch {
        if (active) {
          setError('Unable to verify your account. Please try again.')
        }
      } finally {
        if (active) setChecking(false)
      }
    }

    void checkAccount()

    return () => {
      active = false
    }
  }, [navigate])

  const handleCompleteSignup = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault()

    if (loading || !verified) return

    setSubmitted(true)
    setError('')

    if (
      firstNameResult.error ||
      lastNameResult.error ||
      passwordError
    ) {
      return
    }

    setLoading(true)

    try {
      // Set the password before creating the profile.
      const { error: passwordUpdateError } =
        await supabase.auth.updateUser({
          password,
        })

      if (passwordUpdateError) {
        setError(passwordUpdateError.message)
        return
      }

      // Create the customer profile through the database function.
      const { error: signupError } =
        await supabase.rpc('complete_signup', {
          p_first_name: firstNameResult.value,
          p_last_name: lastNameResult.value,
        })

      if (signupError) {
        setError(
          'Unable to complete your account. Please try again.',
        )
        return
      }

      // Reload the application so the navigation recognizes
      // the newly created customer profile.
      window.location.replace(
        new URL(
          `${import.meta.env.BASE_URL}customerHome`,
          window.location.origin,
        ).href,
      )

    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return <p>Verifying your account...</p>
  }

  if (!verified) {
    return (
      <div>
        <h1>Water Delivery System</h1>
        <h2>Account Verification</h2>

        {error && <p role="alert">{error}</p>}

        <Link to="/register">Back to Registration</Link>
      </div>
    )
  }

  return (
    <div>
      <h1>Water Delivery System</h1>
      <h2>Let's get you started!</h2>

      <p>Your email address has been verified.</p>
      <p><strong>{email}</strong></p>

      <p>
        Complete your account by entering your name
        and creating a password.
      </p>

      <form onSubmit={handleCompleteSignup} noValidate>
        <div>
          <label htmlFor="firstName">First Name *</label>
          <br />

          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            placeholder="Enter your first name"
            maxLength={LIMITS.name.max}
            disabled={loading}
            required
          />

          {submitted && firstNameResult.error && (
            <p style={{ color: 'red' }} role="alert">
              {firstNameResult.error}
            </p>
          )}
        </div>

        <br />

        <div>
          <label htmlFor="lastName">Last Name *</label>
          <br />

          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            placeholder="Enter your last name"
            maxLength={LIMITS.name.max}
            disabled={loading}
            required
          />

          {submitted && lastNameResult.error && (
            <p style={{ color: 'red' }} role="alert">
              {lastNameResult.error}
            </p>
          )}
        </div>

        <br />

        <div>
          <label htmlFor="password">Password *</label>
          <br />

          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Create a password"
            disabled={loading}
            required
          />

          <br />

          <label>
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />{' '}
            Show password
          </label>

          <PasswordRules password={password} />

          {submitted && passwordError && (
            <p style={{ color: 'red' }} role="alert">
              {passwordError}
            </p>
          )}
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading ? 'Creating your account...' : 'Complete Registration'}
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

export default GetStarted
