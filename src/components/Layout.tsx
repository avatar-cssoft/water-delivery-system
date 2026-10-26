import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useNavRole } from './useNavRole'
//BrankMark image = PLACEHOLDER FOR NOW
import brandMarkImage from '../assets/icons/BrandMark-Placeholder.jpg'

export default function Layout() {
  const role = useNavRole()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout failed:', error.message)
      return
    }

    window.location.href = '/'
  }

  // ROLE-BASED NAVIGATION

  const signedIn = role !== 'checking' && role !== 'guest'
  // The cart lives in localStorage, so guests can fill it before logging in.
  const showCart = role === 'guest' || role === 'customer'
  // Customers and employees get their own page as Home. Admins keep the public
  // Home, since their dashboard is a set of tools, linked separately.
  const homePath =
    role === 'customer' ? '/customerHome' : role === 'employee' ? '/employee' : '/'

  // Hiding a link only tidies the nav; pages still check access themselves.
  return (
    <>
      <header className="site-header">
        <nav className="site-nav" aria-label="Main">

          <span className="brand">
            <span className="brand-mark" aria-hidden="true">
              <img src={brandMarkImage} alt="" />
            </span>

            Water Delivery
          </span>
          <div className="nav-links">
            <NavLink to={homePath} end>
              Home
            </NavLink>
            <NavLink to="/catalog">Products</NavLink>
            {showCart && <NavLink to="/cart">Cart</NavLink>}
            {role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
            {signedIn && <NavLink to="/account">My Account</NavLink>}
            {role === 'guest' && <NavLink to="/login">Log in</NavLink>}
            {role === 'guest' && (
              <NavLink to="/register" className="nav-cta">
                Register
              </NavLink>
            )}
            {signedIn && (
              <button className="nav-logout" type="button" onClick={handleLogout}>
                Logout
              </button>
            )}
          </div>
        </nav>
      </header>
      {/* A div, not <main>: some pages render their own <main>. */}
      <div className="main">
        <Outlet />
      </div>
    </>
  )
}
