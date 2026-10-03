import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '../../lib/api/products'
import Catalog from './Catalog'

const getProducts = vi.fn<() => Promise<Product[]>>()

vi.mock('../../lib/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/products')>()
  return { ...actual, getProducts: () => getProducts() }
})

vi.mock('../../lib/supabase', () => ({ supabase: {} }))

const products: Product[] = [
  {
    id: 1,
    name: 'Round gallon refill',
    description: null,
    price: 30,
    stock: 12,
    containerSize: '5 gal',
    available: true,
  },
  {
    id: 2,
    name: 'Slim gallon refill',
    description: null,
    price: 35,
    stock: 0,
    containerSize: '5 gal',
    available: false,
  },
  {
    id: 3,
    name: 'New round container',
    description: 'Includes the first refill',
    price: 250,
    stock: 3,
    containerSize: '5 gal',
    available: true,
  },
]

function rowFor(name: string) {
  const row = screen.getByText(name).closest('tr')
  if (!row) throw new Error(`No row for ${name}`)
  return within(row)
}

describe('Catalog', () => {
  beforeEach(() => {
    getProducts.mockReset()
  })

  it('shows each product with its name, price, and availability', async () => {
    getProducts.mockResolvedValue(products)

    render(<Catalog />)

    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument()

    const round = rowFor('Round gallon refill')
    expect(round.getByText('₱30.00')).toBeInTheDocument()
    expect(round.getByText('In stock')).toBeInTheDocument()

    const slim = rowFor('Slim gallon refill')
    expect(slim.getByText('₱35.00')).toBeInTheDocument()
    expect(slim.getByText('Out of stock')).toBeInTheDocument()

    const container = rowFor('New round container')
    expect(container.getByText('₱250.00')).toBeInTheDocument()
    expect(container.getByText('In stock')).toBeInTheDocument()
    expect(container.getByText('Includes the first refill')).toBeInTheDocument()
  })

  it('shows one row per product', async () => {
    getProducts.mockResolvedValue(products)

    render(<Catalog />)

    await screen.findByRole('table')
    // 1 header row + 3 product rows
    expect(screen.getAllByRole('row')).toHaveLength(4)
  })

  it('shows a loading message while products load', () => {
    getProducts.mockReturnValue(new Promise(() => {}))

    render(<Catalog />)

    expect(screen.getByText('Loading products...')).toBeInTheDocument()
  })

  it('shows a message when there are no products', async () => {
    getProducts.mockResolvedValue([])

    render(<Catalog />)

    expect(await screen.findByText('No products available yet.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the error when products fail to load', async () => {
    getProducts.mockRejectedValue(new Error('permission denied'))

    render(<Catalog />)

    expect(await screen.findByRole('alert')).toHaveTextContent('permission denied')
  })
})
