import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import OrderTracking from './OrderTracking'

const { getSession, rpc, from } = vi.hoisted(() => ({
  getSession: vi.fn(), rpc: vi.fn(), from: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getSession }, rpc, from } }))

beforeEach(() => {
  vi.resetAllMocks()
  getSession.mockResolvedValue({ data: { session: { user: { id: 'customer' } } }, error: null })
})

function openTracking(path: string) {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/orders" element={<OrderTracking />} />
    <Route path="/orders/:orderId/track" element={<OrderTracking />} />
  </Routes></MemoryRouter>)
}

it('lists orders with a direct link and their current status', async () => {
  rpc.mockResolvedValue({ data: [{ id: 42, order_reference: 'WD-42', status: 'preparing' }], error: null })
  openTracking('/orders')
  expect(await screen.findByRole('link', { name: 'Order #WD-42' })).toHaveAttribute('href', '/orders/42/track')
  expect(screen.getByText('Preparing')).toBeInTheDocument()
  expect(rpc).toHaveBeenCalledWith('get_customer_tracking_orders', { target_order_id: null })
})

it('shows the delivered status without requesting a rider location', async () => {
  rpc.mockResolvedValue({
    data: [{ id: 42, order_reference: 'WD-42', status: 'delivered', delivery_address: 'Main entrance' }],
    error: null,
  })
  openTracking('/orders/42/track')
  expect(await screen.findByRole('heading', { name: 'Order #WD-42' })).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Delivered')
  expect(screen.getByText('Main entrance', { exact: false })).toBeInTheDocument()
  expect(rpc).toHaveBeenCalledExactlyOnceWith('get_customer_tracking_orders', { target_order_id: '42' })
})

it('shows an unavailable order when the customer has no matching order', async () => {
  rpc.mockResolvedValue({ data: [], error: null })
  openTracking('/orders/42/track')
  expect(await screen.findByText('Order unavailable.')).toBeInTheDocument()
})


it('shows order status from the legacy schema when the tracking migration is missing', async () => {
  rpc.mockResolvedValue({ error: { code: 'PGRST202' } })
  const filters = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [{ id: 42, status: 'out_for_delivery', delivery_address: 'Main entrance' }],
      error: null,
    }),
  }
  const select = vi.fn().mockReturnValue(filters)
  from.mockReturnValue({ select })
  openTracking('/orders/42/track')
  expect(await screen.findByRole('heading', { name: 'Order #42' })).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Out for delivery')
  expect(screen.getByText(/Live rider location is unavailable/)).toBeInTheDocument()
  expect(from).toHaveBeenCalledWith('orders')
  expect(filters.eq).toHaveBeenCalledWith('user_id', 'customer')
  expect(filters.eq).toHaveBeenCalledWith('id', '42')
  expect(rpc).toHaveBeenCalledTimes(1)
})

it('preserves the error when the tracking function returns a permissions failure', async () => {
  rpc.mockResolvedValue({ error: { code: '42501' } })
  openTracking('/orders/42/track')
  expect(await screen.findByRole('alert')).toHaveTextContent('Order updates are temporarily unavailable')
  expect(from).not.toHaveBeenCalled()
})
