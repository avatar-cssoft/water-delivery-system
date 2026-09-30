import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import CustomerHome from './pages/customer/CustomerHome'
import RiderHome from './pages/rider/RiderHome'
import AdminHome from './pages/admin/AdminHome'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="customer" element={<CustomerHome />} />
          <Route path="rider" element={<RiderHome />} />
          <Route path="admin" element={<AdminHome />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
