import { useCallback, useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import Sidebar from './components/Sidebar.jsx'
import { evaluateRule } from './lib/freeParking.js'
import { singaporeParts } from './lib/singaporeTime.js'

const REFRESH_INTERVAL_MS = 30_000

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [now, setNow] = useState(() => new Date())
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [freeOnly, setFreeOnly] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}data/carparks.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Keep the status fresh as time passes (and let the user force a refresh).
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  const carparks = useMemo(() => data?.carparks ?? [], [data])
  const parts = useMemo(() => singaporeParts(now), [now])

  const evaluationById = useMemo(() => {
    const map = new Map()
    for (const carpark of carparks) {
      map.set(carpark.id, evaluateRule(carpark.freeParkingRule, parts))
    }
    return map
  }, [carparks, parts])

  const freeById = useMemo(() => {
    const map = new Map()
    for (const [id, evaluation] of evaluationById) map.set(id, evaluation.free)
    return map
  }, [evaluationById])

  const freeCount = useMemo(() => {
    let count = 0
    for (const evaluation of evaluationById.values()) if (evaluation.free) count += 1
    return count
  }, [evaluationById])

  const selected = useMemo(
    () => carparks.find((carpark) => carpark.id === selectedId) ?? null,
    [carparks, selectedId],
  )

  // "Free now only" hides charged markers too, so the map shows the same set as the list.
  const mappedCarparks = useMemo(
    () => (freeOnly ? carparks.filter((carpark) => freeById.get(carpark.id)) : carparks),
    [carparks, freeById, freeOnly],
  )

  const handleSelect = useCallback((carpark) => setSelectedId(carpark.id), [])
  const handleClear = useCallback(() => setSelectedId(null), [])
  const handleRefresh = useCallback(() => setNow(new Date()), [])

  if (error) {
    return (
      <div className="message message--error">
        <h1>Could not load car park data</h1>
        <p>{error}</p>
        <p>
          Run <code>npm run build:data</code> to generate <code>public/data/carparks.json</code>.
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="message">
        <div className="spinner" aria-hidden="true" />
        <p>Loading HDB car park data&hellip;</p>
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar
        carparks={carparks}
        freeById={freeById}
        evaluationById={evaluationById}
        selected={selected}
        onSelect={handleSelect}
        onClear={handleClear}
        query={query}
        onQueryChange={setQuery}
        freeOnly={freeOnly}
        onFreeOnlyChange={setFreeOnly}
        parts={parts}
        freeCount={freeCount}
        onRefresh={handleRefresh}
      />
      <main className="map-pane">
        <MapView
          carparks={mappedCarparks}
          freeById={freeById}
          selected={selected}
          evaluation={selected ? evaluationById.get(selected.id) : null}
          onSelect={handleSelect}
          onClear={handleClear}
        />
      </main>
    </div>
  )
}
