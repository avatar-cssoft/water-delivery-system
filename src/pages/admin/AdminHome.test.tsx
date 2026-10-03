import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '../../lib/api/products'
import type { NewProduct } from '../../lib/validation/product'
import AdminHome from './AdminHome'

const getCurrentUserRole = vi.fn<() => Promise<string | null>>()
const createProduct = vi.fn<(product: NewProduct) => Promise<Product>>()

vi.mock('../../lib/api/auth', () => ({
  getCurrentUserRole: () => getCurrentUserRole(),
}))

vi.mock('../../lib/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/products')>()
  return { ...actual, createProduct: (product: NewProduct) => createProduct(product) }
})

vi.mock('../../lib/supabase', () => ({ supabase: {} }))

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminHome />
    </MemoryRouter>,
  )
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Add product' }))
}

describe('AdminHome access', () => {
  beforeEach(() => {
    getCurrentUserRole.mockReset()
  })

  it('asks signed-out visitors to log in', async () => {
    getCurrentUserRole.mockResolvedValue(null)
    renderPage()

    expect(await screen.findByRole('link', { name: 'log in' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })

  it('does not show the form to non-admins', async () => {
    getCurrentUserRole.mockResolvedValue('user')
    renderPage()

    expect(await screen.findByText('Only admins can manage products.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })

  it('shows the error when the role cannot be loaded', async () => {
    getCurrentUserRole.mockRejectedValue(new Error('JSON object requested, multiple (or no) rows returned'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('multiple (or no) rows')
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })
})

describe('AdminHome add product form', () => {
  beforeEach(async () => {
    getCurrentUserRole.mockReset()
    createProduct.mockReset()
    getCurrentUserRole.mockResolvedValue('admin')
    renderPage()
    await screen.findByRole('heading', { name: 'Add product' })
  })

  it('shows an error under each invalid field and does not save', () => {
    fill('Price (₱)', 'abc')
    submit()

    expect(screen.getByText('Product name is required.')).toBeInTheDocument()
    expect(screen.getByText('Enter a price in pesos, e.g. 30 or 30.50.')).toBeInTheDocument()
    expect(screen.getByText('Stock is required.')).toBeInTheDocument()
    expect(screen.getByText('Size is required.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
    expect(createProduct).not.toHaveBeenCalled()
  })

  it('clears a field error when the field is edited', () => {
    submit()
    expect(screen.getByText('Product name is required.')).toBeInTheDocument()

    fill('Name', 'Round gallon refill')

    expect(screen.queryByText('Product name is required.')).not.toBeInTheDocument()
  })

  it('saves the sanitized product, confirms it, and clears the form', async () => {
    createProduct.mockImplementation(async (product) => ({
      id: 1,
      ...product,
      available: product.stock > 0,
    }))

    fill('Name', '  Round   gallon refill ')
    fill('Description', '')
    fill('Price (₱)', '1,250.50')
    fill('Stock', '12')
    fill('Size', '5 gal')
    submit()

    expect(await screen.findByRole('status')).toHaveTextContent('Added Round gallon refill.')
    expect(createProduct).toHaveBeenCalledWith({
      name: 'Round gallon refill',
      description: null,
      price: 1250.5,
      stock: 12,
      containerSize: '5 gal',
    })
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByLabelText('Price (₱)')).toHaveValue('')
  })

  it('shows the error and keeps the input when saving fails', async () => {
    createProduct.mockRejectedValue(new Error('Only admins can add products.'))

    fill('Name', 'Round gallon refill')
    fill('Price (₱)', '30')
    fill('Stock', '12')
    fill('Size', '5 gal')
    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Only admins can add products.')
    expect(screen.getByLabelText('Name')).toHaveValue('Round gallon refill')
  })
})
