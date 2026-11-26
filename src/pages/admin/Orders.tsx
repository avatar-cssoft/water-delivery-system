import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import DispatchMap from '../../components/DispatchMap'

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
  delivery_latitude?: number | null
  delivery_longitude?: number | null
  delivery_instructions?: string | null
  customer_phone?: string | null
  customer_name?: string
}

type CustomerProfile = {
  id: string
  phone: string | null
  first_name?: string | null
  last_name?: string | null
}

type DeliveryAssignment = {
  id: number
  order_id: number
  employee_id: string | null
  status: string
}

type PageState = 'loading' | 'ready' | 'login' | 'denied'

type PickerPosition = {
  top: number
  left: number
}

const NO_RIDER = '__none__'
const PICKER_WIDTH = 300

const ORDER_STATUSES = [
  'pending',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
]

function getPickerPosition(anchor: HTMLElement): PickerPosition {
  const bounds = anchor.getBoundingClientRect()
  const rightPosition = bounds.right + 8

  const left = Math.min(
    rightPosition,
    Math.max(8, window.innerWidth - PICKER_WIDTH - 8),
  )

  const top = Math.min(Math.max(8, bounds.top), window.innerHeight - 8)

  return { top, left }
}

function getRiderOptionStyle(selected: boolean): CSSProperties {
  return {
    width: '100%',
    padding: '6px 10px',
    border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '6px',
    background: selected ? 'var(--surface)' : 'transparent',
    color: selected ? 'var(--accent)' : 'var(--text)',
    textAlign: 'left',
    font: 'inherit',
    cursor: 'pointer',
  }
}

const styles: Record<string, CSSProperties> = {
  secondaryButton: {
    padding: '9px 14px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    background: 'var(--surface)',
    color: 'var(--text)',
    font: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
  },
  unassignedButton: {
    padding: '9px 14px',
    border: '1px solid var(--danger)',
    borderRadius: '6px',
    background: 'transparent',
    color: 'var(--danger)',
    font: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '9px 14px',
    border: '1px solid var(--danger)',
    borderRadius: '6px',
    background: 'var(--danger)',
    color: '#ffffff',
    font: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
  },
}

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

