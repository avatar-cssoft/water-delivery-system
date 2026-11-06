import { useEffect, useState } from 'react'

import { getCurrentUserRole } from '../../lib/api/auth'
import { supabase } from '../../lib/supabase'
import { appPath } from '../../lib/navigation'

function Admin() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const role = await getCurrentUserRole()

        if (role === null) {
          window.location.href = appPath('/login')
          return
        }

        if (role !== 'admin') {
          window.location.href = appPath('/')
          return
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          window.location.href = appPath('/')
          return
        }

        const {
          data,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single()

        if (profileError || !data) {
          setError('Could not load your profile.')
          return
        }

        setName(`${data.first_name} ${data.last_name}`)
      } catch (err: unknown) {
        console.error(err)

        setError(
          err instanceof Error
            ? err.message
            : 'Could not verify admin access.',
        )
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [])

  const handleLogout = async () => {
    const { error: logoutError } =
      await supabase.auth.signOut()

    if (logoutError) {
      setError('Could not log out.')
      return
    }

    window.location.href = appPath('/')
  }

  if (loading) {
    return <p>Checking admin access...</p>
  }

  if (error) {
    return (
      <div>
        <h1>Admin</h1>

        <p>{error}</p>

        <button
          type="button"
          onClick={() => {
            window.location.href = appPath('/login')
          }}
        >
          Back to Login
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1>Water Delivery System</h1>

      <h2>Admin Dashboard</h2>

      <p>Welcome, {name}!</p>

      <button
        type="button"
        onClick={handleLogout}
      >
        Logout
      </button>

      <hr />

      <h3>Admin Controls</h3>

      <div className="admin-controls">
        <button
          type="button"
          onClick={() => {
            window.location.href =
              appPath('/admin/products')
          }}
        >
          Products
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.href =
              appPath('/admin/employees')
          }}
        >
          Employees
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.href =
              appPath('/admin/users')
          }}
        >
          Users
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.href =
              appPath('/admin/orders')
          }}
        >
          Orders
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.href =
              appPath('/admin/ai')
          }}
        >
          AI Assistant
        </button>
      </div>

      <hr />

      <h3>Coming Soon</h3>

      <p>
        More admin features will be added here.
      </p>
    </div>
  )
}

export default Admin