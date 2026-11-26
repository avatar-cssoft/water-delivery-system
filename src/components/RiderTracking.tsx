import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export default function RiderTracking({ id, status, onStatus, cancelButton }: {
  id: number
  status: string
  onStatus: (status: string) => void
  cancelButton?: ReactNode
}) {
  const active = ['in_progress', 'out_for_delivery'].includes(status)
  const [sharing, setSharing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const request = useRef<PromiseLike<unknown> | null>(null)

  useEffect(() => {
    if (!active || !sharing || !navigator.geolocation) return
    let current = true
    let lastSent = 0
    const watch = navigator.geolocation.watchPosition(({ coords, timestamp }) => {
      if (!current || request.current || Date.now() - lastSent < 10000) return
      lastSent = Date.now()
      request.current = supabase.rpc('publish_delivery_position', {
        target_delivery_id: id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        captured_at: new Date(timestamp).toISOString(),
      }).then(({ error }) => {
        request.current = null
        if (!current) return
        if (error?.code === '42501') setSharing(false)
        setMessage(error ? 'Location update failed. Check your connection and current assignment.' : 'Live location shared.')
      })
    }, () => {
      if (!current) return
      setSharing(false)
      setMessage('Device location unavailable. Check your location permissions and try again.')
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 })
    return () => { current = false; navigator.geolocation.clearWatch(watch) }
  }, [active, sharing, id])

  async function transition(next: string) {
    setBusy(true)
    setMessage('')
    const { error } = await supabase.rpc('set_rider_delivery_status', {
      target_delivery_id: id, next_status: next,
    })
    setBusy(false)
    if (error) setMessage('Delivery status could not be updated. Check your connection and assignment.')
    else {
      if (next === 'delivered') setSharing(false)
      onStatus(next)
    }
  }

  async function stopSharing() {
    setSharing(false)
    setBusy(true)
    await request.current
    const { error } = await supabase.rpc('clear_delivery_position', { target_delivery_id: id })
    setBusy(false)
    setMessage(error ? 'Location sharing stopped on this device. The last update may still be visible.' : 'Location sharing stopped.')
  }

  return <div className="delivery-panel">
    {status === 'assigned' && <>
      <button type="button" disabled={busy} onClick={() => void transition('out_for_delivery')}>Start delivery</button>
      {cancelButton}
    </>}
    {active && <>
      <button type="button" disabled={busy} onClick={() => {
        if (sharing) void stopSharing()
        else if (navigator.geolocation) { setSharing(true); setMessage('Waiting for device location…') }
        else setMessage('Device location is unavailable.')
      }}>{sharing ? 'Stop sharing location' : 'Share location for this delivery'}</button>
      <button type="button" disabled={busy} onClick={() => void transition('delivered')}>Mark delivered</button>
      {cancelButton}
    </>}
    {message && <p role="status">{message}</p>}
  </div>
}
