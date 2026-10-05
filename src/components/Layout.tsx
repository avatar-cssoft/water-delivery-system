import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Layout() {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout failed:', error.message)
      return
    }

    window.location.href = '/'
  }

  return (
    <>
      <nav className="nav">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/products">Products</NavLink>
        <NavLink to="/customer">Customer</NavLink>
        <NavLink to="/rider">Rider</NavLink>
        <NavLink to="/admin">Admin</NavLink>
        <NavLink to="/account">My Account</NavLink>
        <NavLink to="/login">Log in</NavLink>
        <NavLink to="/register">Register</NavLink>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </>
  )
}
