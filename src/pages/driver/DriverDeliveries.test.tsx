import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DriverDeliveries from './DriverDeliveries'

const { getUser, from, rpc, queryCalls } = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  queryCalls: [] as { table: string; method: string; args: unknown[] }[],
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser },
    from,
    rpc,
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
        delivery_address: '1 Delivery Road, Barangay Central, Baguio City, Benguet',
      },
    ]
    customerRows = [{ id: 'customer-1', phone: '+63 912 345 6789' }]
    deliveryError = null
    orderError = null
    customerError = null
    queryCalls.length = 0
    rpc.mockReset().mockResolvedValue({ data: null, error: null })

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
    expect(
      screen.getByText(
        '1 Delivery Road, Barangay Central, Baguio City, Benguet',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Order status')).not.toBeInTheDocument()
    expect(screen.getByText('PENDING')).toHaveStyle({
      minWidth: '140px',
      height: '38px',
      backgroundColor: '#fef3c7',
      color: '#92400e',
    })
    expect(screen.getByText('WIP')).toBeInTheDocument()
    expect(
      screen.getByText(/requested delivery times will appear here/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Order date', { selector: 'dt' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+63 912 345 6789' })).toHaveAttribute(
      'href',
      'tel:+63 912 345 6789',
    )
    expect(screen.getByText('Total: ₱120.00')).toHaveStyle({
      minWidth: '140px',
      height: '38px',
      whiteSpace: 'nowrap',
      backgroundColor: '#dcefe1',
      color: '#25352a',
    })
    expect(screen.getByText('1', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByLabelText('How many empty containers were returned?'))
      .not.toBeInTheDocument()
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
      args: ['*'],
    })
    expect(queryCalls).toContainEqual({
      table: 'profiles',
      method: 'in',
      args: ['id', ['customer-1']],
    })
  })

  it.each([
    {
      status: 'preparing',
      label: 'PREPARING',
      backgroundColor: '#ffedd5',
      color: '#9a3412',
    },
    {
      status: 'out_for_delivery',
      label: 'OUT FOR DELIVERY',
      backgroundColor: '#dbeafe',
      color: '#1e40af',
    },
    {
      status: 'delivered',
      label: 'DELIVERED',
      backgroundColor: '#dcfce7',
      color: '#166534',
    },
    {
      status: 'cancelled',
      label: 'CANCELLED',
      backgroundColor: '#fee2e2',
      color: '#991b1b',
    },
  ])('shows the $label order status in its assigned color', async ({
    status,
    label,
    backgroundColor,
    color,
  }) => {
    orderRows[0].status = status
    render(<DriverDeliveries />)

    expect(await screen.findByText(label)).toHaveStyle({
      backgroundColor,
      color,
    })
  })

  it('sorts by barangay, then requested window and order time', async () => {
    deliveryRows = [
      { id: 8, order_id: 22, status: 'assigned', created_at: '2026-11-12T08:00:00Z' },
      { id: 9, order_id: 23, status: 'assigned', created_at: '2026-11-11T08:00:00Z' },
      { id: 10, order_id: 21, status: 'assigned', created_at: '2026-11-10T08:00:00Z' },
    ]
    orderRows = [
      {
        id: 21,
        order_reference: 'ORD-21',
        user_id: 'customer-1',
        order_date: '2026-11-12T09:00:00Z',
        status: 'pending',
        total_amount: 120,
        delivery_address: '1 Delivery Road, Barangay Camp 7, Baguio City, Benguet',
      },
      {
        id: 22,
        order_reference: 'ORD-22',
        user_id: 'customer-1',
        order_date: '2026-11-12T10:00:00Z',
        requested_delivery_window_start: '2026-11-26T10:00:00Z',
        requested_delivery_window_end: '2026-11-26T11:00:00Z',
        status: 'pending',
        total_amount: 120,
        delivery_address: '2 Water Street, Barangay Central, Baguio City, Benguet',
      },
      {
        id: 23,
        order_reference: 'ORD-23',
        user_id: 'customer-1',
        order_date: '2026-11-12T11:00:00Z',
        requested_delivery_window_start: '2026-11-26T08:00:00Z',
        requested_delivery_window_end: '2026-11-26T09:00:00Z',
        status: 'pending',
        total_amount: 120,
        delivery_address: '3 Hill Road, Barangay Central, Baguio City, Benguet',
      },
    ]

    render(<DriverDeliveries />)

    await screen.findByRole('heading', { name: 'Order #ORD-21' })
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(['Order #ORD-21', 'Order #ORD-23', 'Order #ORD-22'])
    expect(
      screen.getByText(
        '1 Delivery Road, Barangay Camp 7, Baguio City, Benguet',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(
        /Water Street, Barangay Central, Baguio City, Benguet/,
      ),
    ).toHaveLength(1)
    expect(
      screen.getByText(
        '3 Hill Road, Barangay Central, Baguio City, Benguet',
      ),
    ).toBeInTheDocument()
  })

  it('keeps the full address without a separate barangay field', async () => {
    orderRows[0].delivery_address = 'NULL, NULL, NULL, NULL, 0000'

    render(<DriverDeliveries />)

    const orderHeading = await screen.findByRole('heading', {
      name: 'Order #ORD-21',
    })
    const orderCard = orderHeading.closest('article')

    if (!orderCard) throw new Error('Order card was not rendered.')

    expect(within(orderCard).getByText('NULL, NULL, NULL, NULL, 0000'))
      .toBeInTheDocument()
    expect(within(orderCard).queryByText('Barangay', { selector: 'dt' }))
      .not.toBeInTheDocument()
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

  it('records returned containers for the selected delivery', async () => {
    deliveryRows[0].status = 'out_for_delivery'
    orderRows[0].status = 'delivered'
    render(<DriverDeliveries />)

    await screen.findByRole('heading', { name: 'Order #ORD-21' })
    const input = await screen.findByLabelText(
      'How many empty containers were returned?',
    )
    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'Save returned containers' }),
    )

    expect(
      await screen.findByText('0 empty containers returned.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText('How many empty containers were returned?'),
    ).not.toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('record_returned_containers', {
      target_delivery_id: 8,
      returned_quantity: 0,
    })
  })

  it('treats an existing zero return value as already recorded', async () => {
    deliveryRows[0].status = 'out_for_delivery'
    orderRows[0].status = 'delivered'
    rpc.mockImplementation((name: string) =>
      name === 'get_returned_containers'
        ? Promise.resolve({ data: 0, error: null })
        : Promise.resolve({ data: null, error: null }),
    )
    render(<DriverDeliveries />)

    expect(
      await screen.findByText('0 empty containers returned.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText('How many empty containers were returned?'),
    ).not.toBeInTheDocument()
  })

  it('rejects invalid returned-container quantities', async () => {
    deliveryRows[0].status = 'out_for_delivery'
    orderRows[0].status = 'delivered'
    render(<DriverDeliveries />)

    await screen.findByRole('heading', { name: 'Order #ORD-21' })
    fireEvent.change(
      await screen.findByLabelText('How many empty containers were returned?'),
      {
        target: { value: '' },
      },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Save returned containers' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter a whole number (0 or greater).',
    )
    expect(rpc).not.toHaveBeenCalledWith(
      'record_returned_containers',
      expect.anything(),
    )
  })

  it('shows an error when recording returned containers fails', async () => {
    rpc.mockImplementation((name: string) =>
      name === 'record_returned_containers'
        ? Promise.resolve({
            data: null,
            error: new Error('Delivery has already recorded returns'),
          })
        : Promise.resolve({ data: null, error: null }),
    )
    deliveryRows[0].status = 'out_for_delivery'
    orderRows[0].status = 'delivered'
    render(<DriverDeliveries />)

    await screen.findByRole('heading', { name: 'Order #ORD-21' })
    fireEvent.change(
      await screen.findByLabelText('How many empty containers were returned?'),
      {
        target: { value: '2' },
      },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Save returned containers' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Delivery has already recorded returns',
    )
  })

  it('shows returned containers and hides the requested window after delivery', async () => {
    deliveryRows[0].status = 'out_for_delivery'
    render(<DriverDeliveries />)

    expect(
      await screen.findByText('Requested Delivery Window', { selector: 'dt' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mark delivered' }))

    await waitFor(() => {
      expect(
        screen.queryByText('Requested Delivery Window', { selector: 'dt' }),
      ).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Directions' })).not.toBeInTheDocument()
      expect(
        screen.getByLabelText('How many empty containers were returned?'),
      ).toBeInTheDocument()
    })
  })
})
