import { act, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from './lib/api/products'
import App from './App'

const getProducts = vi.fn<() => Promise<Product[]>>()
const getCurrentUserRole = vi.fn<() => Promise<string | null>>()

vi.mock('./lib/api/auth', () => ({
  getCurrentUserRole: () => getCurrentUserRole(),
}))

vi.mock('./lib/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/api/products')>()
  return {
    ...actual,
    getProducts: () => getProducts(),
    subscribeToProducts: () => () => {},
  }
})

// The nav's auth listener, captured so tests can sign in or out without a reload.
let authChange: (event: string) => void = () => {}

// Pages that query Supabase directly get an empty result, and nobody is signed in.
vi.mock('./lib/supabase', () => {
  const empty = { data: [], error: null }
  const query = {
    select: () => query,
    eq: () => query,
    order: () => Promise.resolve(empty),
    single: () => Promise.resolve({ data: null, error: null }),
  }
  return {
    supabase: {
      from: () => query,
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: (callback: (event: string) => void) => {
          authChange = callback
          return { data: { subscription: { unsubscribe: () => {} } } }
        },
      },
    },
  }
})

const product: Product = {
  id: 1,
  name: 'Round gallon refill',
  description: null,
  price: 30,
  stock: 12,
  containerSize: '5 gal',
  available: true,
}

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  render(<App />)
}

function mainNav() {
  return screen.getByRole('navigation', { name: 'Main' })
}

function footerNav() {
  return screen.getByRole('navigation', { name: 'Footer' })
}

beforeEach(() => {
  localStorage.clear()
  getProducts.mockReset()
  getProducts.mockResolvedValue([product])
  getCurrentUserRole.mockReset()
  getCurrentUserRole.mockResolvedValue(null)
})

// Nav link names in order, once the role has loaded.
async function navLinks() {
  const nav = mainNav()
  // Wait for the role-based links to replace the initial ones.
  await within(nav).findByRole('link', { name: /Log in|My Account/ })
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent)
}

describe('App routes (signed-out guest)', () => {
  it('shows the home page and nav at /', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Water Delivery System' })).toBeInTheDocument()
    expect(within(mainNav()).getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/catalog')
    expect(screen.queryByRole('heading', { name: 'Login' })).not.toBeInTheDocument()
  })

  it.each([
    ['/login', 'Login'],
    ['/register', 'Register'],
    ['/customerHome', 'Customer Home'],
    ['/cart', 'My Cart'],
    ['/checkout', 'Checkout'],
    ['/admin/products', 'Products'],
  ])('shows %s inside the layout', (path, heading) => {
    renderAt(path)
    expect(mainNav()).toBeInTheDocument()
    expect(footerNav()).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('shows footer navigation and copyright', () => {
    renderAt('/employee/orders')
    expect(within(footerNav()).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(within(footerNav()).getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/catalog')
    expect(screen.getByText(`© ${new Date().getFullYear()} Water Delivery`)).toBeInTheDocument()
  })

  it.each(['/account', '/employee', '/employee/orders', '/admin','/admin/employees', '/admin/employees/add', '/admin/employees/edit'])(
    'routes %s to a page (not "Page not found")',
    (path) => {
      renderAt(path)
      expect(mainNav()).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument()
    },
  )

  it('shows the product catalog at /catalog without logging in', async () => {
    renderAt('/catalog')
    expect(await screen.findByText('Round gallon refill')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Shop Water Products' })).toBeInTheDocument()
  })

  it.each([
    ['/products', '/catalog'],
    ['/customer', '/customerHome'],
    ['/rider', '/employee'],
  ])('sends the old path %s to %s', (oldPath, newPath) => {
    renderAt(oldPath)
    expect(window.location.pathname).toBe(newPath)
  })

  it('shows "Page not found" for an unknown path', () => {
    renderAt('/no-such-page')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})

describe('Nav links by role', () => {
  it('shows a guest only public pages, Cart, Log in and Register', async () => {
    renderAt('/')
    expect(await navLinks()).toEqual(['Home', 'Products', 'Cart', 'Log in', 'Register'])
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument()
  })

  it.each([
    ['user', ['Cart']],
    ['customer', ['Cart']],
    ['employee', []],
    ['rider', []],
    ['admin', ['Admin']],
  ])('shows a signed-in %s their pages, My Account and Logout', async (role, pages) => {
    getCurrentUserRole.mockResolvedValue(role)
    renderAt('/')
    expect(await navLinks()).toEqual(['Home', 'Products', ...pages, 'My Account'])
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
  })

  it.each([
    ['user', '/customerHome'],
    ['customer', '/customerHome'],
    ['employee', '/employee'],
    ['rider', '/employee'],
    ['admin', '/'],
    [null, '/'],
  ])('points Home at the right page for a %s', async (role, path) => {
    getCurrentUserRole.mockResolvedValue(role)
    renderAt('/')
    await navLinks()
    expect(within(mainNav()).getByRole('link', { name: 'Home' })).toHaveAttribute('href', path)
  })

  it('switches to the signed-in links after signing in without a reload', async () => {
    renderAt('/register')
    expect(await navLinks()).toEqual(['Home', 'Products', 'Cart', 'Log in', 'Register'])

    getCurrentUserRole.mockResolvedValue('user')
    act(() => authChange('SIGNED_IN'))

    expect(await within(mainNav()).findByRole('link', { name: 'My Account' })).toBeInTheDocument()
    expect(await navLinks()).toEqual(['Home', 'Products', 'Cart', 'My Account'])
  })

  it('switches back to the guest links after signing out elsewhere', async () => {
    getCurrentUserRole.mockResolvedValue('admin')
    renderAt('/')
    expect(await navLinks()).toEqual(['Home', 'Products', 'Admin', 'My Account'])

    getCurrentUserRole.mockResolvedValue(null)
    act(() => authChange('SIGNED_OUT'))

    expect(await within(mainNav()).findByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(await navLinks()).toEqual(['Home', 'Products', 'Cart', 'Log in', 'Register'])
  })

  it('shows only My Account and Logout when the role can not be loaded', async () => {
    getCurrentUserRole.mockRejectedValue(new Error('network down'))
    renderAt('/')
    expect(await navLinks()).toEqual(['Home', 'Products', 'My Account'])
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
  })
})
