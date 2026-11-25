export type Point = { latitude: number; longitude: number }
export type RiderPosition = Point & { captured_at: string; accuracy: number }

export function deliveryPoint(value?: { delivery_latitude?: number | null; delivery_longitude?: number | null }) {
  const latitude = value?.delivery_latitude
  const longitude = value?.delivery_longitude
  return latitude == null || longitude == null ? null : { latitude, longitude }
}

export function directionsUrl(address: string, point: Point | null) {
  const destination = point ? `${point.latitude},${point.longitude}` : address
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}
