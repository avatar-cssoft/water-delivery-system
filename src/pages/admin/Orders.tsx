import { Fragment } from 'react'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type DeliveryEmployee = {
  id: string
  first_name: string
  last_name: string
  middle_initial: string | null
}

type Order = {
  id: number
  user_id: string
  order_date: string | null
  status: string
  total_amount: number
  delivery_address: string
  customer_phone?: string
}

type CustomerProfile = {
  id: string
  phone: string
}

type DeliveryAssignment = {
  id: number
  order_id: number
  employee_id: string | null
  status: string
}

type PageState = 'loading' | 'ready' | 'login' | 'denied'
const NO_RIDER = '__none__'

function getRiderDisplayName(employee: DeliveryEmployee) {
  const firstInitial = employee.first_name.trim().charAt(0).toUpperCase()
  const middleInitial = employee.middle_initial?.trim().charAt(0).toUpperCase()
  const nameParts = [
    employee.last_name.trim(),
    `${firstInitial}.`,
    middleInitial ? `${middleInitial}.` : '',
  ].filter(Boolean)

  return `${nameParts[0]}, ${nameParts.slice(1).join(' ')}`
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [employees, setEmployees] = useState<DeliveryEmployee[]>([])
  const [assignments, setAssignments] = useState<
    Record<number, DeliveryAssignment>
  >({})
  const [selectedRiders, setSelectedRiders] = useState<Record<number, string>>(
    {},
  )
  const [openAssignmentOrderId, setOpenAssignmentOrderId] = useState<number | null>(
    null,
  )
  const [state, setState] = useState<PageState>('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadOrdersAndRiders() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        if (!user) {
          if (!cancelled) setState('login')
          return
        }

        const { data: adminProfile, error: adminError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (adminError) throw adminError
        if (adminProfile?.role !== 'admin') {
          if (!cancelled) setState('denied')
          return
        }

        const [ordersResult, employeesResult, deliveriesResult] =
          await Promise.all([
            supabase
              .from('orders')
              .select(
                'id, user_id, order_date, status, total_amount, delivery_address',
              )
              .order('created_at', { ascending: false }),
            supabase
              .from('profiles')
              .select('id, first_name, last_name, middle_initial')
              .eq('role', 'employee')
              .eq('department', 'Delivery')
              .order('last_name'),
            supabase
              .from('deliveries')
              .select('id, order_id, employee_id, status')
              .order('created_at'),
          ])

        if (ordersResult.error) throw ordersResult.error
        if (employeesResult.error) throw employeesResult.error
        if (deliveriesResult.error) throw deliveriesResult.error

        const orderRows = (ordersResult.data ?? []) as Order[]
        const customerIds = [...new Set(orderRows.map((order) => order.user_id))]
        let customerProfiles: CustomerProfile[] = []

        if (customerIds.length > 0) {
          const { data: customerData, error: customerError } = await supabase
            .from('profiles')
            .select('id, phone')
            .in('id', customerIds)

          if (customerError) throw customerError
          customerProfiles = (customerData ?? []) as CustomerProfile[]
        }

        if (!cancelled) {
          const currentAssignments: Record<number, DeliveryAssignment> = {}
          for (const assignment of deliveriesResult.data ?? []) {
            currentAssignments[assignment.order_id] = assignment
          }

          const phoneByCustomerId = new Map(
            customerProfiles.map((profile) => [profile.id, profile.phone]),
          )
          setOrders(
            orderRows.map((order) => ({
              ...order,
              customer_phone: phoneByCustomerId.get(order.user_id),
            })),
          )
          setEmployees(employeesResult.data ?? [])
          setAssignments(currentAssignments)
          setSelectedRiders(
            Object.fromEntries(
              Object.entries(currentAssignments).map(([orderId, assignment]) => [
                orderId,
                assignment.employee_id ?? NO_RIDER,
              ]),
            ),
          )
          setState('ready')
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Could not load orders and delivery employees.',
          )
          setState('ready')
        }
      }
    }

    void loadOrdersAndRiders()
    return () => {
      cancelled = true
    }
  }, [])

  async function assignOrder(orderId: number) {
    const selection = selectedRiders[orderId]
    if (!selection) {
      setError('Select a rider before assigning this order.')
      return
    }

    const employeeId = selection === NO_RIDER ? null : selection
    const currentAssignment = assignments[orderId]

    if (employeeId === null && !currentAssignment) {
      setOpenAssignmentOrderId(null)
      return
    }

    setUpdatingOrderId(orderId)
    setError('')
    setMessage('')

    try {
      const result = currentAssignment
        ? await supabase
            .from('deliveries')
            .update({
              employee_id: employeeId,
              status: employeeId === null ? 'unassigned' : 'assigned',
            })
            .eq('id', currentAssignment.id)
            .select('id, order_id, employee_id, status')
            .maybeSingle()
        : employeeId === null
          ? null
        : await supabase
            .from('deliveries')
            .insert({
              order_id: orderId,
              employee_id: employeeId,
              status: 'assigned',
            })
            .select('id, order_id, employee_id, status')
            .single()

      if (!result) {
        setOpenAssignmentOrderId(null)
        return
      }
      if (result.error) throw result.error
      const savedAssignment: DeliveryAssignment | null = result.data
      if (!savedAssignment) {
        throw new Error(
          `Order #${orderId} assignment was not saved. Check your Supabase delivery permissions.`,
        )
      }

      setAssignments((current) => ({
        ...current,
        [orderId]: savedAssignment,
      }))
      setSelectedRiders((current) => ({
        ...current,
        [orderId]: savedAssignment.employee_id ?? NO_RIDER,
      }))
      setOpenAssignmentOrderId(null)
      setMessage(
        employeeId === null
          ? `Rider removed from order #${orderId}.`
          : `Order #${orderId} assigned successfully.`,
      )
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : `Could not assign order #${orderId}.`,
      )
    } finally {
      setUpdatingOrderId(null)
    }
  }

  if (state === 'loading') return <p>Loading orders and delivery employees...</p>
  if (state === 'login') return <Navigate to="/login" replace />
  if (state === 'denied') return <Navigate to="/" replace />

  return (
    <section>
      <h1>Assign Orders to Riders</h1>
      <p>Choose a Delivery department employee for each order.</p>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {employees.length === 0 && (
        <p>No employees found in the Delivery department.</p>
      )}

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Date</th>
              <th scope="col">Delivery Address</th>
              <th scope="col">Customer Phone</th>
              <th scope="col">Total</th>
              <th scope="col">Status</th>
              <th scope="col">Rider</th>
              <th scope="col">Assignment</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const assignment = assignments[order.id]
              const selectedRider = selectedRiders[order.id] ?? ''
              const assignedEmployee = employees.find(
                (employee) => employee.id === assignment?.employee_id,
              )
              const unchanged =
                assignment !== undefined &&
                ((assignment.employee_id === null &&
                  selectedRider === NO_RIDER) ||
                  assignment.employee_id === selectedRider)
              const updating = updatingOrderId === order.id
              const pickerOpen = openAssignmentOrderId === order.id

              return (
                <Fragment key={order.id}>
                  <tr>
                    <td>#{order.id}</td>
                    <td>
                      {order.order_date
                        ? new Date(order.order_date).toLocaleString()
                        : '—'}
                    </td>
                    <td>{order.delivery_address}</td>
                    <td>{order.customer_phone ?? '—'}</td>
                    <td>₱{Number(order.total_amount).toFixed(2)}</td>
                    <td>{order.status.replaceAll('_', ' ')}</td>
                    <td>
                      {assignedEmployee
                        ? getRiderDisplayName(assignedEmployee)
                        : 'Unassigned'}
                    </td>
                    <td>
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          disabled={employees.length === 0 || updatingOrderId !== null}
                          aria-expanded={pickerOpen}
                          aria-controls={`rider-picker-${order.id}`}
                          onClick={() => {
                            setError('')
                            setOpenAssignmentOrderId(
                              pickerOpen ? null : order.id,
                            )
                          }}
                        >
                          {updating
                            ? 'Saving...'
                            : assignment?.employee_id
                              ? 'Reassign'
                              : 'Assign'}
                        </button>
                        {pickerOpen && (
                          <div
                            id={`rider-picker-${order.id}`}
                            style={{
                              position: 'absolute',
                              zIndex: 2,
                              top: 'calc(100% + 6px)',
                              right: 0,
                              width: '240px',
                              maxWidth: '80vw',
                              padding: '12px',
                              background: 'var(--card)',
                              color: 'var(--text)',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                            }}
                          >
                            <label
                              htmlFor={`rider-select-${order.id}`}
                              style={{ display: 'block', marginBottom: '8px' }}
                            >
                              Choose a rider
                            </label>
                            <select
                              id={`rider-select-${order.id}`}
                              aria-label={`Choose rider for order ${order.id}`}
                              size={Math.min(employees.length, 5)}
                              value={selectedRider}
                              disabled={updating}
                              style={{
                                width: '100%',
                                maxHeight: '140px',
                                overflowY: 'auto',
                              }}
                              onChange={(event) =>
                                setSelectedRiders((current) => ({
                                  ...current,
                                  [order.id]: event.target.value,
                                }))
                              }
                            >
                              <option value="">Select a rider</option>
                              <option value={NO_RIDER}>None</option>
                              {employees.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                  {employee.first_name}
                                  {employee.middle_initial
                                    ? ` ${employee.middle_initial.trim().charAt(0).toUpperCase()}.`
                                    : ''}{' '}
                                  {employee.last_name}
                                </option>
                              ))}
                            </select>
                            <div
                              style={{
                                display: 'flex',
                                gap: '8px',
                                marginTop: '10px',
                              }}
                            >
                              <button
                                type="button"
                                disabled={
                                  !selectedRider ||
                                  unchanged ||
                                  updatingOrderId !== null
                                }
                                onClick={() => void assignOrder(order.id)}
                              >
                                {selectedRider === NO_RIDER
                                  ? 'Confirm Unassignment'
                                  : assignment?.employee_id
                                    ? 'Confirm Reassignment'
                                    : 'Confirm Assignment'}
                              </button>
                              <button
                                type="button"
                                disabled={updating}
                                onClick={() => setOpenAssignmentOrderId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
