import { useRef, useState } from 'react'
import DeliveryMap from './DeliveryMap'
import type { Point } from '../lib/deliveryMap'

export default function DropoffPicker({ point, onChange }: {
  point: Point | null
  onChange: (value: Point | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Point | null>(null)
  const [message, setMessage] = useState('')
  const locationRequest = useRef(0)

  function close() {
    locationRequest.current += 1
    setOpen(false)
  }

  function locate() {
    if (!navigator.geolocation) {
      setMessage('Device location is unavailable.')
      return
    }
    const request = ++locationRequest.current
    setMessage('Finding your location…')
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (request !== locationRequest.current) return
      setDraft({ latitude: coords.latitude, longitude: coords.longitude })
      setMessage('')
    }, () => {
      if (request === locationRequest.current) setMessage('Location unavailable. Choose a point on the map or use the written address.')
    }, { timeout: 12000 })
  }

  return (
    <div className="delivery-panel">
      <button type="button" onClick={() => { setDraft(point); setMessage(''); setOpen(true) }}>
        {point ? 'Adjust drop-off pin' : 'Set drop-off pin (optional)'}
      </button>
      {point && <button type="button" onClick={() => { onChange(null); close() }}>Remove pin</button>}
      {open && <>
        <p>Tap the map to mark the entrance, or use your device location.</p>
        <DeliveryMap label="Choose your drop-off" markers={draft ? [{ ...draft, label: 'Drop-off' }] : []}
          onPick={value => { locationRequest.current += 1; setMessage(''); setDraft(value) }} />
        <button type="button" onClick={locate}>Use my location</button>
        <button type="button" disabled={!draft} onClick={() => { onChange(draft); close() }}>Confirm pin</button>
        <button type="button" onClick={close}>Cancel pin edit</button>
        {message && <p role="status">{message}</p>}
      </>}
    </div>
  )
}
