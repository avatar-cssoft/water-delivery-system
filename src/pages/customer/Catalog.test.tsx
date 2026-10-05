import { act, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product, ProductChange } from '../../lib/api/products'
import Catalog from './Catalog'

const getProducts = vi.fn<() => Promise<Product[]>>()
const unsubscribe = vi.fn()
// The catalog's realtime listener, captured so tests can push changes into it.
let pushChange: (change: ProductChange) => void = () => {}

vi.mock('../../lib/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/products')>()
  return {
    ...actual,
    getProducts: () => getProducts(),
    subscribeToProducts: (onChange: (change: ProductChange) => void) => {
      pushChange = onChange
      return unsubscribe
    },
  }
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

describe('Catalog live updates', () => {
  beforeEach(() => {
    getProducts.mockReset()
    unsubscribe.mockReset()
    pushChange = () => {}
  })

  it('shows a product added elsewhere without a refresh', async () => {
    getProducts.mockResolvedValue([])
    render(<Catalog />)
    await screen.findByText('No products available yet.')

    act(() => {
      pushChange({
        type: 'upsert',
        product: {
          id: 9,
          name: 'Slim container',
          description: null,
          price: 240,
          stock: 5,
          containerSize: '5 gal',
          available: true,
        },
      })
    })

    const row = rowFor('Slim container')
    expect(row.getByText('₱240.00')).toBeInTheDocument()
    expect(row.getByText('In stock')).toBeInTheDocument()
  })

  it('updates price and availability when a product is edited', async () => {
    getProducts.mockResolvedValue(products)
    render(<Catalog />)
    await screen.findByRole('table')

    act(() => {
      pushChange({
        type: 'upsert',
        product: { ...products[0], price: 32, stock: 0, available: false },
      })
    })

    const round = rowFor('Round gallon refill')
    expect(round.getByText('₱32.00')).toBeInTheDocument()
    expect(round.getByText('Out of stock')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(4)
  })

  it('removes a deleted product', async () => {
    getProducts.mockResolvedValue(products)
    render(<Catalog />)
    await screen.findByRole('table')

    act(() => {
      pushChange({ type: 'delete', id: 2 })
    })

    expect(screen.queryByText('Slim gallon refill')).not.toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  it('keeps a change that arrives while the first load is still running', async () => {
    let finishLoading: (data: Product[]) => void = () => {}
    getProducts.mockReturnValue(new Promise((resolve) => (finishLoading = resolve)))
    render(<Catalog />)

    // The change arrives first; the (older) list loads after it.
    act(() => {
      pushChange({ type: 'upsert', product: { ...products[1], stock: 8, available: true } })
    })
    await act(async () => {
      finishLoading(products)
    })

    expect(rowFor('Slim gallon refill').getByText('In stock')).toBeInTheDocument()
  })

  it('stops listening when the page is closed', async () => {
    getProducts.mockResolvedValue(products)
    const { unmount } = render(<Catalog />)
    await screen.findByRole('table')

    unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
