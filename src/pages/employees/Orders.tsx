import { useEffect, useState } from 'react'
import { getCurrentUserRole } from '../../lib/api/auth'
import { supabase } from '../../lib/supabase'
import { appPath } from '../../lib/navigation'

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  role: string | null
}

type Order = {
  id: number
  order_reference: string | null
  user_id: string
  order_date: string
  status: string
  total_amount: number
  delivery_address: string
  created_at: string
  profiles: Profile | Profile[] | null
}

const statusOptions = [
  'pending',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
]

const staffRoles = ['employee', 'rider', 'admin']

function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function checkStaff() {
      try {
        const role = await getCurrentUserRole()

        if (cancelled) return

        if (!role) {
          window.location.href = appPath('/login')
          return
        }

        if (!staffRoles.includes(role)) {
          window.location.href = appPath('/')
          return
        }

        await loadOrders()
      } catch (err) {
        console.error('Could not check staff role:', err)

        if (!cancelled) {
          window.location.href = appPath('/')
        }
      }
    }

    void checkStaff()

    return () => {
      cancelled = true
    }
  }, [])

  async function loadOrders() {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { data, error: queryError } = await supabase
        .from('orders')
        .select(`
          id,
          order_reference,
          user_id,
          order_date,
          status,
          total_amount,
          delivery_address,
          created_at,
          profiles (
            id,
            first_name,
            last_name,
            role
          )
        `)
        .order('created_at', { ascending: false })

      console.log('Orders returned by Supabase:', data)
      console.log('Orders query error:', queryError)

      if (queryError) {
        setError(`Could not load orders: ${queryError.message}`)
        setOrders([])
        return
      }

      setOrders((data ?? []) as unknown as Order[])
    } catch (err) {
      console.error('Unexpected error loading orders:', err)
      setError('An unexpected error occurred while loading orders.')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(order: Order, newStatus: string) {
    setUpdatingId(order.id)
    setError('')
    setMessage('')

    try {
      const { data, error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id)
        .select('id, status')
        .maybeSingle()

      if (updateError) {
        setError(
          `Failed to update order ${getOrderReference(order)}: ${updateError.message}`,
        )
        return
      }

      if (!data) {
        setError(
          `Order ${getOrderReference(order)} was not updated. Check your Supabase UPDATE policy and permissions.`,
        )
        return
      }

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? { ...currentOrder, status: data.status }
            : currentOrder,
        ),
      )

      setMessage(`Order ${getOrderReference(order)} status updated successfully.`)
    } catch (err) {
      console.error('Unexpected status update error:', err)
      setError(
        `An unexpected error occurred updating order ${getOrderReference(order)}.`,
      )
    } finally {
      setUpdatingId(null)
    }
  }

  function getOrderReference(order: Order) {
    return order.order_reference || 'reference unavailable'
  }

  function getCustomerName(order: Order) {
    const profile = Array.isArray(order.profiles)
      ? order.profiles[0]
      : order.profiles

    if (!profile) {
      return 'Unknown Customer'
    }

    const firstName = profile.first_name?.trim() ?? ''
    const lastName = profile.last_name?.trim() ?? ''
    const fullName = `${firstName} ${lastName}`.trim()

    return fullName || 'Unknown Customer'
  }

  function formatDate(date: string) {
    if (!date) return '—'

    const parsedDate = new Date(date)

    return Number.isNaN(parsedDate.getTime())
      ? date
      : parsedDate.toLocaleString()
  }

  function formatStatus(status: string) {
    return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
  }

  return (
    <div style={pageStyle}>
      <h1>Customer Orders</h1>
      <p>View customer orders and update their delivery status.</p>

      <div style={actionsStyle}>
        <button
          type="button"
          onClick={() => {
            window.location.href = appPath('/employee')
          }}
          style={buttonStyle}
        >
          Back to Dashboard
        </button>

        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={loading || updatingId !== null}
          style={buttonStyle}
        >
          {loading ? 'Loading...' : 'Refresh Orders'}
        </button>
      </div>

      {error && (
        <div style={errorStyle}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {message && <p style={successStyle}>{message}</p>}

      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 && !error ? (
        <p>No orders found.</p>
      ) : orders.length > 0 ? (
        <>
          <p>
            Total orders: <strong>{orders.length}</strong>
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface)' }}>
                  <th style={cellStyle}>Order Reference #</th>
                  <th style={cellStyle}>Customer Name</th>
                  <th style={cellStyle}>Order Date</th>
                  <th style={cellStyle}>Delivery Address</th>
                  <th style={cellStyle}>Total Amount</th>
                  <th style={cellStyle}>Status</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => {
                  const options = statusOptions.includes(order.status)
                    ? statusOptions
                    : [order.status, ...statusOptions]

                  return (
                    <tr key={order.id}>
                      <td style={cellStyle}>{getOrderReference(order)}</td>
                      <td style={cellStyle}>{getCustomerName(order)}</td>
                      <td style={cellStyle}>
                        {formatDate(order.order_date)}
                      </td>
                      <td style={cellStyle}>{order.delivery_address}</td>
                      <td style={cellStyle}>
                        ₱{Number(order.total_amount).toFixed(2)}
                      </td>
                      <td style={cellStyle}>
                        <select
                          aria-label={`Status for order ${getOrderReference(order)}`}
                          value={order.status}
                          disabled={updatingId !== null}
                          onChange={(event) =>
                            void updateStatus(order, event.target.value)
                          }
                          style={selectStyle}
                        >
                          {options.map((status) => (
                            <option key={status} value={status}>
                              {formatStatus(status)}
                            </option>
                          ))}
                        </select>

                        {updatingId === order.id && (
                          <span> Saving...</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  padding: '24px',
  fontFamily: 'Arial, sans-serif',
  color: 'var(--text)',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  marginBottom: '20px',
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 16px',
  cursor: 'pointer',
  border: '1px solid var(--accent)',
  borderRadius: '5px',
  backgroundColor: 'var(--accent)',
  color: 'var(--button-text)',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: '850px',
  borderCollapse: 'collapse',
  backgroundColor: 'var(--card)',
}

const cellStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  padding: '10px',
  textAlign: 'left',
  color: 'var(--text)',
  verticalAlign: 'middle',
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  minWidth: '150px',
  borderRadius: '5px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface)',
  color: 'var(--text)',
  cursor: 'pointer',
}

const errorStyle: React.CSSProperties = {
  padding: '12px',
  marginBottom: '16px',
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  borderRadius: '6px',
}

const successStyle: React.CSSProperties = {
  color: '#15803d',
}

export default Orders
