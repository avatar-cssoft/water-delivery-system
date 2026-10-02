import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  LIMITS,
  validateRegister,
  type RegisterErrors,
  type RegisterInput,
} from '../../lib/validation/register'

const EMPTY: RegisterInput = {
  firstName: '',
  lastName: '',
  middleInitial: '',
  phone: '',
  address: '',
  email: '',
  password: '',
}

function Register() {
  const [values, setValues] = useState<RegisterInput>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const field = e.target.name as keyof RegisterInput
    setValues((prev) => ({ ...prev, [field]: e.target.value }))
    // Clear a field's error as soon as the user edits it.
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return

    setError('')
    setMessage('')

    const result = validateRegister(values)
    if (!result.ok) {
      setFieldErrors(result.errors)
      return
    }
    const data = result.data

    setLoading(true)

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          first_name: data.firstName,
          last_name: data.lastName,
          middle_initial: data.middleInitial,
          phone: data.phone,
          address: data.address,
          role: 'user',
        })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    setValues(EMPTY)
    setMessage('Registration successful! You can now log in.')
    setLoading(false)
  }

  // Shared props for each field's error message and its accessibility wiring.
  const errorProps = (field: keyof RegisterInput) => ({
    'aria-invalid': fieldErrors[field] ? true : undefined,
    'aria-describedby': fieldErrors[field] ? `${field}-error` : undefined,
  })

  const fieldError = (field: keyof RegisterInput) =>
    fieldErrors[field] && <p id={`${field}-error`}>{fieldErrors[field]}</p>

  return (
    <div>
      <h1>Water Delivery System</h1>

      <h2>Register</h2>

      <form onSubmit={handleRegister} noValidate>

        <div>
          <label htmlFor="firstName">First Name</label>
          <br />
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            value={values.firstName}
            onChange={handleChange}
            maxLength={LIMITS.name.max}
            required
            {...errorProps('firstName')}
          />
          {fieldError('firstName')}
        </div>

        <br />

        <div>
          <label htmlFor="lastName">Last Name</label>
          <br />
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            value={values.lastName}
            onChange={handleChange}
            maxLength={LIMITS.name.max}
            required
            {...errorProps('lastName')}
          />
          {fieldError('lastName')}
        </div>

        <br />

        <div>
          <label htmlFor="middleInitial">Middle Initial</label>
          <br />
          <input
            id="middleInitial"
            name="middleInitial"
            type="text"
            autoComplete="additional-name"
            value={values.middleInitial}
            onChange={handleChange}
            maxLength={LIMITS.middleInitial.max}
            {...errorProps('middleInitial')}
          />
          {fieldError('middleInitial')}
        </div>

        <br />

        <div>
          <label htmlFor="phone">Phone</label>
          <br />
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0912 345 6789"
            value={values.phone}
            onChange={handleChange}
            maxLength={LIMITS.phone.max}
            required
            {...errorProps('phone')}
          />
          {fieldError('phone')}
        </div>

        <br />

        <div>
          <label htmlFor="address">Address</label>
          <br />
          <input
            id="address"
            name="address"
            type="text"
            autoComplete="street-address"
            value={values.address}
            onChange={handleChange}
            maxLength={LIMITS.address.max}
            required
            {...errorProps('address')}
          />
          {fieldError('address')}
        </div>

        <br />

        <div>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
            maxLength={LIMITS.email.max}
            required
            {...errorProps('email')}
          />
          {fieldError('email')}
        </div>

        <br />

        <div>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange}
            minLength={LIMITS.password.min}
            required
            {...errorProps('password')}
          />
          {fieldError('password')}
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>

        {error && <p>{error}</p>}
        {message && <p>{message}</p>}
      </form>

      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  )
}

export default Register
