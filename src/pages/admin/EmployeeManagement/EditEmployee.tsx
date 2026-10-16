import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Employee = {
  id: string
  first_name: string
  last_name: string
  middle_initial: string
  phone: string
  address: string
  department: 'Management' | 'Delivery' | null
}

function EditEmployee() {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [redirect, setRedirect] = useState(false)

  const employeeId = new URLSearchParams(
    window.location.search,
  ).get('id')

  useEffect(() => {
    if (!employeeId) {
      return
    }

    let cancelled = false

    const loadEmployee = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        if (!cancelled) {
          setRedirect(true)
          setLoading(false)
        }

        return
      }

      const { data: adminProfile, error: adminError } =
        await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

      if (adminError || adminProfile?.role !== 'admin') {
        if (!cancelled) {
          setRedirect(true)
          setLoading(false)
        }

        return
      }

      const { data, error: employeeError } =
        await supabase
          .from('profiles')
          .select(
            'id, first_name, last_name, middle_initial, phone, address, department',
          )
          .eq('id', employeeId)
          .eq('role', 'employee')
          .single()

      if (employeeError || !data) {
        if (!cancelled) {
          setError('Employee not found.')
          setLoading(false)
        }

        return
      }

      if (!cancelled) {
        setEmployee(data)
        setLoading(false)
      }
    }

    void loadEmployee()

    return () => {
      cancelled = true
    }
  }, [employeeId])

  useEffect(() => {
    if (redirect) {
      window.location.href = '/'
    }
  }, [redirect])

  const capitalizeWords = (value: string) => {
    return value
      .toLowerCase()
      .split(' ')
      .map((word) => {
        if (!word) {
          return ''
        }

        return (
          word.charAt(0).toUpperCase() +
          word.slice(1)
        )
      })
      .join(' ')
  }

  const handleChange = (
    field: keyof Employee,
    value: string,
  ) => {
    if (!employee) {
      return
    }

    setEmployee({
      ...employee,
      [field]: value,
    })
  }

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault()

    if (!employee) {
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: capitalizeWords(
          employee.first_name.trim(),
        ),
        last_name: capitalizeWords(
          employee.last_name.trim(),
        ),
        middle_initial: employee.middle_initial
          .trim()
          .toUpperCase(),
        phone: employee.phone.trim(),
        address: employee.address.trim(),
        department: employee.department,
      })
      .eq('id', employee.id)
      .eq('role', 'employee')

    setSaving(false)

    if (updateError) {
      console.error(updateError)
      setError('Could not update employee.')
      return
    }

    setMessage('Employee updated successfully.')

    setTimeout(() => {
      window.location.href = '/admin/employees'
    }, 1000)
  }

  if (!employeeId) {
    return <p>Employee ID is missing.</p>
  }

  if (loading) {
    return <p>Loading employee...</p>
  }

  if (!employee) {
    return (
      <p>{error || 'Employee not found.'}</p>
    )
  }

  return (
    <div>
      <h1>Edit Employee</h1>

      {error && <p>{error}</p>}

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="first_name">
            First Name
          </label>

          <input
            id="first_name"
            type="text"
            value={employee.first_name}
            onChange={(e) =>
              handleChange(
                'first_name',
                e.target.value,
              )
            }
            required
          />
        </div>

        <div>
          <label htmlFor="last_name">
            Last Name
          </label>

          <input
            id="last_name"
            type="text"
            value={employee.last_name}
            onChange={(e) =>
              handleChange(
                'last_name',
                e.target.value,
              )
            }
            required
          />
        </div>

        <div>
          <label htmlFor="middle_initial">
            Middle Initial
          </label>

          <input
            id="middle_initial"
            type="text"
            maxLength={1}
            value={employee.middle_initial}
            onChange={(e) =>
              handleChange(
                'middle_initial',
                e.target.value,
              )
            }
          />
        </div>

        <div>
          <label htmlFor="phone">
            Phone
          </label>

          <input
            id="phone"
            type="text"
            value={employee.phone}
            onChange={(e) =>
              handleChange(
                'phone',
                e.target.value,
              )
            }
            required
          />
        </div>

        <div>
          <label htmlFor="address">
            Address
          </label>

          <input
            id="address"
            type="text"
            value={employee.address}
            onChange={(e) =>
              handleChange(
                'address',
                e.target.value,
              )
            }
            required
          />
        </div>

        <div>
          <label htmlFor="department">
            Department
          </label>

          <select
            id="department"
            value={employee.department || ''}
            onChange={(e) =>
              handleChange(
                'department',
                e.target.value,
              )
            }
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

        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? 'Saving...'
            : 'Save Changes'}
        </button>

        {' '}

        <button
          type="button"
          onClick={() => {
            window.location.href =
              '/admin/employees'
          }}
        >
          Cancel
        </button>
      </form>
    </div>
  )
}

export default EditEmployee