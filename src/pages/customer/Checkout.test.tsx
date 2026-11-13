import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '../../lib/api/products'
import { saveCart } from '../../lib/cart'
import Checkout from './Checkout'
import CustomerHome from './CustomerHome'

const {
  getUser,
  getProfile,
  getOrder,
  insertOrder,
  insertItems,
} = vi.hoisted(() => ({
  getUser: vi.fn(),
  getProfile: vi.fn(),
  getOrder: vi.fn(),
  insertOrder: vi.fn(),
  insertItems: vi.fn(),
}))

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: (table: string) => {
        const query = {
          select: () => query,
          eq: () => query,
          insert: (values: unknown) => {
            if (table === 'orders') {
              insertOrder(values)
              return query
            }
            return insertItems(values)
          },
          single: () => {
            if (table === 'profiles') return getProfile()
            return getOrder()
          },
        }
        return query
      },
      auth: {
        getUser: () => getUser(),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
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

const savedAddress = '12 Session Road, Baguio City'

function addressBox() {
  return screen.getByLabelText('Delivery Address')
}

function renderCheckout() {
  return render(
    <MemoryRouter initialEntries={['/checkout']}>
      <Routes>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/catalog" element={<p>Catalog page</p>} />
        <Route path="/customerHome" element={<CustomerHome />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  saveCart([{ product, quantity: 2 }])
  getUser.mockReset()
  getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  getProfile.mockReset()
  getProfile.mockResolvedValue({ data: { address: savedAddress }, error: null })
  getOrder.mockReset()
  getOrder.mockResolvedValue({
    data: { id: 123, order_reference: 'ORD-123' },
    error: null,
  })
  insertOrder.mockReset()
  insertItems.mockReset()
  insertItems.mockResolvedValue({ error: null })
})

describe('Checkout delivery address', () => {
  it('starts with the address saved on the profile', async () => {
    renderCheckout()
    expect(await screen.findByDisplayValue(savedAddress)).toBe(addressBox())
  })

  it("doesn't replace an address typed before the profile loads", async () => {
    let resolveProfile: (value: unknown) => void = () => {}
    getProfile.mockReturnValue(new Promise((resolve) => (resolveProfile = resolve)))

    renderCheckout()
    fireEvent.change(addressBox(), { target: { value: 'Office, Magsaysay Ave' } })
    await vi.waitFor(() => expect(getProfile).toHaveBeenCalled())
    await act(async () => {
      resolveProfile({ data: { address: savedAddress }, error: null })
    })

    expect(addressBox()).toHaveValue('Office, Magsaysay Ave')
  })

  it('leaves the box empty when nobody is signed in', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    renderCheckout()
    await vi.waitFor(() => expect(getUser).toHaveBeenCalled())
    expect(addressBox()).toHaveValue('')
    expect(getProfile).not.toHaveBeenCalled()
  })

  it('leaves the box empty when the profile can not be loaded', async () => {
    getProfile.mockRejectedValue(new Error('network down'))
    renderCheckout()
    await vi.waitFor(() => expect(getProfile).toHaveBeenCalled())
    expect(addressBox()).toHaveValue('')
  })
})

describe('Checkout confirmation', () => {
  it('shows the order reference on checkout and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    renderCheckout()

    fireEvent.click(await screen.findByRole('button', { name: 'Place Order' }))

    expect(await screen.findByRole('heading', { name: 'Order placed' }))
      .toBeInTheDocument()
    expect(await screen.findByRole(
      'heading',
      { name: 'Order Reference Number' },
      { timeout: 3000 },
    ))
      .toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Order placed' }))
      .not.toBeInTheDocument()
    expect(screen.queryByText('123')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Delivery Address')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Order reference number' }))
      .toHaveValue('ORD-123')
    expect(screen.getByRole('textbox', { name: 'Order reference number' }))
      .toHaveAttribute('readonly')
    expect(screen.getByRole('progressbar', { name: 'Time until redirect' }))
      .toHaveAttribute('aria-valuenow', '5000')

    fireEvent.click(screen.getByRole('button', { name: 'Copy order reference' }))
    await screen.findByText('Reference number copied.')
    expect(writeText).toHaveBeenCalledWith('ORD-123')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Keep Looking' }))
    expect(await screen.findByText('Catalog page')).toBeInTheDocument()
  })

  it('briefly shows a check after copying, then restores the copy button', async () => {
    vi.useFakeTimers()

    try {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      })
      renderCheckout()

      await act(async () => {
        await Promise.resolve()
      })
      fireEvent.click(screen.getByRole('button', { name: 'Place Order' }))
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500)
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy order reference' }))
        await Promise.resolve()
      })
      expect(screen.getByRole('button', { name: 'Copied' })).toBeDisabled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1400)
      })
      expect(screen.getByRole('button', { name: 'Copy order reference' }))
        .toBeEnabled()

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy order reference' }))
        await Promise.resolve()
      })
      expect(writeText).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports when the database did not generate an order reference', async () => {
    getOrder.mockResolvedValue({
      data: { id: 123, order_reference: null },
      error: null,
    })
    renderCheckout()

    await screen.findByDisplayValue(savedAddress)
    fireEvent.click(await screen.findByRole('button', { name: 'Place Order' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'reference number was not generated',
    )
    expect(insertItems).not.toHaveBeenCalled()
  })

  it('redirects to customer home after a smooth five-second countdown', async () => {
    vi.useFakeTimers()
    renderCheckout()

    await act(async () => {
      await Promise.resolve()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Place Order' }))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByRole('heading', { name: 'Order placed' }))
      .toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1499)
    })
    expect(screen.getByRole('heading', { name: 'Order placed' }))
      .toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(screen.getByRole('heading', { name: 'Order Reference Number' }))
      .toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })
    expect(screen.getByRole('progressbar', { name: 'Time until redirect' }))
      .toHaveAttribute('aria-valuenow', '4750')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4749)
    })
    expect(screen.getByRole('heading', { name: 'Order Reference Number' }))
      .toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(screen.getByRole('heading', { name: 'Customer Home' }))
      .toBeInTheDocument()
    vi.useRealTimers()
  })
})
