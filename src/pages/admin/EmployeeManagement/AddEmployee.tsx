import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'

import { supabase } from '../../../lib/supabase'

import {
  LIMITS,
  validateRegister,
  type RegisterErrors,
  type RegisterInput,
} from '../../../lib/validation/register'

type Department = 'Management' | 'Delivery'

type EmployeeForm = RegisterInput & {
  department: Department | ''
}

const EMPTY: EmployeeForm = {
  firstName: '',
  lastName: '',
  middleInitial: '',
  phone: '',
  address: '',
  email: '',
  password: '',
  department: '',
}

function capitalizeWords(value: string) {
  return value
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (!word) return ''
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

function AddEmployee() {
  const [values, setValues] =
    useState<EmployeeForm>(EMPTY)

  const [fieldErrors, setFieldErrors] =
    useState<RegisterErrors>({})

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const field =
      e.target.name as keyof RegisterInput

    let value = e.target.value

    if (
      field === 'firstName' ||
      field === 'lastName'
    ) {
      value = capitalizeWords(value)
    }

    if (field === 'middleInitial') {
      value = value.toUpperCase()
    }

    setValues((prev) => ({
      ...prev,
      [field]: value,
    }))

    setFieldErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }))

    setError('')
  }

  const handleDepartmentChange = (
    e: ChangeEvent<HTMLSelectElement>,
  ) => {
    setValues((prev) => ({
      ...prev,
      department: e.target.value as Department | '',
    }))

    setError('')
  }

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault()

    if (saving) return

    setError('')
    setMessage('')

    const result = validateRegister(values)

    if (!result.ok) {
      setFieldErrors(result.errors)
      return
    }

    if (!values.department) {
      setError('Please select a department.')
      return
    }

    const data = result.data

    setSaving(true)

    try {
      const {
        data: { user: adminUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !adminUser) {
        setError('You must be logged in as an admin.')
        return
      }

      const {
        data: adminProfile,
        error: adminError,
      } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', adminUser.id)
        .single()

      if (
        adminError ||
        adminProfile?.role !== 'admin'
      ) {
        setError('Only admins can add employees.')
        return
      }

      const {
        data: authData,
        error: signUpError,
      } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (!authData.user) {
        setError('Could not create employee account.')
        return
      }

      const { error: profileError } =
        await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            first_name: data.firstName,
            last_name: data.lastName,
            middle_initial: data.middleInitial,
            phone: data.phone,
            address: data.address,
            role: 'employee',
            department: values.department,
          })

      if (profileError) {
        setError(profileError.message)
        return
      }

      setMessage(
        'Employee added successfully.',
      )

      setValues(EMPTY)
      setFieldErrors({})
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not add employee.',
      )
    } finally {
      setSaving(false)
    }
  }

  const errorProps = (
    field: keyof RegisterInput,
  ) => ({
    'aria-invalid': fieldErrors[field]
      ? true
      : undefined,
    'aria-describedby': fieldErrors[field]
      ? `${field}-error`
      : undefined,
  })

  const fieldError = (
    field: keyof RegisterInput,
  ) =>
    fieldErrors[field] && (
      <p id={`${field}-error`}>
        {fieldErrors[field]}
      </p>
    )

  return (
    <div>
      <h1>Add Employee</h1>

      <button
        type="button"
        onClick={() => {
          window.location.href =
            '/admin/employees'
        }}
      >
        Back to Employees
      </button>

      <hr />

      {error && <p role="alert">{error}</p>}

      {message && <p role="status">{message}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="firstName">
            First Name
          </label>

          <br />

          <input
            id="firstName"
            name="firstName"
            type="text"
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
          <label htmlFor="lastName">
            Last Name
          </label>

          <br />

          <input
            id="lastName"
            name="lastName"
            type="text"
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
          <label htmlFor="middleInitial">
            Middle Initial
          </label>

          <br />

          <input
            id="middleInitial"
            name="middleInitial"
            type="text"
            value={values.middleInitial}
            onChange={handleChange}
            maxLength={
              LIMITS.middleInitial.max
            }
            {...errorProps('middleInitial')}
          />

          {fieldError('middleInitial')}
        </div>

        <br />

        <div>
          <label htmlFor="phone">
            Phone
          </label>

          <br />

          <input
            id="phone"
            name="phone"
            type="tel"
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
          <label htmlFor="address">
            Address
          </label>

          <br />

          <input
            id="address"
            name="address"
            type="text"
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
          <label htmlFor="department">
            Department
          </label>

          <br />

          <select
            id="department"
            value={values.department}
            onChange={handleDepartmentChange}
            required
          >
            <option value="">
              Select Department
            </option>

            <option value="Management">
              Management
            </option>

            <option value="Delivery">
              Delivery
            </option>
          </select>
        </div>

        <br />

        <div>
          <label htmlFor="email">
            Email
          </label>

          <br />

          <input
            id="email"
            name="email"
            type="email"
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
          <label htmlFor="password">
            Temporary Password
          </label>

          <br />

          <input
            id="password"
            name="password"
            type="password"
            value={values.password}
            onChange={handleChange}
            minLength={LIMITS.password.min}
            required
            {...errorProps('password')}
          />

          {fieldError('password')}
        </div>

        <br />

        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? 'Adding Employee...'
            : 'Add Employee'}
        </button>

        {' '}

        <button
          type="button"
          onClick={() => {
            window.location.href =
              '/admin/employees'
          }}
          disabled={saving}
        >
          Cancel
        </button>
      </form>
    </div>
  )
}

export default AddEmployee