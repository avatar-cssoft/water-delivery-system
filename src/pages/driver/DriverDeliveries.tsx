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

type AssignedOrder = {
  delivery: Delivery
  order: Order | undefined
}

type PageState = 'loading' | 'ready' | 'login' | 'error'

function formatStatus(status: string) {
  return status.replaceAll('_', ' ')
}

function formatDate(value: string | null) {
  if (!value) return 'Not available'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString()
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
              'id, user_id, order_date, status, total_amount, delivery_address',
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
          Orders assigned to your delivery account.
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
            {assignedOrders.map(({ delivery, order }) => (
              <article key={delivery.id} style={styles.orderCard}>
                <div style={styles.orderHeader}>
                  <h3 style={styles.orderTitle}>Order #{delivery.order_id}</h3>
                  <span style={styles.deliveryStatus}>
                    {formatStatus(delivery.status)}
                  </span>
                </div>
                <dl style={styles.orderDetails}>
                  <div>
                    <dt>Delivery address</dt>
                    <dd>
                      {order?.delivery_address ?? 'Order details unavailable'}
                    </dd>
                  </div>
                  <div>
                    <dt>Customer phone</dt>
                    <dd>
                      {order?.customer_phone ? (
                        <a href={`tel:${order.customer_phone}`}>
                          {order.customer_phone}
                        </a>
                      ) : (
                        'Not available'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Order status</dt>
                    <dd>{order ? formatStatus(order.status) : 'Unavailable'}</dd>
                  </div>
                  <div>
                    <dt>Order date</dt>
                    <dd>{formatDate(order?.order_date ?? null)}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>
                      {order
                        ? `₱${Number(order.total_amount).toFixed(2)}`
                        : 'Unavailable'}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },
  orderTitle: {
    color: 'var(--text)',
    margin: 0,
  },
  deliveryStatus: {
    borderRadius: '999px',
    padding: '4px 12px',
    backgroundColor: 'var(--bg)',
    color: 'var(--accent)',
    textTransform: 'capitalize',
    fontSize: '13px',
  },
  orderDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    margin: '20px 0 0',
  },
}
