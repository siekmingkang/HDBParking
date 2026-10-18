import { memo, useEffect, useRef, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from 'react-leaflet'
import { describeRule } from '../lib/freeParking.js'

export const SINGAPORE_CENTER = [1.3521, 103.8198]
export const DEFAULT_ZOOM = 12

/** Width of the floating glass panel (392px + 12px gutter), which the popup must avoid. */
const PANEL_INSET = 404

/**
 * The glass panel floats over the map on desktop and docks to the bottom on
 * mobile, so the popup pan padding has to follow the same breakpoint.
 */
function usePanelOnLeft() {
  const [onLeft, setOnLeft] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(min-width: 761px)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(min-width: 761px)')
    const onChange = (event) => setOnLeft(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return onLeft
}

const STYLE = {
  free: { color: '#15803d', fillColor: '#22c55e' },
  charged: { color: '#1e40af', fillColor: '#3b82f6' },
}

const styleFor = (free) => (free ? STYLE.free : STYLE.charged)

/**
 * The bulk of the markers. Memoised so that selecting a car park (which lives
 * in App state, not here) does not re-render all ~2,273 points.
 */
const CarparkMarkers = memo(function CarparkMarkers({ carparks, freeById, onSelect }) {
  return (
    <>
      {carparks.map((carpark) => {
        const free = freeById.get(carpark.id) ?? false
        const style = styleFor(free)
        return (
          <CircleMarker
            key={carpark.id}
            center={[carpark.lat, carpark.lon]}
            radius={5}
            pathOptions={{
              color: style.color,
              weight: 1.5,
              fillColor: style.fillColor,
              fillOpacity: 0.9,
            }}
            eventHandlers={{ click: () => onSelect(carpark) }}
          />
        )
      })}
    </>
  )
})

/** Single highlighted marker for the current selection, with an auto-opened popup. */
function SelectedCarpark({ carpark, evaluation, onClear, panelOnLeft }) {
  const map = useMap()
  const markerRef = useRef(null)
  const lastIdRef = useRef(null)

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    // Only re-centre when the selection actually changes, not on every render.
    if (lastIdRef.current !== carpark.id) {
      lastIdRef.current = carpark.id
      map.flyTo([carpark.lat, carpark.lon], Math.max(map.getZoom(), 16), { duration: 0.6 })
    }

    const timer = setTimeout(() => marker.openPopup(), 350)
    return () => clearTimeout(timer)
  }, [carpark, map])

  return (
    <CircleMarker
      ref={markerRef}
      center={[carpark.lat, carpark.lon]}
      radius={9}
      pathOptions={{ color: '#b45309', weight: 3, fillColor: '#f59e0b', fillOpacity: 0.6 }}
    >
      <Popup
        autoPan
        autoPanPaddingTopLeft={panelOnLeft ? [PANEL_INSET, 16] : [16, 16]}
        autoPanPaddingBottomRight={panelOnLeft ? [16, 16] : [16, PANEL_INSET]}
      >
        <div className="popup">
          <div className="popup__head">
            <span className="popup__id">{carpark.id}</span>
            <span className={`badge badge--${evaluation.free ? 'free' : 'charged'}`}>
              {evaluation.free ? 'Free now' : 'Charged now'}
            </span>
          </div>
          <p className="popup__address">{carpark.address}</p>
          <p className="popup__meta">{describeRule(carpark.freeParkingRule)}</p>
          <button type="button" className="popup__close" onClick={onClear}>
            Close
          </button>
        </div>
      </Popup>
    </CircleMarker>
  )
}

export default function MapView({ carparks, freeById, selected, evaluation, onSelect, onClear }) {
  const panelOnLeft = usePanelOnLeft()

  return (
    <MapContainer
      center={SINGAPORE_CENTER}
      zoom={DEFAULT_ZOOM}
      preferCanvas
      zoomControl={false}
      className="map"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ZoomControl position="topright" />
      <CarparkMarkers carparks={carparks} freeById={freeById} onSelect={onSelect} />
      {selected && (
        <SelectedCarpark
          carpark={selected}
          evaluation={evaluation}
          onClear={onClear}
          panelOnLeft={panelOnLeft}
        />
      )}
    </MapContainer>
  )
}
