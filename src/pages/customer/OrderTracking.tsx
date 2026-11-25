import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DeliveryMap from '../../components/DeliveryMap'
import { deliveryPoint, type RiderPosition } from '../../lib/deliveryMap'
import { supabase } from '../../lib/supabase'

type Order = {
  id: number
  order_reference: string | null
  status: string
  order_date: string | null
  tracking_updated_at?: string | null
  delivery_address: string
  delivery_latitude?: number | null
  delivery_longitude?: number | null
}
const steps = ['pending', 'preparing', 'out_for_delivery', 'delivered']

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Order placed', confirmed: 'Confirmed', processing: 'Preparing', preparing: 'Preparing',
    out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled',
  }
  return labels[status] ?? status.replaceAll('_', ' ')
}

export default function OrderTracking() {
  const { orderId } = useParams()
  return <TrackingView key={orderId ?? 'list'} orderId={orderId} />
}

function TrackingView({ orderId }: { orderId?: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [position, setPosition] = useState<{ data: RiderPosition; stale: boolean } | null>(null)
  const [problem, setProblem] = useState('')
  const [login, setLogin] = useState(false)
  const [statusOnly, setStatusOnly] = useState(false)

  useEffect(() => {
    let active = true
    let running = false
    async function refresh() {
      if (running) return
      running = true
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        if (!active) return
        if (authError) throw authError
        if (!session) {
          setLogin(true)
          setOrders([])
          setPosition(null)
          return
        }
        setLogin(false)
        if (orderId && !/^[1-9]\d*$/.test(orderId)) {
          setOrders([])
          setPosition(null)
          return
        }
        const tracking = await supabase.rpc('get_customer_tracking_orders', {
          target_order_id: orderId ?? null,
        })
        if (!active) return
        const migrationPending = tracking.error?.code === 'PGRST202'
        let ownOrders: Order[]
        if (migrationPending) {
          let legacyOrders = supabase.from('orders')
            .select('id, order_reference, status, order_date, delivery_address')
            .eq('user_id', session.user.id)
          if (orderId) legacyOrders = legacyOrders.eq('id', orderId)
          const fallback = await legacyOrders.order('id', { ascending: false })
          if (!active) return
          if (fallback.error) throw fallback.error
          ownOrders = fallback.data ?? []
        } else {
          if (tracking.error) throw tracking.error
          ownOrders = (tracking.data ?? []) as Order[]
        }
        setStatusOnly(migrationPending)
        setOrders(ownOrders)
        setProblem('')
        if (!migrationPending && orderId && ownOrders[0]?.status === 'out_for_delivery') {
          const { data: latest, error: locationError } = await supabase.rpc('get_delivery_position', { target_order_id: orderId })
          if (active) {
            const data = latest as RiderPosition | null
            setPosition(!locationError && data ? { data, stale: Date.now() - Date.parse(data.captured_at) > 60000 } : null)
            if (locationError) setProblem('Live location is currently unavailable.')
          }
        } else {
          setPosition(null)
        }
      } catch {
        if (active) {
          setPosition(null)
          setProblem('Order updates are temporarily unavailable. Refresh the page to retry.')
        }
      } finally {
        running = false
      }
    }
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 10000)
    return () => { active = false; window.clearInterval(timer) }
  }, [orderId])

  const order = orders?.[0]
  const destination = deliveryPoint(order)
  const live = order?.status === 'out_for_delivery' ? position?.data ?? null : null
  const currentStep = order ? steps.indexOf(['processing', 'confirmed'].includes(order.status) ? 'preparing' : order.status) : -1

  return (
    <main className="delivery-tracking">
      <h1>{orderId ? 'Track order' : 'My orders'}</h1>
      {orderId && <Link to="/orders">All my orders</Link>}
      {problem && <p role="alert">{problem}</p>}
      {login && <p><Link to="/login">Sign in</Link> to view your orders.</p>}
      {!login && !problem && !orders && <p role="status">Loading orders…</p>}
      {!login && orders?.length === 0 && <div className="tracking-card">
        <p>{orderId ? 'Order unavailable.' : 'You have no orders yet.'}</p>
        {!orderId && <Link to="/catalog">Browse products</Link>}
      </div>}
      {!orderId && orders && orders.length > 0 && <ul className="delivery-order-list">
        {orders.map(item => {
          const reference = `Order #${item.order_reference ?? item.id}`
          return <li key={item.id} className="tracking-card">
            <div>
              <Link to={`/orders/${item.id}/track`}>{reference}</Link>
              {item.order_date && <p className="tracking-date">
                Placed <time dateTime={item.order_date}>{new Date(item.order_date).toLocaleDateString()}</time>
              </p>}
            </div>
            <span className="tracking-status" data-status={item.status}>{statusLabel(item.status)}</span>
          </li>
        })}
      </ul>}
      {orderId && order && <section className="delivery-panel tracking-card">
        <div className="tracking-order-heading">
          <h2>Order #{order.order_reference ?? order.id}</h2>
          <span role="status" className="tracking-status" data-status={order.status}>{statusLabel(order.status)}</span>
        </div>
        {order.tracking_updated_at
          ? <p>Order updated {new Date(order.tracking_updated_at).toLocaleString()}</p>
          : order.order_date && <p>Order placed {new Date(order.order_date).toLocaleString()}</p>}
        {currentStep >= 0 && <ol className="delivery-timeline" aria-label="Delivery progress">
          {steps.map((step, index) => <li key={step} data-complete={index < currentStep} aria-current={index === currentStep ? 'step' : undefined}>
            {index < currentStep ? '✓ ' : ''}{statusLabel(step)}
          </li>)}
        </ol>}
        <p><strong>Drop-off address</strong><br />{order.delivery_address}</p>
        {(destination || live) && <DeliveryMap markers={[
          ...(destination ? [{ ...destination, label: 'Drop-off' }] : []),
          ...(live ? [{ ...live, label: 'Rider', rider: true }] : []),
        ]} />}
        {order.status === 'out_for_delivery' && <p>
          {live ? `${position?.stale ? 'Last known rider position' : 'Rider location'} · updated ${new Date(live.captured_at).toLocaleTimeString()}`
            : statusOnly ? 'Live rider location is unavailable. Order status will still update here.' : 'Waiting for a rider location update.'}
        </p>}
      </section>}
    </main>
  )
}
