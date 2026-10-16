
import { act, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product, ProductChange } from '../../lib/api/products'
import Catalog from './Catalog'

const getProducts = vi.fn<() => Promise<Product[]>>()
const unsubscribe = vi.fn()

let pushChange: (change: ProductChange) => void = () => {}

vi.mock('../../lib/api/products', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../lib/api/products')>()

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

function cardFor(name: string) {
  const card = screen.getByRole('heading', { name }).closest('article')

  if (!card) {
    throw new Error(`No product card for ${name}`)
  }

  return within(card)
}

describe('Catalog', () => {
  beforeEach(() => {
    getProducts.mockReset()
  })

  it('shows each product with its name, price, and stock', async () => {
    getProducts.mockResolvedValue(products)

    render(<Catalog />)

    expect(
      await screen.findByRole('heading', { name: 'Shop Water Products' }),
    ).toBeInTheDocument()

    const round = cardFor('Round gallon refill')
    expect(round.getByText('Price: ₱30.00')).toBeInTheDocument()
    expect(round.getByText('Stock: 12')).toBeInTheDocument()

    const slim = cardFor('Slim gallon refill')
    expect(slim.getByText('Price: ₱35.00')).toBeInTheDocument()
    expect(slim.getByText('Stock: 0')).toBeInTheDocument()
    expect(
      slim.getByRole('button', { name: 'Add to Cart' }),
    ).toBeDisabled()

    const container = cardFor('New round container')
    expect(container.getByText('Price: ₱250.00')).toBeInTheDocument()
    expect(container.getByText('Stock: 3')).toBeInTheDocument()
    expect(
      container.getByText('Includes the first refill'),
    ).toBeInTheDocument()
  })

  it('shows one card per product', async () => {
    getProducts.mockResolvedValue(products)

    render(<Catalog />)

    await screen.findByRole('heading', { name: 'Round gallon refill' })

    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('shows a loading message while products load', () => {
    getProducts.mockReturnValue(new Promise(() => {}))

    render(<Catalog />)

    expect(screen.getByText('Loading products...')).toBeInTheDocument()
  })

  it('shows a message when there are no products', async () => {
    getProducts.mockResolvedValue([])

    render(<Catalog />)

    expect(
      await screen.findByText('No products available yet.'),
    ).toBeInTheDocument()

    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })

  it('shows an error when products fail to load', async () => {
    getProducts.mockRejectedValue(new Error('permission denied'))

    render(<Catalog />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load products. Please try again.',
    )
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

    const card = cardFor('Slim container')
    expect(card.getByText('Price: ₱240.00')).toBeInTheDocument()
    expect(card.getByText('Stock: 5')).toBeInTheDocument()
  })

  it('updates price and stock when a product is edited', async () => {
    getProducts.mockResolvedValue(products)

    render(<Catalog />)

    await screen.findByRole('heading', { name: 'Round gallon refill' })

    act(() => {
      pushChange({
        type: 'upsert',
        product: { ...products[0], price: 32, stock: 0, available: false },
      })
    })

    const round = cardFor('Round gallon refill')
    expect(round.getByText('Price: ₱32.00')).toBeInTheDocument()
    expect(round.getByText('Stock: 0')).toBeInTheDocument()
    expect(
      round.getByRole('button', { name: 'Add to Cart' }),
    ).toBeDisabled()

    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('removes a deleted product', async () => {
    getProducts.mockResolvedValue(products)

    render(<Catalog />)

    await screen.findByRole('heading', { name: 'Round gallon refill' })

    act(() => {
      pushChange({ type: 'delete', id: 2 })
    })

    expect(
      screen.queryByRole('heading', { name: 'Slim gallon refill' }),
    ).not.toBeInTheDocument()

    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('keeps a change that arrives while the first load is still running', async () => {
    let finishLoading: (data: Product[]) => void = () => {}

    getProducts.mockReturnValue(
      new Promise((resolve) => {
        finishLoading = resolve
      }),
    )

    render(<Catalog />)

    act(() => {
      pushChange({
        type: 'upsert',
        product: { ...products[1], stock: 8, available: true },
      })
    })

    await act(async () => {
      finishLoading(products)
    })

    expect(cardFor('Slim gallon refill').getByText('Stock: 8')).toBeInTheDocument()
    expect(
      cardFor('Slim gallon refill').getByRole('button', {
        name: 'Add to Cart',
      }),
    ).toBeEnabled()
  })

  it('stops listening when the page is closed', async () => {
    getProducts.mockResolvedValue(products)

    const { unmount } = render(<Catalog />)

    await screen.findByRole('heading', { name: 'Round gallon refill' })

    unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
