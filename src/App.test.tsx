import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from './lib/api/products'
import App from './App'

const getProducts = vi.fn<() => Promise<Product[]>>()

vi.mock('./lib/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/api/products')>()
  return {
    ...actual,
    getProducts: () => getProducts(),
    subscribeToProducts: () => () => {},
  }
})

// Pages that query Supabase directly get an empty result.
vi.mock('./lib/supabase', () => {
  const query = {
    select: () => query,
    order: () => Promise.resolve({ data: [], error: null }),
  }
  return {
    supabase: {
      from: () => query,
      auth: { signOut: () => Promise.resolve({ error: null }) },
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

describe('App routes (signed-out guest)', () => {
  beforeEach(() => {
    getProducts.mockReset()
    getProducts.mockResolvedValue([product])
  })

  it('shows the home page and nav at /', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Water Delivery System' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/products')
    expect(screen.queryByRole('heading', { name: 'Login' })).not.toBeInTheDocument()
  })

  it('shows the product catalog at /products without logging in', async () => {
    renderAt('/products')
    expect(await screen.findByText('Round gallon refill')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Products' })).toBeInTheDocument()
  })

  it('shows the login page at /login', () => {
    renderAt('/login')
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it('shows the register page at /register', () => {
    renderAt('/register')
    expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument()
  })

  it('shows the admin products page at /admin/products', async () => {
    renderAt('/admin/products')
    expect(screen.getByRole('heading', { level: 2, name: 'Products' })).toBeInTheDocument()
    expect(await screen.findByText('No products available.')).toBeInTheDocument()
  })

  it('shows "Page not found" for an unknown path', () => {
    renderAt('/no-such-page')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
