import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminOrders from './Orders'

const { getUser, from } = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser },
    from,
  },
}))

const deliveryEmployees = [
  {
    id: 'rider-1',
    first_name: 'Rita',
    last_name: 'Driver',
    middle_initial: 'M',
  },
  {
    id: 'rider-2',
    first_name: 'Sam',
    last_name: 'Rider',
    middle_initial: null,
  },
]

const orders = [
  {
    id: 21,
    user_id: 'customer-1',
    order_date: '2026-11-12T08:00:00Z',
    status: 'pending',
    total_amount: 120,
    delivery_address: '1 Delivery Road',
  },
  {
    id: 22,
    user_id: 'customer-2',
    order_date: null,
    status: 'preparing',
    total_amount: 80,
    delivery_address: '2 Water Street',
  },
]

const customerProfiles = [
  { id: 'customer-1', phone: '+63 912 345 6789' },
  { id: 'customer-2', phone: '+63 998 765 4321' },
]

let existingAssignments: {
  id: number
  order_id: number
  employee_id: string | null
  status: string
}[]
let insertedAssignment: Record<string, unknown> | null
let updatedAssignment: Record<string, unknown> | null
let queryFilters: unknown[][]

function renderAtOrders() {
  render(
    <MemoryRouter initialEntries={['/admin/orders']}>
      <Routes>
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/" element={<h1>Home</h1>} />
        <Route path="/login" element={<h1>Login</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Admin order assignment', () => {
  beforeEach(() => {
    getUser.mockReset()
    getUser.mockResolvedValue({
      data: { user: { id: 'admin-id' } },
      error: null,
    })
    existingAssignments = []
    insertedAssignment = null
    updatedAssignment = null
    queryFilters = []

    from.mockReset()
    from.mockImplementation((table: string) => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn((...args: unknown[]) => {
          queryFilters.push(args)
          return query
        }),
        in: vi.fn(async (...args: unknown[]) => {
          queryFilters.push(args)
          return {
            data: table === 'profiles' ? customerProfiles : [],
            error: null,
          }
        }),
        order: vi.fn(() => {
          if (table === 'orders') {
            return Promise.resolve({ data: orders, error: null })
          }
          if (table === 'deliveries') {
            return Promise.resolve({ data: existingAssignments, error: null })
          }
          return Promise.resolve({ data: deliveryEmployees, error: null })
        }),
        single: vi.fn<() => Promise<{ data: Record<string, unknown>; error: null }>>(
          () => Promise.resolve({ data: { role: 'admin' }, error: null }),
        ),
        maybeSingle: vi.fn(() => {
          const assignment = existingAssignments.find(
            (item) => item.id === queryFilters.at(-1)?.[1],
          )
          return Promise.resolve(
            updatedAssignment
              ? {
                  data: { ...assignment, ...updatedAssignment },
                  error: null,
                }
              : { data: assignment ?? null, error: null },
          )
        }),
        insert: vi.fn((values: Record<string, unknown>) => {
          insertedAssignment = values
          return query
        }),
        update: vi.fn((values: Record<string, unknown>) => {
          updatedAssignment = values
          return query
        }),
      }

      query.select.mockImplementation(() => query)
      query.single.mockImplementation(async () => {
        if (table === 'deliveries' && insertedAssignment) {
          return {
            data: {
              id: 100,
              ...insertedAssignment,
            },
            error: null,
          }
        }
        return { data: { role: 'admin' }, error: null }
      })

      return query
    })
  })

  it('lists orders and Delivery department employees as rider choices', async () => {
    renderAtOrders()

    expect(
      await screen.findByRole('heading', { name: 'Assign Orders to Riders' }),
    ).toBeInTheDocument()
    expect(screen.getByText('1 Delivery Road')).toBeInTheDocument()
    expect(screen.getByText('2 Water Street')).toBeInTheDocument()
    expect(screen.getByText('+63 912 345 6789')).toBeInTheDocument()
    expect(screen.getByText('+63 998 765 4321')).toBeInTheDocument()
    expect(screen.getAllByText('Unassigned')).toHaveLength(2)

    expect(queryFilters).toContainEqual(['role', 'employee'])
    expect(queryFilters).toContainEqual(['department', 'Delivery'])
  })

  it('opens a compact picker with riders listed by their complete available names', async () => {
    renderAtOrders()

    const orderRow = (await screen.findByRole('cell', { name: '#21' })).closest(
      'tr',
    )!
    fireEvent.click(within(orderRow).getByRole('button', { name: 'Assign' }))

    expect(
      await screen.findByRole('option', { name: 'Rita M. Driver' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'Sam Rider' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('listbox', { name: 'Choose rider for order 21' }),
    ).toHaveAttribute('size', '2')
  })

  it('assigns an unassigned order to the selected rider', async () => {
    renderAtOrders()

    const orderRow = (await screen.findByRole('cell', { name: '#21' })).closest(
      'tr',
    )!
    fireEvent.click(within(orderRow).getByRole('button', { name: 'Assign' }))
    fireEvent.change(
      await screen.findByRole('listbox', { name: 'Choose rider for order 21' }),
      { target: { value: 'rider-1' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm Assignment' }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Order #21 assigned successfully.',
    )
    expect(insertedAssignment).toEqual({
      order_id: 21,
      employee_id: 'rider-1',
      status: 'assigned',
    })
    expect(screen.getByText('Driver, R. M.')).toBeInTheDocument()
  })

  it('reassigns an already assigned order by updating its delivery record', async () => {
    existingAssignments = [
      {
        id: 4,
        order_id: 21,
        employee_id: 'rider-1',
        status: 'assigned',
      },
    ]

    renderAtOrders()

    const orderRow = (await screen.findByRole('cell', { name: '#21' })).closest(
      'tr',
    )!
    expect(within(orderRow).getByText('Driver, R. M.')).toBeInTheDocument()
    fireEvent.click(within(orderRow).getByRole('button', { name: 'Reassign' }))
    fireEvent.change(
      await screen.findByRole('listbox', { name: 'Choose rider for order 21' }),
      { target: { value: 'rider-2' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm Reassignment' }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Order #21 assigned successfully.',
    )
    expect(updatedAssignment).toEqual({
      employee_id: 'rider-2',
      status: 'assigned',
    })
    expect(insertedAssignment).toBeNull()
    await waitFor(() =>
      expect(screen.getByText('Rider, S.')).toBeInTheDocument(),
    )
  })

  it('can assign a rider to an existing unassigned delivery record', async () => {
    existingAssignments = [
      {
        id: 8,
        order_id: 21,
        employee_id: null,
        status: 'assigned',
      },
    ]

    renderAtOrders()

    const orderRow = (await screen.findByRole('cell', { name: '#21' })).closest(
      'tr',
    )!
    fireEvent.click(within(orderRow).getByRole('button', { name: 'Assign' }))
    fireEvent.change(
      await screen.findByRole('listbox', { name: 'Choose rider for order 21' }),
      { target: { value: 'rider-2' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm Assignment' }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Order #21 assigned successfully.',
    )
    expect(updatedAssignment).toEqual({
      employee_id: 'rider-2',
      status: 'assigned',
    })
    expect(insertedAssignment).toBeNull()
  })

  it('lets the admin select None to remove the rider from an assigned order', async () => {
    existingAssignments = [
      {
        id: 12,
        order_id: 21,
        employee_id: 'rider-1',
        status: 'assigned',
      },
    ]

    renderAtOrders()

    const orderRow = (await screen.findByRole('cell', { name: '#21' })).closest(
      'tr',
    )!
    fireEvent.click(
      within(orderRow).getByRole('button', { name: 'Reassign' }),
    )
    fireEvent.change(
      await screen.findByRole('listbox', { name: 'Choose rider for order 21' }),
      { target: { value: '__none__' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Unassignment' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Rider removed from order #21.',
    )
    expect(updatedAssignment).toEqual({
      employee_id: null,
      status: 'unassigned',
    })
    expect(within(orderRow).getByText('Unassigned')).toBeInTheDocument()
  })
})
