import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '../../lib/api/products'
import { saveCart } from '../../lib/cart'
import Checkout from './Checkout'

const getUser = vi.fn()
const getProfile = vi.fn()

vi.mock('../../lib/supabase', () => {
  const query = {
    select: () => query,
    eq: () => query,
    single: () => getProfile(),
  }
  return {
    supabase: {
      from: () => query,
      auth: { getUser: () => getUser() },
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

beforeEach(() => {
  localStorage.clear()
  saveCart([{ product, quantity: 2 }])
  getUser.mockReset()
  getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  getProfile.mockReset()
  getProfile.mockResolvedValue({ data: { address: savedAddress }, error: null })
})

describe('Checkout delivery address', () => {
  it('starts with the address saved on the profile', async () => {
    render(<Checkout />)
    expect(await screen.findByDisplayValue(savedAddress)).toBe(addressBox())
  })

  it("doesn't replace an address typed before the profile loads", async () => {
    let resolveProfile: (value: unknown) => void = () => {}
    getProfile.mockReturnValue(new Promise((resolve) => (resolveProfile = resolve)))

    render(<Checkout />)
    fireEvent.change(addressBox(), { target: { value: 'Office, Magsaysay Ave' } })
    await vi.waitFor(() => expect(getProfile).toHaveBeenCalled())
    await act(async () => {
      resolveProfile({ data: { address: savedAddress }, error: null })
    })

    expect(addressBox()).toHaveValue('Office, Magsaysay Ave')
  })

  it('leaves the box empty when nobody is signed in', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    render(<Checkout />)
    await vi.waitFor(() => expect(getUser).toHaveBeenCalled())
    expect(addressBox()).toHaveValue('')
    expect(getProfile).not.toHaveBeenCalled()
  })

  it('leaves the box empty when the profile can not be loaded', async () => {
    getProfile.mockRejectedValue(new Error('network down'))
    render(<Checkout />)
    await vi.waitFor(() => expect(getProfile).toHaveBeenCalled())
    expect(addressBox()).toHaveValue('')
  })
})
