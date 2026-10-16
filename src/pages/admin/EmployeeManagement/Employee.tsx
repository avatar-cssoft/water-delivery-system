import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Employee = {
  id: string
  first_name: string
  last_name: string
  middle_initial: string | null
  phone: string | null
  address: string | null
  role: string
  department: 'Management' | 'Delivery' | null
}

function Employee() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [redirect, setRedirect] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadEmployees = async () => {
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

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

      if (profileError || profile?.role !== 'admin') {
        if (!cancelled) {
          setRedirect(true)
          setLoading(false)
        }

        return
      }

      const {
        data,
        error: employeesError,
      } = await supabase
        .from('profiles')
        .select(
          'id, first_name, last_name, middle_initial, phone, address, role, department',
        )
        .eq('role', 'employee')
        .order('last_name')

      if (employeesError) {
        console.error(employeesError)

        if (!cancelled) {
          setError('Could not load employees.')
          setLoading(false)
        }

        return
      }

      if (!cancelled) {
        setEmployees(data || [])
        setLoading(false)
      }
    }

    void loadEmployees()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (redirect) {
      window.location.href = '/'
    }
  }, [redirect])

  const getFilteredEmployees = () => {
    const searchText = search.toLowerCase()

    return employees.filter((employee) => {
      const fullName =
        `${employee.first_name} ${employee.last_name}`.toLowerCase()

      const phone = (
        employee.phone || ''
      ).toLowerCase()

      const address = (
        employee.address || ''
      ).toLowerCase()

      const department = (
        employee.department || ''
      ).toLowerCase()

      return (
        fullName.includes(searchText) ||
        phone.includes(searchText) ||
        address.includes(searchText) ||
        department.includes(searchText)
      )
    })
  }

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this employee?',
    )

    if (!confirmed) {
      return
    }

    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)
      .eq('role', 'employee')

    if (deleteError) {
      console.error(deleteError)
      setError('Could not delete employee.')
      return
    }

    setEmployees((currentEmployees) =>
      currentEmployees.filter(
        (employee) => employee.id !== id,
      ),
    )
  }

  const filteredEmployees =
    getFilteredEmployees()

  if (loading) {
    return <p>Loading employees...</p>
  }

  return (
    <div>
      <h1>Employee Management</h1>

      {error && <p>{error}</p>}

      <button
        type="button"
        onClick={() => {
          window.location.href =
            '/admin/employees/add'
        }}
      >
        Add Employee
      </button>

      <br />
      <br />

      <input
        type="text"
        placeholder="Search employees..."
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
      />

      <br />
      <br />

      {filteredEmployees.length === 0 ? (
        <p>No employees found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredEmployees.map(
              (employee) => (
                <tr key={employee.id}>
                  <td>
                    {employee.first_name}{' '}
                    {employee.middle_initial
                      ? `${employee.middle_initial}. `
                      : ''}
                    {employee.last_name}
                  </td>

                  <td>
                    {employee.phone || 'N/A'}
                  </td>

                  <td>
                    {employee.address || 'N/A'}
                  </td>

                  <td>
                    {employee.department ||
                      'Not assigned'}
                  </td>

                  <td>
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = `/admin/employees/edit?id=${employee.id}`
                      }}
                    >
                      Edit
                    </button>

                    {' '}

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(employee.id)
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}

      <br />

      <button
        type="button"
        onClick={() => {
          window.location.href = '/admin'
        }}
      >
        Back to Admin
      </button>
    </div>
  )
}

export default Employee