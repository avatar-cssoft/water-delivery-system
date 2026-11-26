import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useNavRole } from './useNavRole'
import brandLogoImage from '../assets/icons/logo.png'
import { appPath } from '../lib/navigation'

export default function Layout() {
  const { role, department } = useNavRole()
  const [checkoutComplete, setCheckoutComplete] = useState(false)

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout failed:', error.message)
      return
    }

    window.location.href = appPath('/')
  }

  // ROLE-BASED NAVIGATION

  const signedIn = role !== 'checking' && role !== 'guest'
  const showCatalog = role === 'customer'
  const showCart = role === 'customer'
  // Point the primary navigation item at the dashboard for the current role.
  const homePath =
    role === 'admin'
      ? '/admin'
      : role === 'customer'
        ? '/customerHome'
        : role === 'employee'
          ? department === 'Delivery'
            ? '/driver'
            : '/employee'
          : '/'
  const homeLabel = 'Home'

  // Navigation visibility is backed by route guards for customer-only pages.
  return (
    <div className="app-shell">
      <header
        className={`site-header${checkoutComplete ? ' site-header--hidden' : ''}`}
        aria-hidden={checkoutComplete}
      >
        <nav className="site-nav" aria-label="Main">
          <NavLink className="brand" to={homePath} aria-label="Water Delivery home">
            <img className="brand-logo" src={brandLogoImage} alt="" />
          </NavLink>
          <div className="auth-links" aria-label="Account">
            {role === 'guest' && <NavLink to="/login">Log in</NavLink>}
            {role === 'guest' && (
              <NavLink to="/register" className="nav-cta">
                Register
              </NavLink>
            )}
            {signedIn && <NavLink to="/account">My Account</NavLink>}
            {signedIn && (
              <button className="nav-logout" type="button" onClick={handleLogout}>
                Logout
              </button>
            )}
          </div>
          <div className="nav-links">
            <NavLink to={homePath} end>
              {homeLabel}
            </NavLink>
            {showCatalog && <NavLink to="/catalog">Products</NavLink>}
            {showCart && <NavLink to="/cart">Cart</NavLink>}
            {role === 'customer' && <NavLink to="/orders">My orders</NavLink>}
            <NavLink to="/settings">Settings</NavLink>
          </div>
        </nav>
      </header>
      {/* A div, not <main>: some pages render their own <main>. */}
      <div className="main">
        <Outlet context={{ setCheckoutComplete }} />
      </div>
      {!checkoutComplete && (
        <footer className="site-footer">
          <div className="site-footer-content">
            <span>© {new Date().getFullYear()} Water Delivery</span>
            <nav aria-label="Footer">
              <NavLink to={homePath}>{homeLabel}</NavLink>
              {showCatalog && <NavLink to="/catalog">Products</NavLink>}
            </nav>
          </div>
        </footer>
      )}
    </div>
  )
}
