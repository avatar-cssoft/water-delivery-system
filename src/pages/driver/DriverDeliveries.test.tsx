import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DriverDeliveries from './DriverDeliveries'

const { getUser, from, queryCalls } = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  queryCalls: [] as { table: string; method: string; args: unknown[] }[],
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser },
    from,
  },
}))

let deliveryRows: Record<string, unknown>[]
let orderRows: Record<string, unknown>[]
let customerRows: Record<string, unknown>[]
let deliveryError: Error | null
let orderError: Error | null
let customerError: Error | null

describe('Driver deliveries', () => {
  beforeEach(() => {
    getUser.mockReset().mockResolvedValue({
      data: { user: { id: 'delivery-employee' } },
      error: null,
    })
    deliveryRows = [
      {
        id: 8,
        order_id: 21,
        status: 'assigned',
        created_at: '2026-11-12T08:00:00Z',
      },
    ]
    orderRows = [
      {
        id: 21,
        order_reference: 'ORD-21',
        user_id: 'customer-1',
        order_date: '2026-11-12T08:00:00Z',
        status: 'pending',
        total_amount: 120,
        delivery_address: '1 Delivery Road',
      },
    ]
    customerRows = [{ id: 'customer-1', phone: '+63 912 345 6789' }]
    deliveryError = null
    orderError = null
    customerError = null
    queryCalls.length = 0

    from.mockReset().mockImplementation((table: string) => {
      const query = {
        select: vi.fn((...args: unknown[]) => {
          queryCalls.push({ table, method: 'select', args })
          return query
        }),
        eq: vi.fn((...args: unknown[]) => {
          queryCalls.push({ table, method: 'eq', args })
          return query
        }),
        order: vi.fn(async (...args: unknown[]) => {
          queryCalls.push({ table, method: 'order', args })
          return { data: deliveryRows, error: deliveryError }
        }),
        in: vi.fn(async (...args: unknown[]) => {
          queryCalls.push({ table, method: 'in', args })
          return {
            data: table === 'orders' ? orderRows : customerRows,
            error: table === 'orders' ? orderError : customerError,
          }
        }),
      }

      return query
    })
  })

  it('shows only orders assigned to the signed-in delivery employee', async () => {
    render(<DriverDeliveries />)

    expect(await screen.findByRole('heading', { name: 'Order #ORD-21' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Order #21' }))
      .not.toBeInTheDocument()
    expect(screen.getByText('1 Delivery Road')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+63 912 345 6789' })).toHaveAttribute(
      'href',
      'tel:+63 912 345 6789',
    )
    expect(screen.getByText('₱120.00')).toBeInTheDocument()
    expect(screen.getByText('1', { selector: 'p' })).toBeInTheDocument()
    expect(queryCalls).toContainEqual({
      table: 'deliveries',
      method: 'eq',
      args: ['employee_id', 'delivery-employee'],
    })
    expect(queryCalls).toContainEqual({
      table: 'orders',
      method: 'in',
      args: ['id', [21]],
    })
    expect(queryCalls).toContainEqual({
      table: 'orders',
      method: 'select',
      args: [
        'id, order_reference, user_id, order_date, status, total_amount, delivery_address',
      ],
    })
    expect(queryCalls).toContainEqual({
      table: 'profiles',
      method: 'in',
      args: ['id', ['customer-1']],
    })
  })

  it('shows the empty state when no deliveries are assigned', async () => {
    deliveryRows = []

    render(<DriverDeliveries />)

    expect(
      await screen.findByText('No deliveries assigned yet'),
    ).toBeInTheDocument()
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('shows a visible error when loading assigned deliveries fails', async () => {
    deliveryError = new Error('Permission denied')

    render(<DriverDeliveries />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Permission denied',
    )
  })
})
