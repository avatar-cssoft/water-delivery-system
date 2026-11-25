import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Delivery = {
  id: number
  order_id: number
  status: string
  created_at: string | null
}

type Order = {
  id: number
  order_reference: string | null
  user_id: string
  order_date: string | null
  status: string
  total_amount: number
  delivery_address: string
  requested_delivery_window_start?: string | null
  requested_delivery_window_end?: string | null
  customer_phone?: string
}

type CustomerProfile = {
  id: string
  phone: string
}

type AssignedOrder = {
  delivery: Delivery
  order: Order | undefined
}

type PageState = 'loading' | 'ready' | 'login' | 'error'

function formatStatus(status: string) {
  return status.replaceAll('_', ' ').toUpperCase()
}

function getOrderStatusColors(status: string | undefined) {
  switch (status?.toLowerCase()) {
    case 'pending':
      return { backgroundColor: '#fef3c7', color: '#92400e' }
    case 'preparing':
      return { backgroundColor: '#ffedd5', color: '#9a3412' }
    case 'out_for_delivery':
      return { backgroundColor: '#dbeafe', color: '#1e40af' }
    case 'delivered':
      return { backgroundColor: '#dcfce7', color: '#166534' }
    case 'cancelled':
      return { backgroundColor: '#fee2e2', color: '#991b1b' }
    default:
      return { backgroundColor: 'var(--bg)', color: 'var(--muted)' }
  }
}

function formatRequestedWindow(value: string | null | undefined) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
}

function compareAssignedOrders(first: AssignedOrder, second: AssignedOrder) {
  const firstOrderDate = getTimestamp(first.order?.order_date)
  const secondOrderDate = getTimestamp(second.order?.order_date)

  if (firstOrderDate !== secondOrderDate) {
    return firstOrderDate - secondOrderDate
  }

  return (
    getTimestamp(first.delivery.created_at) -
    getTimestamp(second.delivery.created_at)
  )
}

