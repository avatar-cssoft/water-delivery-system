import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import CustomerHome from './pages/customer/CustomerHome'
import Catalog from './pages/customer/Catalog'
import RiderHome from './pages/rider/RiderHome'
import AdminHome from './pages/admin/AdminHome'
import UserAccounts from './pages/users/UserAccount'

// SCRUM-16 admin pages
import Admin from './pages/admin/admin'
import Products from './pages/admin/products'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="account" element={<UserAccounts />} />
          <Route path="products" element={<Catalog />} />
          <Route path="customer" element={<CustomerHome />} />
          <Route path="rider" element={<RiderHome />} />

          {/* Existing admin home */}
          <Route path="admin" element={<AdminHome />} />

          {/* SCRUM-16 admin pages */}
          <Route path="admin/dashboard" element={<Admin />} />
          <Route path="admin/products" element={<Products />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}