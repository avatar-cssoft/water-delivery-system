import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

interface RegisterInput {
  firstName: string
  lastName: string
  middleInitial: string
  phone: string
  street: string
  barangay: string
  city: string
  province: string
  postalCode: string
  email: string
  password: string
  confirmPassword: string
}

const EMPTY: RegisterInput = {
  firstName: '',
  lastName: '',
  middleInitial: '',
  phone: '',
  street: '',
  barangay: '',
  city: '',
  province: '',
  postalCode: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function Register() {
  const [values, setValues] = useState<RegisterInput>(EMPTY)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (loading) return

    setError('')
    setMessage('')

    const requiredFields: (keyof RegisterInput)[] = [
      'firstName',
      'lastName',
      'phone',
      'street',
      'barangay',
      'city',
      'province',
      'postalCode',
      'email',
      'password',
      'confirmPassword',
    ]

    for (const field of requiredFields) {
      if (!values[field].trim()) {
        setError('Please complete all required fields.')
        return
      }
    }

    if (!/^(09\d{9}|\+639\d{9})$/.test(values.phone)) {
      setError('Enter a valid Philippine mobile number.')
      return
    }

    if (!/^\d{4}$/.test(values.postalCode)) {
      setError('Enter a valid 4-digit postal code.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      setError('Enter a valid email address.')
      return
    }

    if (values.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          data: {
            first_name: values.firstName.trim(),
            last_name: values.lastName.trim(),
            middle_initial: values.middleInitial.trim(),
            full_name: `${values.firstName.trim()} ${values.lastName.trim()}`,
            phone: values.phone.trim(),
            street: values.street.trim(),
            barangay: values.barangay.trim(),
            city: values.city.trim(),
            province: values.province.trim(),
            postal_code: values.postalCode.trim(),
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (!data.user) {
        setError('Registration failed. Please try again.')
        return
      }

      setValues(EMPTY)
      setMessage(
        'Registration successful! Please check your email if confirmation is required, then log in.',
      )
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

  return (
    <div>
      <h1>Water Delivery System</h1>
      <h2>Customer Registration</h2>

      <form onSubmit={handleRegister} noValidate>
        <h3>Personal Information</h3>

        <div>
          <label htmlFor="firstName">First Name *</label>
          <br />
          <input
            id="firstName"
            name="firstName"
            value={values.firstName}
            onChange={handleChange}
            autoComplete="given-name"
            maxLength={100}
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="lastName">Last Name *</label>
          <br />
          <input
            id="lastName"
            name="lastName"
            value={values.lastName}
            onChange={handleChange}
            autoComplete="family-name"
            maxLength={100}
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="middleInitial">Middle Initial</label>
          <br />
          <input
            id="middleInitial"
            name="middleInitial"
            value={values.middleInitial}
            onChange={handleChange}
            autoComplete="additional-name"
            maxLength={5}
          />
        </div>

        <br />

        <div>
          <label htmlFor="phone">Mobile Number *</label>
          <br />
          <input
            id="phone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={handleChange}
            autoComplete="tel"
            placeholder="09XXXXXXXXX"
            maxLength={13}
            required
          />
        </div>

        <br />

        <h3>Address Information</h3>

        <div>
          <label htmlFor="street">Street / House Number *</label>
          <br />
          <input
            id="street"
            name="street"
            value={values.street}
            onChange={handleChange}
            autoComplete="street-address"
            maxLength={255}
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="barangay">Barangay *</label>
          <br />
          <input
            id="barangay"
            name="barangay"
            value={values.barangay}
            onChange={handleChange}
            maxLength={100}
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="city">City / Municipality *</label>
          <br />
          <input
            id="city"
            name="city"
            value={values.city}
            onChange={handleChange}
            maxLength={100}
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="province">Province *</label>
          <br />
          <input
            id="province"
            name="province"
            value={values.province}
            onChange={handleChange}
            maxLength={100}
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="postalCode">Postal Code *</label>
          <br />
          <input
            id="postalCode"
            name="postalCode"
            value={values.postalCode}
            onChange={handleChange}
            inputMode="numeric"
            maxLength={4}
            required
          />
        </div>

        <br />

        <h3>Account Information</h3>

        <div>
          <label htmlFor="email">Email Address *</label>
          <br />
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            autoComplete="email"
            maxLength={255}
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="password">Password *</label>
          <br />
          <input
            id="password"
            name="password"
            type="password"
            value={values.password}
            onChange={handleChange}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="confirmPassword">Confirm Password *</label>
          <br />
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={values.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Register'}
        </button>

        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
      </form>

      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  )
}

export default Register
