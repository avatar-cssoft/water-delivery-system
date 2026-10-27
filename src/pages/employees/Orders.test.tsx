import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Orders from './Orders'

const getCurrentUserRole = vi.fn<() => Promise<string | null>>()
const loadOrders = vi.fn()

vi.mock('../../lib/api/auth', () => ({
  getCurrentUserRole: () => getCurrentUserRole(),
}))

vi.mock('../../lib/supabase', () => {
  const query = {
    select: () => query,
    order: () => loadOrders(),
  }
  return { supabase: { from: () => query } }
})

const order = {
  id: 7,
  user_id: 'u1',
  order_date: '2026-10-26T10:00:00Z',
  status: 'pending',
  total_amount: 60,
  delivery_address: '12 Session Road, Baguio City',
  created_at: '2026-10-26T10:00:00Z',
}

const realLocation = window.location

beforeEach(() => {
  // jsdom can't navigate, so record where the page tries to send the user.
  Object.defineProperty(window, 'location', { value: { href: '' }, writable: true })
  getCurrentUserRole.mockReset()
  loadOrders.mockReset()
  loadOrders.mockResolvedValue({ data: [order], error: null })
})

afterEach(() => {
  Object.defineProperty(window, 'location', { value: realLocation, writable: true })
})

describe('Orders access', () => {
  it.each(['employee', 'rider', 'admin'])('shows the orders to a signed-in %s', async (role) => {
    getCurrentUserRole.mockResolvedValue(role)
    render(<Orders />)
    expect(await screen.findByText('12 Session Road, Baguio City')).toBeInTheDocument()
    expect(window.location.href).toBe('')
  })

  it('sends a signed-out user to /login without loading orders', async () => {
    getCurrentUserRole.mockResolvedValue(null)
    render(<Orders />)
    await vi.waitFor(() => expect(window.location.href).toBe('/login'))
    expect(loadOrders).not.toHaveBeenCalled()
  })

  it.each(['user', 'customer'])('sends a %s to / without loading orders', async (role) => {
    getCurrentUserRole.mockResolvedValue(role)
    render(<Orders />)
    await vi.waitFor(() => expect(window.location.href).toBe('/'))
    expect(loadOrders).not.toHaveBeenCalled()
  })

  it('sends the user to / when the role can not be loaded', async () => {
    getCurrentUserRole.mockRejectedValue(new Error('network down'))
    render(<Orders />)
    await vi.waitFor(() => expect(window.location.href).toBe('/'))
    expect(loadOrders).not.toHaveBeenCalled()
  })
})
