
import { useEffect, useState } from 'react'
import { getCurrentUserRole } from '../../lib/api/auth'
import { supabase } from '../../lib/supabase'

type Order = {
  id: number
  user_id: string
  order_date: string
  status: string
  total_amount: number
  delivery_address: string
  created_at: string
}

const statusOptions = [
  'pending',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
]

// Staff who may manage orders. Login.tsx and the profiles table use
// 'employee'; src/types uses 'rider'.
const staffRoles = ['employee', 'rider', 'admin']

function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  // Only staff see this page. This only hides it: orders still need RLS in
  // the database to stop other users from reading or changing them.
  useEffect(() => {
    const checkStaff = async () => {
      let role: string | null

      try {
        role = await getCurrentUserRole()
      } catch {
        window.location.href = '/'
        return
      }

      if (role === null) {
        window.location.href = '/login'
        return
      }

      if (!staffRoles.includes(role)) {
        window.location.href = '/'
        return
      }

      void loadOrders()
    }

    void checkStaff()
  }, [])

  async function loadOrders() {
    setLoading(true)
    setError('')
    setMessage('')

    const { data, error: queryError } = await supabase
      .from('orders')
      .select(
        'id, user_id, order_date, status, total_amount, delivery_address, created_at'
      )
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('Error loading orders:', queryError.message)
      setError(queryError.message)
      setOrders([])
    } else {
      setOrders((data ?? []) as Order[])
    }

    setLoading(false)
  }

  async function updateStatus(orderId: number, newStatus: string) {
    setUpdatingId(orderId)
    setError('')
    setMessage('')

    const { data, error: updateError } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select('id, status')
      .maybeSingle()

    if (updateError) {
      setError(`Failed to update order #${orderId}: ${updateError.message}`)
    } else if (!data) {
      setError(
        `Order #${orderId} was not updated. Check your Supabase UPDATE policy and permissions.`
      )
    } else {
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? { ...order, status: data.status }
            : order
        )
      )

      setMessage(`Order #${orderId} status updated successfully.`)
    }

    setUpdatingId(null)
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
      letter.toUpperCase()
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
            window.location.href = '/employee'
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
                <tr style={{ backgroundColor: '#e5e7eb' }}>
                  <th style={cellStyle}>Order ID</th>
                  <th style={cellStyle}>Customer ID</th>
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
                      <td style={cellStyle}>{order.id}</td>
                      <td style={cellStyle}>{order.user_id}</td>
                      <td style={cellStyle}>
                        {formatDate(order.order_date)}
                      </td>
                      <td style={cellStyle}>{order.delivery_address}</td>
                      <td style={cellStyle}>
                        ₱{Number(order.total_amount).toFixed(2)}
                      </td>
                      <td style={cellStyle}>
                        <select
                          aria-label={`Status for order ${order.id}`}
                          value={order.status}
                          disabled={updatingId !== null}
                          onChange={(event) =>
                            void updateStatus(order.id, event.target.value)
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
  color: '#1f2937',
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
  border: '1px solid #d1d5db',
  borderRadius: '5px',
  backgroundColor: '#f9fafb',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: '850px',
  borderCollapse: 'collapse',
}

const cellStyle: React.CSSProperties = {
  border: '1px solid #d1d5db',
  padding: '10px',
  textAlign: 'left',
}

const selectStyle: React.CSSProperties = {
  padding: '8px',
  borderRadius: '5px',
  border: '1px solid #d1d5db',
  backgroundColor: '#fff',
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
