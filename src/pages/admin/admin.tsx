
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function Admin() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/'
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, role')
        .eq('id', user.id)
        .single()

      if (error || data?.role !== 'admin') {
        window.location.href = '/'
        return
      }

      setName(`${data.first_name} ${data.last_name}`)
      setLoading(false)
    }

    getProfile()
  }, [])

  if (loading) {
    return <p>Loading...</p>
  }

  return (
    <div>
      <h1>Water Delivery System</h1>

      <h2>Admin Dashboard</h2>

      <p>Welcome, {name}!</p>

      <hr />

      <h3>Admin Controls</h3>

      <div>
        <button
          onClick={() => {
            window.location.href = '/admin/products'
          }}
        >
          Products
        </button>

        <button
          onClick={() => {
            window.location.href = '/admin/employees'
          }}
        >
          Employees
        </button>

        <button
          onClick={() => {
            window.location.href = '/admin/users'
          }}
        >
          Users
        </button>

        <button
          onClick={() => {
            window.location.href = '/admin/orders'
          }}
        >
          Orders
        </button>

        <button
          onClick={() => {
            window.location.href = '/admin/ai'
          }}
        >
          AI Assistant
        </button>
      </div>

      <hr />

      <h3>Coming Soon</h3>

      <p>More admin features will be added here.</p>
    </div>
  )
}

export default Admin

