
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

import { appPath } from '../../../lib/navigation'

type Department = 'Management' | 'Delivery'

type AddressField =
  | 'street'
  | 'barangay'
  | 'city'
  | 'province'
  | 'postalCode'

type AddressErrors = Partial<Record<AddressField, string>>

type EmployeeForm = Omit<RegisterInput, 'address'> &
  Record<AddressField, string> & {
    department: Department | ''
  }

const EMPTY: EmployeeForm = {
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
  department: '',
}

const ADDRESS_FIELDS: {
  name: AddressField
  label: string
  max: number
  inputMode?: 'numeric'
}[] = [
  { name: 'street', label: 'Street / House Number', max: 255 },
  { name: 'barangay', label: 'Barangay', max: 100 },
  { name: 'city', label: 'City / Municipality', max: 100 },
  { name: 'province', label: 'Province', max: 100 },
  {
    name: 'postalCode',
    label: 'Postal Code',
    max: 4,
    inputMode: 'numeric',
  },
]

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

function validateAddress(values: EmployeeForm): AddressErrors {
  const errors: AddressErrors = {}

  for (const f of ADDRESS_FIELDS) {
    if (!values[f.name].trim()) {
      errors[f.name] = `${f.label} is required.`
    }
  }

  if (
    !errors.postalCode &&
    !/^\d{4}$/.test(values.postalCode.trim())
  ) {
    errors.postalCode = 'Enter a valid 4-digit postal code.'
  }

  return errors
}

function AddEmployee() {
  const [values, setValues] = useState<EmployeeForm>(EMPTY)

  const [fieldErrors, setFieldErrors] =
    useState<RegisterErrors>({})

  const [addressErrors, setAddressErrors] =
    useState<AddressErrors>({})

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const field = e.target.name as keyof EmployeeForm

    let value = e.target.value

    if (field === 'firstName' || field === 'lastName') {
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

    setAddressErrors((prev) => ({
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (saving) return

    setError('')
    setMessage('')

    const street = values.street.trim()
    const barangay = values.barangay.trim()
    const city = values.city.trim()
    const province = values.province.trim()
    const postalCode = values.postalCode.trim()

    const combinedAddress = [
      street,
      barangay,
      city,
      province,
      postalCode,
    ]
      .filter(Boolean)
      .join(', ')

    const result = validateRegister({
      ...values,
      address: combinedAddress,
    })

    const addrErrs = validateAddress(values)

    if (!result.ok || Object.keys(addrErrs).length > 0) {
      setFieldErrors(result.ok ? {} : result.errors)
      setAddressErrors(addrErrs)
      return
    }

    if (!values.department) {
      setError('Please select a department.')
      return
    }

    const data = result.data

    setSaving(true)

    try {
      // Check whether an admin is currently logged in.
      const {
        data: { user: adminUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !adminUser) {
        setError('You must be logged in as an admin.')
        return
      }

      // Check the logged-in user's role.
      const { data: adminProfile, error: adminError } =
        await supabase
          .from('profiles')
          .select('role')
          .eq('id', adminUser.id)
          .single()

      if (adminError || adminProfile?.role !== 'admin') {
        setError('Only admins can add employees.')
        return
      }

      // Call the Supabase Edge Function to create the employee.
      const { data: employeeResult, error: employeeError } =
        await supabase.functions.invoke('create-employee', {
          body: {
            firstName: data.firstName,
            lastName: data.lastName,
            middleInitial: data.middleInitial,
            phone: data.phone,

            street,
            barangay,
            city,
            province,
            postalCode,

            email: data.email,
            password: data.password,
            department: values.department,
          },
        })

      if (employeeError) {
        setError(employeeError.message)
        return
      }

      if (employeeResult?.error) {
        setError(employeeResult.error)
        return
      }

      // The database trigger creates the profile and address.
      // Do not manually insert into profiles here.
      setMessage('Employee added successfully.')

      setValues(EMPTY)
      setFieldErrors({})
      setAddressErrors({})
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

  const errorProps = (field: keyof RegisterInput | AddressField) => {
    const msg =
      fieldErrors[field as keyof RegisterInput] ??
      addressErrors[field as AddressField]

    return {
      'aria-invalid': msg ? true : undefined,
      'aria-describedby': msg ? `${field}-error` : undefined,
    }
  }

  const fieldError = (field: keyof RegisterInput | AddressField) => {
    const msg =
      fieldErrors[field as keyof RegisterInput] ??
      addressErrors[field as AddressField]

    return msg && <p id={`${field}-error`}>{msg}</p>
  }

  return (
    <div>
      <h1>Add Employee</h1>

      <button
        type="button"
        onClick={() => {
          window.location.href = appPath('/admin/employees')
        }}
      >
        Back to Employees
      </button>

      <hr />

      {error && <p role="alert">{error}</p>}

      {message && <p role="status">{message}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <h3>Personal Information</h3>

        <div>
          <label htmlFor="firstName">First Name</label>
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
          <label htmlFor="lastName">Last Name</label>
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
          <label htmlFor="middleInitial">Middle Initial</label>
          <br />
          <input
            id="middleInitial"
            name="middleInitial"
            type="text"
            value={values.middleInitial}
            onChange={handleChange}
            maxLength={LIMITS.middleInitial.max}
            {...errorProps('middleInitial')}
          />
          {fieldError('middleInitial')}
        </div>

        <br />

        <div>
          <label htmlFor="phone">Mobile Number</label>
          <br />
          <input
            id="phone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={handleChange}
            maxLength={LIMITS.phone.max}
            placeholder="09XXXXXXXXX"
            required
            {...errorProps('phone')}
          />
          {fieldError('phone')}
        </div>

        <br />

        <h3>Address Information</h3>

        {ADDRESS_FIELDS.map((f) => (
          <div key={f.name}>
            <div>
              <label htmlFor={f.name}>{f.label}</label>
              <br />
              <input
                id={f.name}
                name={f.name}
                type="text"
                value={values[f.name]}
                onChange={handleChange}
                inputMode={f.inputMode}
                maxLength={f.max}
                required
                {...errorProps(f.name)}
              />
              {fieldError(f.name)}
            </div>
            <br />
          </div>
        ))}

        <h3>Employment Information</h3>

        <div>
          <label htmlFor="department">Department</label>
          <br />
          <select
            id="department"
            value={values.department}
            onChange={handleDepartmentChange}
            required
          >
            <option value="">Select Department</option>
            <option value="Management">Management</option>
            <option value="Delivery">Delivery</option>
          </select>
        </div>

        <br />

        <h3>Account Information</h3>

        <div>
          <label htmlFor="email">Email Address</label>
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
          <label htmlFor="password">Temporary Password</label>
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

        <button type="submit" disabled={saving}>
          {saving ? 'Adding Employee...' : 'Add Employee'}
        </button>

        {' '}

        <button
          type="button"
          onClick={() => {
            window.location.href = appPath('/admin/employees')
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
