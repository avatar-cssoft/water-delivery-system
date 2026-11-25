import { useEffect, useEffectEvent, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { Point } from '../lib/deliveryMap'
type Marker = Point & { label: string; rider?: boolean; onSelect?: () => void }

export default function DeliveryMap({ markers, onPick, label = 'Delivery map' }: {
  markers: Marker[]
  onPick?: (point: Point) => void
  label?: string
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const [tileError, setTileError] = useState(false)
  const pick = useEffectEvent((event: L.LeafletMouseEvent) => {
    onPick?.({ latitude: event.latlng.lat, longitude: event.latlng.wrap().lng })
  })
  const editable = Boolean(onPick)

  useEffect(() => {
    if (!container.current) return
    const instance = L.map(container.current, { scrollWheelZoom: false }).setView([14.6, 121], 11)
    const tiles = L.tileLayer(import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: import.meta.env.VITE_MAP_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
    tiles.on('tileerror', () => setTileError(true))
    tiles.addTo(instance)
    if (editable) instance.on('click', event => pick(event))
    map.current = instance
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => instance.invalidateSize())
    observer?.observe(container.current)
    return () => { observer?.disconnect(); instance.remove(); map.current = null }
  }, [editable])

  useEffect(() => {
    const instance = map.current
    if (!instance || !markers.length) return
    const group = L.featureGroup(markers.map(item => {
      const marker = L.marker([item.latitude, item.longitude], {
        title: item.label,
        alt: item.label,
        icon: L.divIcon({ className: item.rider ? 'delivery-dot delivery-dot--rider' : 'delivery-dot', iconSize: [18, 18] }),
      })
      const caption = document.createElement('span')
      caption.textContent = item.label
      marker.bindTooltip(caption)
      if (item.onSelect) marker.on('click', item.onSelect)
      return marker
    })).addTo(instance)
    instance.fitBounds(group.getBounds(), { maxZoom: 16, padding: [22, 22], animate: false })
    return () => { group.remove() }
  }, [markers])

  return (
    <div>
      <div ref={container} className="delivery-map" role="region" aria-label={label} />
      {tileError && <p role="status">Some map tiles could not load. Use the written address for delivery.</p>}
    </div>
  )
}
