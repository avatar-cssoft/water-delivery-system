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
    <nav className="nav">
      <a href="/">Home</a>
      {' '}

      <a href="/products">Products</a>
      {' '}

      <a href="/customer">Customer</a>
      {' '}

      <a href="/rider">Rider</a>
      {' '}

      <a href="/admin">Admin</a>
      {' '}

      <a href="/account">My Account</a>
      {' '}

      <a href="/login">Log in</a>
      {' '}

      <a href="/register">Register</a>
      {' '}

      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </nav>
  )
}