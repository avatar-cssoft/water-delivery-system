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

  // Read the role on load, and again whenever someone signs in or out without
  // a page reload (e.g. sign-up, or signing out in another tab).
  useEffect(() => {
    let cancelled = false
    // Only the newest request may set the role, so a slow older one can't
    // overwrite it.
    let latest = 0

    const loadRole = () => {
      const request = ++latest

      getCurrentUserRole()
        .then((r) => {
          if (!cancelled && request === latest) setRole(toNavRole(r))
        })
        .catch(() => {
          if (!cancelled && request === latest) setRole('signed-in')
        })
    }

    loadRole()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Supabase says not to call its other methods inside this callback,
        // so load the role right after it returns.
        setTimeout(loadRole, 0)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
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
