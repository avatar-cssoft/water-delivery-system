
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import AddressLogbook from './pages/users/AddressLogbook'
import UserAccounts from './pages/users/UserAccount'

// Admin imports
import Admin from './pages/admin/admin'
import Products from './pages/admin/products'
import Employee from './pages/admin/EmployeeManagement/Employee'
import AddEmployee from './pages/admin/EmployeeManagement/AddEmployee'
import EditEmployee from './pages/admin/EmployeeManagement/EditEmployee'

// Employee imports
import EmployeeHome from './pages/employees/Employee'
import Orders from './pages/employees/Orders'

// Customer imports
import CustomerHome from './pages/customer/CustomerHome'
import Catalog from './pages/customer/Catalog'
import Cart from './pages/customer/Cart'
import Checkout from './pages/customer/Checkout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* Home and authentication */}
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />

          {/* User account */}
          <Route path="account" element={<UserAccounts />} />
          <Route path="account/address-logbook" element={<AddressLogbook />} />

          {/* Will add settings page later */}

          {/* Customer routes */}
          <Route path="customerHome" element={<CustomerHome />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />

          {/* Employee routes */}
          <Route path="employee" element={<EmployeeHome />} />
          <Route path="employee/orders" element={<Orders />} />

          {/* Admin routes */}
          <Route path="admin" element={<Admin />} />
          <Route path="admin/products" element={<Products />} />
          <Route path="admin/employees" element={<Employee />} />
          <Route path="admin/employees/add" element={<AddEmployee />} />
          <Route path="admin/employees/edit" element={<EditEmployee />} />

          {/* Redirect older paths */}
          <Route
            path="products"
            element={<Navigate to="/catalog" replace />}
          />
          <Route
            path="customer"
            element={<Navigate to="/customerHome" replace />}
          />
          <Route
            path="rider"
            element={<Navigate to="/employee" replace />}
          />

          {/* Page not found */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
