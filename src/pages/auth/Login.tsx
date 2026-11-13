
import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { appPath } from '../../lib/navigation'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      // Authenticate user
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (loginError) {
        setError(loginError.message)
        return
      }

      // Retrieve the user's role and department
      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('role, department')
          .eq('id', data.user.id)
          .single()

      if (profileError || !profile) {
        setError('Unable to retrieve your account information.')
        await supabase.auth.signOut()
        return
      }

      // Redirect based on account role
      if (profile.role === 'admin') {
        window.location.href = appPath('/admin')
        return
      }

      // Separate Management and Delivery employees
      if (profile.role === 'employee') {

        // Management Department
        if (profile.department === 'Management') {
          window.location.href = appPath('/employee')
          return
        }

        // Delivery Department (Drivers)
        if (profile.department === 'Delivery') {
          window.location.href = appPath('/driver')
          return
        }

        // Department not recognized
        setError('Your employee department is not recognized.')
        await supabase.auth.signOut()
        return
      }

      // Customer account
      if (profile.role === 'customer' || profile.role === 'user') {
        window.location.href = appPath('/customerHome')
        return
      }

      // Unknown role
      setError('Your account role is not recognized.')
      await supabase.auth.signOut()

    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Water Delivery System</h1>

      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">
            Email
          </label>

          <br />

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="password">
            Password
          </label>

          <br />

          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <br />

        <button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        {error && (
          <p style={{ color: 'red' }} role="alert">
            {error}
          </p>
        )}
      </form>

      <p>
        Don't have an account?{' '}
        <a href={appPath('/register')}>
          Register
        </a>
      </p>
    </div>
  )
}

export default Login
