import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import UserAccounts from './pages/users/UserAccount'

import Admin from './pages/admin/admin'
import Products from './pages/admin/products'

function App() {
  const path = window.location.pathname

  if (path === '/register') {
    return <Register />
  }

  if (path === '/account') {
    return <UserAccounts />
  }

  if (path === '/admin') {
    return <Admin />
  }

  if (path === '/admin/products') {
    return <Products />
  }

  return <Login />
}

export default App