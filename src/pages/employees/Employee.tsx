import { useEffect, useState } from 'react'

import { supabase } from '../../lib/supabase'

type Employee = {
  first_name: string
  last_name: string
  department: 'Management' | 'Delivery' | null
}

function EmployeeHome() {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getEmployee = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/'
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, department')
        .eq('id', user.id)
        .eq('role', 'employee')
        .single()

      if (error || !data) {
        window.location.href = '/'
        return
      }

      setEmployee(data)
      setLoading(false)
    }

    getEmployee()
  }, [])

  if (loading) {
    return <p>Loading...</p>
  }

  if (!employee) {
    return <p>Employee not found.</p>
  }

  return (
    <div>
      <h1>Employee Dashboard</h1>

      <p>
        <strong>Name:</strong>{' '}
        {employee.first_name} {employee.last_name}
      </p>

      <p>
        <strong>Department:</strong>{' '}
        {employee.department || 'Not assigned'}
      </p>
    </div>
  )
}

export default EmployeeHome