function formatStatus(status: string) {
  return status.replaceAll('_', ' ')
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

  const [openAssignmentOrderId, setOpenAssignmentOrderId] = useState<
    number | null
  >(null)

  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null)
  const [pickerPosition, setPickerPosition] = useState<PickerPosition | null>(
    null,
  )

  const [riderSearch, setRiderSearch] = useState('')
  const [visibleRiderCount, setVisibleRiderCount] = useState(5)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const pickerRef = useRef<HTMLDivElement>(null)

  const [state, setState] = useState<PageState>('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null)
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null)

  // Filter orders using the search bar and status dropdown.
  const filteredOrders = orders.filter((order) => {
    const search = searchTerm.trim().toLowerCase()

    const matchesSearch =
      search === '' ||
      String(order.id).includes(search) ||
      (order.delivery_address ?? '').toLowerCase().includes(search) ||
      (order.customer_phone ?? '').toLowerCase().includes(search) ||
      (order.customer_name ?? '').toLowerCase().includes(search)

    const matchesStatus =
      statusFilter === 'all' || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Close the rider picker when clicking outside or scrolling.
  useEffect(() => {
    if (openAssignmentOrderId === null || !pickerAnchor) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !pickerRef.current?.contains(event.target)
      ) {
        setOpenAssignmentOrderId(null)
        setPickerAnchor(null)
      }
    }

    const closeOnOutsideScroll = (event: Event) => {
      if (
        event.target instanceof Node &&
        !pickerRef.current?.contains(event.target)
      ) {
        setOpenAssignmentOrderId(null)
        setPickerAnchor(null)
      }
    }

    const updatePosition = () => {
      setPickerPosition(getPickerPosition(pickerAnchor))
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('scroll', closeOnOutsideScroll, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('scroll', closeOnOutsideScroll, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [openAssignmentOrderId, pickerAnchor])

  // Load orders, employees, assignments, and customer information.
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
                'id, user_id, order_date, status, total_amount, delivery_address, delivery_latitude, delivery_longitude, delivery_instructions',
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

        const customerIds = [
          ...new Set(orderRows.map((order) => order.user_id)),
        ]

        let customerProfiles: CustomerProfile[] = []

        if (customerIds.length > 0) {
          const { data: customerData, error: customerError } = await supabase
            .from('profiles')
            .select('id, phone, first_name, last_name')
            .in('id', customerIds)

          if (customerError) throw customerError

          customerProfiles = (customerData ?? []) as CustomerProfile[]
        }

        if (!cancelled) {
          const currentAssignments: Record<number, DeliveryAssignment> = {}

          for (const assignment of deliveriesResult.data ?? []) {
            currentAssignments[assignment.order_id] = assignment
          }

          const customerById = new Map(
            customerProfiles.map((profile) => [
              profile.id,
              {
                phone: profile.phone,
                name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
              },
            ]),
          )

          setOrders(
            orderRows.map((order) => ({
              ...order,
              customer_phone: customerById.get(order.user_id)?.phone,
              customer_name: customerById.get(order.user_id)?.name,
            })),
          )

          setEmployees(employeesResult.data ?? [])
          setAssignments(currentAssignments)

          setSelectedRiders(
            Object.fromEntries(
              Object.entries(currentAssignments).map(
                ([orderId, assignment]) => [
                  orderId,
                  assignment.employee_id ?? NO_RIDER,
                ],
              ),
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

  // Assign, reassign, or unassign a rider.
  async function assignOrder(
    orderId: number,
    selection = selectedRiders[orderId],
  ) {
    if (!selection) {
      setError('Select a rider before assigning this order.')
      return
    }

    const employeeId = selection === NO_RIDER ? null : selection
    const currentAssignment = assignments[orderId]

    if (employeeId === null && !currentAssignment) {
      setOpenAssignmentOrderId(null)
      setPickerAnchor(null)
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
        setPickerAnchor(null)
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
      setPickerAnchor(null)

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

  // Delete an order and its delivery assignment.
  async function deleteOrder(orderId: number) {
    const confirmed = window.confirm(
      `Are you sure you want to delete order #${orderId}? This action cannot be undone.`,
    )

    if (!confirmed) return

    setDeletingOrderId(orderId)
    setError('')
    setMessage('')

    try {
      // Remove associated delivery records first.
      const { error: deliveryError } = await supabase
        .from('deliveries')
        .delete()
        .eq('order_id', orderId)

      if (deliveryError) throw deliveryError

      // Delete the order.
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (orderError) throw orderError

      // Update the page without reloading.
      setOrders((current) =>
        current.filter((order) => order.id !== orderId),
      )

      setAssignments((current) => {
        const updated = { ...current }
        delete updated[orderId]
        return updated
      })

      setSelectedRiders((current) => {
        const updated = { ...current }
        delete updated[orderId]
        return updated
      })

      if (openAssignmentOrderId === orderId) {
        setOpenAssignmentOrderId(null)
        setPickerAnchor(null)
      }

      setMessage(`Order #${orderId} deleted successfully.`)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : `Could not delete order #${orderId}.`,
      )
    } finally {
      setDeletingOrderId(null)
    }
  }

  if (state === 'loading') {
    return <p>Loading orders and delivery employees...</p>
  }

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

      {/* Dispatch map */}
      {orders.length > 0 && (
        <DispatchMap orders={orders} assigned={assignments} />
      )}

      {/* Search and status filter */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          margin: '20px 0',
        }}
      >
        <input
          type="search"
          aria-label="Search orders"
          placeholder="Search by order ID, customer, phone, or address..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          style={{
            flex: '1 1 250px',
            minWidth: '200px',
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'var(--bg)',
            color: 'var(--text)',
            font: 'inherit',
          }}
        />

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{
            minWidth: '180px',
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'var(--bg)',
            color: 'var(--text)',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Statuses</option>

          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatStatus(status).replace(/\b\w/g, (letter) =>
                letter.toUpperCase(),
              )}
            </option>
          ))}
        </select>
      </div>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : filteredOrders.length === 0 ? (
        <p>No orders match your search or selected status.</p>
      ) : (
        <>
          <p>
            Showing {filteredOrders.length} of {orders.length} orders.
          </p>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Date</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Delivery Address</th>
                  <th scope="col">Customer Phone</th>
                  <th scope="col">Total</th>
                  <th scope="col">Status</th>
                  <th scope="col">Rider</th>
                  <th scope="col">Assignment</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => {
                  const assignment = assignments[order.id]

                  const assignedEmployee = employees.find(
                    (employee) =>
                      employee.id === assignment?.employee_id,
                  )

                  const updating = updatingOrderId === order.id
                  const deleting = deletingOrderId === order.id
                  const pickerOpen = openAssignmentOrderId === order.id

                  return (
                    <Fragment key={order.id}>
                      <tr
                        id={`dispatch-order-${order.id}`}
                        tabIndex={-1}
                      >
                        <td>#{order.id}</td>

                        <td>
                          {order.order_date
                            ? new Date(order.order_date).toLocaleString()
                            : '—'}
                        </td>

                        <td>{order.customer_name || '—'}</td>

                        <td>
                          {order.delivery_address}
                          {order.delivery_instructions && (
                            <p>{order.delivery_instructions}</p>
                          )}
                        </td>

                        <td>{order.customer_phone ?? '—'}</td>

                        <td>
                          ₱{Number(order.total_amount).toFixed(2)}
                        </td>

                        <td>{formatStatus(order.status)}</td>

                        <td>
                          {assignedEmployee
                            ? getRiderDisplayName(assignedEmployee)
                            : 'Unassigned'}
                        </td>

                        <td>
                          <button
                            type="button"
                            disabled={
                              employees.length === 0 ||
                              updatingOrderId !== null ||
                              deletingOrderId !== null
                            }
                            aria-expanded={pickerOpen}
                            aria-controls={
                              pickerOpen
                                ? `rider-picker-${order.id}`
                                : undefined
                            }
                            onClick={(event) => {
                              setError('')

                              if (pickerOpen) {
                                setOpenAssignmentOrderId(null)
                                setPickerAnchor(null)
                              } else {
                                const anchor = event.currentTarget

                                setRiderSearch('')
                                setVisibleRiderCount(5)
                                setPickerAnchor(anchor)
                                setPickerPosition(
                                  getPickerPosition(anchor),
                                )
                                setOpenAssignmentOrderId(order.id)
                              }
                            }}
                          >
                            {updating
                              ? 'Saving...'
                              : assignment?.employee_id
                                ? 'Reassign'
                                : 'Assign'}
                          </button>
                        </td>

                        <td>
                          <button
                            type="button"
                            disabled={
                              deletingOrderId !== null ||
                              updatingOrderId !== null
                            }
                            onClick={() => void deleteOrder(order.id)}
                            style={styles.deleteButton}
                          >
                            {deleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Rider assignment picker */}
      {openAssignmentOrderId !== null &&
        pickerPosition !== null &&
        createPortal(
          <div
            ref={pickerRef}
            id={`rider-picker-${openAssignmentOrderId}`}
            style={{
              position: 'fixed',
              zIndex: 1000,
              top: pickerPosition.top,
              left: pickerPosition.left,
              width: PICKER_WIDTH,
              maxWidth: 'calc(100vw - 16px)',
              maxHeight: Math.max(
                0,
                window.innerHeight - pickerPosition.top - 8,
              ),
              overflowY: 'auto',
              boxSizing: 'border-box',
              padding: '16px',
              background: 'var(--card)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}
          >
            {(() => {
              const orderId = openAssignmentOrderId
              const assignment = assignments[orderId]
              const selectedRider =
                selectedRiders[orderId] ?? NO_RIDER

              const unchanged =
                assignment === undefined
                  ? true
                  : assignment.employee_id === null

              const updating = updatingOrderId === orderId

              const filteredRiders = employees.filter((employee) =>
                `${employee.first_name} ${employee.middle_initial ?? ''} ${employee.last_name}`
                  .toLowerCase()
                  .includes(riderSearch.trim().toLowerCase()),
              )

              const visibleRiders = filteredRiders.slice(
                0,
                visibleRiderCount,
              )

              return (
                <>
                  <label
                    htmlFor={`rider-search-${orderId}`}
                    style={{
                      display: 'block',
                      marginBottom: '10px',
                      fontWeight: 600,
                    }}
                  >
                    Assign rider to order #{orderId}
                  </label>

                  <input
                    id={`rider-search-${orderId}`}
                    type="search"
                    aria-label="Search riders"
                    placeholder="Search riders..."
                    value={riderSearch}
                    disabled={updating}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '9px 10px',
                      marginBottom: '10px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                    }}
                    onChange={(event) => {
                      setRiderSearch(event.target.value)
                      setVisibleRiderCount(5)
                    }}
                  />

                  <div
                    role="listbox"
                    aria-label={`Choose rider for order ${orderId}`}
                    style={{
                      display: 'grid',
                      gap: '4px',
                      maxHeight: '126px',
                      overflowY: 'auto',
                      padding: '2px',
                    }}
                    onScroll={(event) => {
                      const list = event.currentTarget

                      if (
                        list.scrollTop + list.clientHeight >=
                        list.scrollHeight - 8
                      ) {
                        setVisibleRiderCount((current) =>
                          Math.min(
                            current + 5,
                            filteredRiders.length,
                          ),
                        )
                      }
                    }}
                  >
                    {visibleRiders.map((employee) => (
                      <button
                        key={employee.id}
                        type="button"
                        role="option"
                        aria-selected={
                          selectedRider === employee.id
                        }
                        disabled={updating}
                        onClick={() => {
                          setSelectedRiders((current) => ({
                            ...current,
                            [orderId]: employee.id,
                          }))

                          void assignOrder(orderId, employee.id)
                        }}
                        style={getRiderOptionStyle(
                          selectedRider === employee.id,
                        )}
                      >
                        {employee.first_name}
                        {employee.middle_initial
                          ? ` ${employee.middle_initial.trim().charAt(0).toUpperCase()}.`
                          : ''}{' '}
                        {employee.last_name}
                      </button>
                    ))}

                    {filteredRiders.length === 0 && (
                      <p
                        style={{
                          color: 'var(--muted)',
                          margin: '8px 4px',
                        }}
                      >
                        No riders match your search.
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginTop: '10px',
                    }}
                  >
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => {
                        setOpenAssignmentOrderId(null)
                        setPickerAnchor(null)
                      }}
                      style={styles.secondaryButton}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={
                        unchanged || updatingOrderId !== null
                      }
                      onClick={() => {
                        setSelectedRiders((current) => ({
                          ...current,
                          [orderId]: NO_RIDER,
                        }))

                        void assignOrder(orderId, NO_RIDER)
                      }}
                      style={styles.unassignedButton}
                    >
                      {updating && selectedRider === NO_RIDER
                        ? 'Saving...'
                        : 'Unassign'}
                    </button>
                  </div>
                </>
              )
            })()}
          </div>,
          document.body,
        )}
    </section>
  )
}
