import { useEffect, useState } from 'react'
import DeliveryMap from './DeliveryMap'
import { deliveryPoint, type RiderPosition } from '../lib/deliveryMap'
import { supabase } from '../lib/supabase'

type DispatchOrder = Parameters<typeof deliveryPoint>[0] & {
  id: number
  status: string
  delivery_address: string
}

export default function DispatchMap({ orders, assigned }: {
  orders: DispatchOrder[]
  assigned: Record<number, { employee_id: string | null }>
}) {
  const [visible, setVisible] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<number | null>(null)
  const [position, setPosition] = useState<{ id: number; data: RiderPosition } | null>(null)
  const filtered = orders.filter(order =>
    filter === 'all' || (filter === 'unassigned' ? !assigned[order.id]?.employee_id : order.status === filter))
  const order = filtered.find(item => item.id === selected)
  const activeOrder = visible ? order?.id ?? null : null

  useEffect(() => {
    if (activeOrder === null) return
    let active = true
    async function refresh() {
      const { data } = await supabase.rpc('get_delivery_position', { target_order_id: activeOrder })
      if (active) setPosition(data ? { id: activeOrder!, data: data as RiderPosition } : null)
    }
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 10000)
    return () => { active = false; window.clearInterval(timer) }
  }, [activeOrder])

  const live = activeOrder !== null && position?.id === activeOrder ? position.data : null
  const markers = filtered.flatMap(item => {
    const point = deliveryPoint(item)
    return point ? [{ ...point, label: `Order #${item.id}`, onSelect: () => setSelected(item.id) }] : []
  })

  return <section className="delivery-panel">
    <button type="button" aria-expanded={visible} onClick={() => setVisible(!visible)}>
      {visible ? 'List only' : 'Show dispatch map'}
    </button>
    {visible && <>
      <label>Map filter <select value={filter} onChange={event => { setFilter(event.target.value); setSelected(null) }}>
        <option value="all">All orders</option>
        <option value="unassigned">Unassigned</option>
        {[...new Set(orders.map(item => item.status))].map(status =>
          <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
      </select></label>
      {markers.length > 0 || live ? <DeliveryMap label="Dispatch destinations" markers={[
        ...markers, ...(live ? [{ ...live, label: 'Rider', rider: true }] : []),
      ]} /> : <p>No pinned destinations match this filter.</p>}
      {filtered.length > 0 && <label>Inspect order <select value={order?.id ?? ''} onChange={event => {
        setSelected(event.target.value ? Number(event.target.value) : null)
      }}>
        <option value="">Select an order</option>
        {filtered.map(item => <option key={item.id} value={item.id}>Order #{item.id}</option>)}
      </select></label>}
      {order && <div>
        <strong>Order #{order.id}</strong>
        <p>{order.delivery_address} · {order.status.replaceAll('_', ' ')}</p>
        {live && <p>Rider location updated {new Date(live.captured_at).toLocaleTimeString()}</p>}
        <button type="button" onClick={() => document.getElementById(`dispatch-order-${order.id}`)?.focus()}>
          Go to order and assignment
        </button>
      </div>}
    </>}
  </section>
}
