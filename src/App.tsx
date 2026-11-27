
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import Layout from './components/Layout'
import { useNavRole } from './components/useNavRole'
import { AccessibilityPreferencesProvider } from './components/AccessibilityPreferences'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import AddressLogbook from './pages/users/AddressLogbook'
import ChangePassword from './pages/users/ChangePassword'
import UserAccounts from './pages/users/UserAccount'
import Settings from './pages/Settings'
import Accessibility from './pages/Accessibility'

// Admin imports
import Admin from './pages/admin/admin'
import AdminOrders from './pages/admin/Orders'
import Products from './pages/admin/products'
import Employee from './pages/admin/EmployeeManagement/Employee'
import AddEmployee from './pages/admin/EmployeeManagement/AddEmployee'
import EditEmployee from './pages/admin/EmployeeManagement/EditEmployee'

// Employee imports
import EmployeeHome from './pages/employees/Employee'
import Orders from './pages/employees/Orders'

// Customer imports
import CustomerHome from './pages/customer/CustomerHome'
import OrderTracking from './pages/customer/OrderTracking'
import Catalog from './pages/customer/Catalog'
import Cart from './pages/customer/Cart'
import Checkout from './pages/customer/Checkout'
import DriverDashboard from './pages/driver/DriverDashboard'
import DriverProfile from './pages/driver/DriverProfile'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

function EmployeeDashboardRoute() {
  const { role, department } = useNavRole()

  if (role === 'checking') {
    return <p>Loading dashboard...</p>
  }

  if (role === 'employee' && department === 'Delivery') {
    return <Navigate to="/driver" replace />
  }

  return <EmployeeHome />
}

function DriverDashboardRoute({ children }: { children?: ReactNode }) {
  const { role, department } = useNavRole()

  if (role === 'checking') {
    return <p>Loading dashboard...</p>
  }

  if (role === 'employee' && department === 'Delivery') {
    return children ?? <DriverDashboard />
  }

  const redirectPath =
    role === 'guest'
      ? '/login'
      : role === 'employee'
        ? '/employee'
        : role === 'customer'
          ? '/customerHome'
          : '/'

  return <Navigate to={redirectPath} replace />
}

function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const { role } = useNavRole()

  if (role === 'checking') {
    return <p>Checking your account...</p>
  }

  if (role === 'guest') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function CustomerOnlyRoute({ children }: { children: ReactNode }) {
  const { role, department } = useNavRole()

  if (role === 'checking') {
    return <p>Checking your account...</p>
  }

  if (role === 'customer') {
    return <>{children}</>
  }

  const redirectPath =
    role === 'guest'
      ? '/login'
      : role === 'admin'
        ? '/admin'
        : role === 'employee'
          ? department === 'Delivery'
            ? '/driver'
            : '/employee'
          : '/'

  return <Navigate to={redirectPath} replace />
}

export default function App() {
  return (
    <AccessibilityPreferencesProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<Layout />}>
            {/* Home and authentication */}
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />

            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />

            {/* User account */}
            <Route path="account" element={<UserAccounts />} />
            <Route path="account/address-logbook" element={<AddressLogbook />} />
            <Route path="account/change-password" element={<ChangePassword />} />

            <Route path="settings" element={<Settings />} />
            <Route path="accessibility" element={<Accessibility />} />

            {/* Customer routes */}
            <Route path="customerHome" element={<CustomerHome />} />
            <Route
              path="catalog"
              element={
                <CustomerOnlyRoute>
                  <Catalog />
                </CustomerOnlyRoute>
              }
            />
            <Route
              path="cart"
              element={
                <CustomerOnlyRoute>
                  <Cart />
                </CustomerOnlyRoute>
              }
            />
            <Route
              path="checkout"
              element={
                <AuthenticatedRoute>
                  <Checkout />
                </AuthenticatedRoute>
              }
            />
            <Route
              path="orders"
              element={
                <CustomerOnlyRoute>
                  <OrderTracking key="list" />
                </CustomerOnlyRoute>
              }
            />
            <Route
              path="orders/:orderId/track"
              element={
                <CustomerOnlyRoute>
                  <OrderTracking key="detail" />
                </CustomerOnlyRoute>
              }
            />

            {/* Employee routes */}
            <Route path="employee" element={<EmployeeDashboardRoute />} />
            <Route path="employee/orders" element={<Orders />} />
            <Route path="driver" element={<DriverDashboardRoute />} />
            <Route
              path="driver/profile"
              element={
                <DriverDashboardRoute>
                  <DriverProfile />
                </DriverDashboardRoute>
              }
            />

            {/* Admin routes */}
            <Route path="admin" element={<Admin />} />
            <Route path="admin/orders" element={<AdminOrders />} />
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
    </AccessibilityPreferencesProvider>
  )
}
