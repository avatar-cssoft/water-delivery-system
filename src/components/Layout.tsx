import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { getCurrentUserRole } from '../lib/api/auth'
import { supabase } from '../lib/supabase'

// 'checking' until the role loads, 'guest' when nobody is signed in, and
// 'signed-in' when the role is unknown or couldn't be loaded.
type NavRole = 'checking' | 'guest' | 'customer' | 'rider' | 'admin' | 'signed-in'

function toNavRole(role: string | null): NavRole {
  if (role === null) return 'guest'
  if (role === 'admin') return 'admin'
  // Login.tsx sends 'employee' to the rider page; src/types uses 'rider'.
  if (role === 'employee' || role === 'rider') return 'rider'
  if (role === 'user' || role === 'customer') return 'customer'
  return 'signed-in'
}

export default function Layout() {
  const [role, setRole] = useState<NavRole>('checking')

  // Login and logout both reload the page, so the role is only read on load.
  useEffect(() => {
    let cancelled = false

    getCurrentUserRole()
      .then((r) => {
        if (!cancelled) setRole(toNavRole(r))
      })
      .catch(() => {
        if (!cancelled) setRole('signed-in')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout failed:', error.message)
      return
    }

    window.location.href = '/'
  }

  const signedIn = role !== 'checking' && role !== 'guest'

  // Hiding a link only tidies the nav; pages still check access themselves.
  return (
    <>
      <nav className="nav">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/products">Products</NavLink>
        {role === 'customer' && <NavLink to="/customer">Customer</NavLink>}
        {role === 'rider' && <NavLink to="/rider">Rider</NavLink>}
        {role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        {signedIn && <NavLink to="/account">My Account</NavLink>}
        {role === 'guest' && <NavLink to="/login">Log in</NavLink>}
        {role === 'guest' && <NavLink to="/register">Register</NavLink>}
        {signedIn && (
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        )}
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </>
  )
}