export default function DriverDeliveries() {
  const [assignedOrders, setAssignedOrders] = useState<AssignedOrder[]>([])
  const [pageState, setPageState] = useState<PageState>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadAssignedOrders() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        if (!user) {
          if (!cancelled) setPageState('login')
          return
        }

        const { data: deliveryData, error: deliveriesError } = await supabase
          .from('deliveries')
          .select('id, order_id, status, created_at')
          .eq('employee_id', user.id)
          .order('created_at', { ascending: false })

        if (deliveriesError) throw deliveriesError

        const deliveries = (deliveryData ?? []) as Delivery[]
        let orders: Order[] = []
        let customerProfiles: CustomerProfile[] = []

        if (deliveries.length > 0) {
          const { data: orderData, error: ordersError } = await supabase
            .from('orders')
            .select(
              'id, order_reference, user_id, order_date, status, total_amount, delivery_address',
            )
            .in(
              'id',
              deliveries.map((delivery) => delivery.order_id),
            )

          if (ordersError) throw ordersError
          orders = (orderData ?? []) as Order[]

          const customerIds = [...new Set(orders.map((order) => order.user_id))]
          if (customerIds.length > 0) {
            const { data: customerData, error: customersError } = await supabase
              .from('profiles')
              .select('id, phone')
              .in('id', customerIds)

            if (customersError) throw customersError
            customerProfiles = (customerData ?? []) as CustomerProfile[]
          }
        }

        if (!cancelled) {
          const ordersById = new Map(orders.map((order) => [order.id, order]))
          const phoneByCustomerId = new Map(
            customerProfiles.map((profile) => [profile.id, profile.phone]),
          )
          setAssignedOrders(
            deliveries.map((delivery) => {
              const order = ordersById.get(delivery.order_id)
              return {
                delivery,
                order: order
                  ? {
                      ...order,
                      customer_phone: phoneByCustomerId.get(order.user_id),
                    }
                  : undefined,
              }
            }),
          )
          setPageState('ready')
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Could not load your assigned orders.',
          )
          setPageState('error')
        }
      }
    }

    void loadAssignedOrders()
    return () => {
      cancelled = true
    }
  }, [])

  const inProgressCount = assignedOrders.filter(({ delivery }) =>
    ['in_progress', 'out_for_delivery'].includes(delivery.status.toLowerCase()),
  ).length
  const completedCount = assignedOrders.filter(({ delivery }) =>
    ['completed', 'delivered'].includes(delivery.status.toLowerCase()),
  ).length
  const sortedAssignedOrders = [...assignedOrders].sort(compareAssignedOrders)

  return (
    <>
      <div style={styles.cards}>
        <SummaryCard
          label="Assigned Deliveries"
          value={pageState === 'ready' ? assignedOrders.length : '—'}
          description="Orders currently assigned to you"
        />
        <SummaryCard
          label="In Progress"
          value={pageState === 'ready' ? inProgressCount : '—'}
          description="Deliveries on the way"
        />
        <SummaryCard
          label="Completed"
          value={pageState === 'ready' ? completedCount : '—'}
          description="Successfully delivered"
        />
      </div>

      <section style={styles.section} aria-labelledby="my-deliveries-heading">
        <h2 id="my-deliveries-heading" style={styles.sectionTitle}>
          My Deliveries
        </h2>
        <p style={styles.sectionSubtitle}>
          Orders are shown oldest first by order time, with barangay listed on
          each delivery.
        </p>

        {pageState === 'loading' && (
          <p role="status" style={styles.message}>
            Loading your assigned orders...
          </p>
        )}
        {pageState === 'login' && (
          <p role="alert" style={styles.message}>
            Sign in to view your assigned orders.
          </p>
        )}
        {pageState === 'error' && (
          <p role="alert" style={styles.error}>
            Could not load your assigned orders: {error}
          </p>
        )}
        {pageState === 'ready' && assignedOrders.length === 0 && (
          <div style={styles.emptyState}>
            <h3>No deliveries assigned yet</h3>
            <p>
              Orders assigned to you by an administrator will appear here.
            </p>
          </div>
        )}
        {pageState === 'ready' && assignedOrders.length > 0 && (
          <div style={styles.orderList}>
            {sortedAssignedOrders.map(({ delivery, order }) => (
              <article key={delivery.id} style={styles.orderCard}>
                <div style={styles.orderHeader}>
                  <h3 style={styles.orderTitle}>
                    {order?.order_reference
                      ? `Order #${order.order_reference}`
                      : 'Order reference unavailable'}
                  </h3>
                  <div style={styles.orderHeaderMeta}>
                    <div style={styles.headerDetail}>
                      <strong
                        style={{
                          ...styles.headerBadge,
                          ...styles.orderTotal,
                        }}
                      >
                        Total: {order
                          ? `₱${Number(order.total_amount).toFixed(2)}`
                          : 'Unavailable'}
                      </strong>
                    </div>
                    <div style={styles.statusGroup}>
                      <span
                        style={{
                          ...styles.headerBadge,
                          ...styles.orderStatus,
                          ...getOrderStatusColors(order?.status),
                        }}
                      >
                        {order ? formatStatus(order.status) : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>
                <dl style={styles.orderDetails}>
                  <div>
                    <dt>Delivery address</dt>
                    <dd style={styles.orderDetailValue}>
                      {order?.delivery_address ?? 'Order details unavailable'}
                    </dd>
                  </div>
                  <div>
                    <dt>Customer phone</dt>
                    <dd style={styles.orderDetailValue}>
                      {order?.customer_phone ? (
                        <a href={`tel:${order.customer_phone}`}>
                          {order.customer_phone}
                        </a>
                      ) : (
                        'Not available'
                      )}
                    </dd>
                  </div>
                  <div style={styles.requestedWindowItem}>
                    <dt>Requested Delivery Window</dt>
                    <dd style={styles.requestedWindow}>
                      {order?.requested_delivery_window_start ||
                      order?.requested_delivery_window_end ? (
                        <div style={styles.windowTimes}>
                          <div>
                            <span style={styles.windowLabel}>From</span>
                            {formatRequestedWindow(
                              order.requested_delivery_window_start,
                            ) ?? 'Not set'}
                          </div>
                          <div>
                            <span style={styles.windowLabel}>To</span>
                            {formatRequestedWindow(
                              order.requested_delivery_window_end,
                            ) ?? 'Not set'}
                          </div>
                        </div>
                      ) : (
                        <div style={styles.windowWip}>
                          <span style={styles.wipBadge}>WIP</span>
                          <span>
                            Requested delivery times will appear here when
                            scheduling is available.
                          </span>
                        </div>
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string
  value: number | string
  description: string
}) {
  return (
    <article style={styles.card}>
      <p style={styles.cardLabel}>{label}</p>
      <p style={styles.cardNumber}>{value}</p>
      <p style={styles.cardDescription}>{description}</p>
    </article>
  )
}

const styles: Record<string, React.CSSProperties> = {
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  card: {
    backgroundColor: 'var(--surface)',
    padding: '22px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
  },
  cardLabel: {
    color: 'var(--muted)',
    fontSize: '14px',
    margin: 0,
  },
  cardNumber: {
    color: 'var(--text)',
    fontSize: '32px',
    fontWeight: 700,
    margin: '12px 0',
  },
  cardDescription: {
    color: 'var(--muted)',
    fontSize: '13px',
    margin: 0,
  },
  section: {
    backgroundColor: 'var(--surface)',
    padding: '25px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
  },
  sectionTitle: {
    color: 'var(--text)',
    margin: 0,
  },
  sectionSubtitle: {
    color: 'var(--muted)',
    fontSize: '14px',
  },
  message: {
    color: 'var(--muted)',
    padding: '24px 0',
  },
  error: {
    color: 'var(--danger)',
    padding: '24px 0',
  },
  emptyState: {
    textAlign: 'center',
    padding: '45px 20px',
    color: 'var(--muted)',
  },
  orderList: {
    display: 'grid',
    gap: '16px',
    marginTop: '24px',
  },
  orderCard: {
    padding: '20px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    backgroundColor: 'var(--card)',
  },
  orderHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },
  orderHeaderMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: '24px',
  },
  headerDetail: {
    display: 'grid',
    gap: '4px',
  },
  headerDetailLabel: {
    color: 'var(--muted)',
    fontSize: '12px',
  },
  headerBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    minWidth: '140px',
    height: '38px',
    padding: '0 12px',
    borderRadius: '999px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  orderTotal: {
    border: '1px solid #bfd8c5',
    backgroundColor: '#dcefe1',
    color: '#25352a',
    fontSize: '15px',
    fontWeight: 700,
  },
  statusGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  orderTitle: {
    color: 'var(--text)',
    margin: 0,
  },
  orderStatus: {
    fontSize: '13px',
    fontWeight: 700,
  },
  orderDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
    alignItems: 'start',
    gap: '20px 28px',
    margin: '20px 0 0',
  },
  requestedWindowItem: {
    gridColumn: '1 / -1',
  },
  orderDetailValue: {
    margin: '4px 0 0',
    textAlign: 'left',
    overflowWrap: 'anywhere',
  },
  requestedWindow: {
    margin: '4px 0 0',
    overflowWrap: 'anywhere',
  },
  windowTimes: {
    display: 'grid',
    gap: '8px',
    color: 'var(--text)',
  },
  windowLabel: {
    display: 'inline-block',
    minWidth: '42px',
    color: 'var(--muted)',
    fontSize: '13px',
    marginRight: '8px',
  },
  windowWip: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    color: 'var(--muted)',
    lineHeight: 1.5,
  },
  wipBadge: {
    flexShrink: 0,
    borderRadius: '999px',
    padding: '3px 9px',
    backgroundColor: 'var(--bg)',
    color: 'var(--accent)',
    fontSize: '12px',
    fontWeight: 700,
  },
}
