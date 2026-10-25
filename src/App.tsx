import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="account" element={<UserAccounts />} />

          <Route path="customerHome" element={<CustomerHome />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />

          <Route path="employee" element={<EmployeeHome />} />

          <Route path="admin" element={<Admin />} />
          <Route path="admin/products" element={<Products />} />
          <Route path="admin/employees" element={<Employee />} />
          <Route path="admin/employees/add" element={<AddEmployee />} />
          <Route path="admin/employees/edit" element={<EditEmployee />} />

          {/* Old paths, kept so existing links and bookmarks still work. */}
          <Route path="products" element={<Navigate to="/catalog" replace />} />
          <Route path="customer" element={<Navigate to="/customerHome" replace />} />
          <Route path="rider" element={<Navigate to="/employee" replace />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
