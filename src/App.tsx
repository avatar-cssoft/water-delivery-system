
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import UserAccounts from './pages/users/UserAccount'
//admin imports
import Admin from './pages/admin/admin'
import Products from './pages/admin/products'
//employee imports
import Employee from './pages/admin/EmployeeManagement/Employee'
import AddEmployee from './pages/admin/EmployeeManagement/AddEmployee'
import EditEmployee from './pages/admin/EmployeeManagement/EditEmployee'
import EmployeeHome from './pages/employees/Employee'
//user imports
import CustomerHome from './pages/customer/CustomerHome'
import Catalog from './pages/customer/Catalog'
import Cart from './pages/customer/Cart'
import Checkout from './pages/customer/Checkout'

function App() {
  const path = window.location.pathname

  if (path === '/register') {
    return <Register />
  }

  if (path === '/account') {
    return <UserAccounts />
  }

  if (path === '/customerHome') {
    return <CustomerHome />
  }

  if (path === '/catalog') {
    return <Catalog />
  }

  if (path === '/cart') {
    return <Cart />
  }

  if (path === '/admin') {
    return <Admin />
  }

  if (path === '/admin/products') {
    return <Products />
  }

  if (path === '/admin/employees') {
    return <Employee />
  }

  if (path === '/admin/employees/add') {
    return <AddEmployee />
  }

  if (path === '/admin/employees/edit') {
    return <EditEmployee />
  }

  if (path === '/employee') {
    return <EmployeeHome />
  }
  if (path === '/checkout') {
    return <Checkout />
  }
  return <Login />
}

export default App
