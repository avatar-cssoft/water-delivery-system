import { NavLink, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <>
      <nav className="nav">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/products">Products</NavLink>
        <NavLink to="/customer">Customer</NavLink>
        <NavLink to="/rider">Rider</NavLink>
        <NavLink to="/admin">Admin</NavLink>
        <NavLink to="/login">Log in</NavLink>
        <NavLink to="/register">Register</NavLink>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </>
  )
}
