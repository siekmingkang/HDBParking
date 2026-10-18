import { useMemo, useRef } from 'react'
import CarparkDetails from './CarparkDetails.jsx'

const MAX_LIST = 150

/** Drag distance (px) past which a swipe on the handle dismisses the panel. */
const SWIPE_HIDE_PX = 80

export default function Sidebar({
  carparks,
  freeById,
  evaluationById,
  selected,
  onSelect,
  onClear,
  onClose,
  query,
  onQueryChange,
  freeOnly,
  onFreeOnlyChange,
  parts,
  freeCount,
  onRefresh,
}) {
  const asideRef = useRef(null)
  const dragRef = useRef(null)
  const movedRef = useRef(false)

  // Swipe down on the top handle to hide the panel. Only the handle starts a
  // drag, so the panel's own vertical scroll is never fought over.
  const handleTouchStart = (event) => {
    dragRef.current = { y: event.touches[0].clientY, dy: 0 }
    movedRef.current = false
  }

  const handleTouchMove = (event) => {
    const drag = dragRef.current
    if (!drag) return
    drag.dy = Math.max(0, event.touches[0].clientY - drag.y)
    if (drag.dy > 6) movedRef.current = true
    asideRef.current.style.transform = `translateY(${drag.dy}px)`
  }

  const handleTouchEnd = () => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return

    const aside = asideRef.current
    aside.style.transition = 'transform 0.22s var(--ease)'
    if (drag.dy > SWIPE_HIDE_PX) {
      aside.style.transform = 'translateY(110%)'
      setTimeout(onClose, 220)
    } else {
      aside.style.transform = ''
      setTimeout(() => {
        aside.style.transition = ''
      }, 220)
    }
  }

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matches = []

    for (const carpark of carparks) {
      if (freeOnly && !(freeById.get(carpark.id) ?? false)) continue
      if (
        needle &&
        !carpark.id.toLowerCase().includes(needle) &&
        !carpark.address.toLowerCase().includes(needle)
      ) {
        continue
      }
      matches.push(carpark)
      if (matches.length >= MAX_LIST) break
    }

    return matches
  }, [carparks, freeById, freeOnly, query])

  const selectedEvaluation = selected ? evaluationById.get(selected.id) : null

  return (
    <aside className="sidebar" ref={asideRef}>
      {/* Mobile grab handle: swipe down to hide, or tap it. */}
      <button
        type="button"
        className="sidebar__handle"
        aria-label="Hide panel"
        onClick={() => {
          if (movedRef.current) {
            movedRef.current = false
            return
          }
          onClose()
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />
      <header className="sidebar__head">
        <h1 className="sidebar__title">HDB Car Park Map</h1>
        <p className="sidebar__subtitle">
          Free-parking status for {carparks.length.toLocaleString()} HDB car parks, based on the
          current Singapore date and time.
        </p>
      </header>

      <div className="now">
        <div className="now__clock">
          <span className="now__time">{parts.timeLabel}</span>
          <span className="now__zone">SGT</span>
        </div>
        <div className="now__date">{parts.dateLabel}</div>
        <div className="now__free">
          <strong>{freeCount.toLocaleString()}</strong> car parks free right now
        </div>
        <button type="button" className="now__refresh" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      {selected && selectedEvaluation && (
        <CarparkDetails
          carpark={selected}
          evaluation={selectedEvaluation}
          parts={parts}
          onClose={onClear}
        />
      )}

      <div className="controls">
        <input
          type="search"
          className="controls__search"
          placeholder="Search by car park no. or address"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-label="Search car parks"
        />
        <div className="controls__filters">
          <label className="toggle">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(event) => onFreeOnlyChange(event.target.checked)}
            />
            <span>Free now only</span>
          </label>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              onQueryChange('')
              onFreeOnlyChange(false)
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="results">
        <div className="results__count">
          {results.length >= MAX_LIST
            ? `Showing first ${MAX_LIST} matches`
            : `${results.length.toLocaleString()} match${results.length === 1 ? '' : 'es'}`}
        </div>
        <ul className="results__list">
          {results.map((carpark) => {
            const free = freeById.get(carpark.id) ?? false
            return (
              <li key={carpark.id}>
                <button
                  type="button"
                  className={`result${selected && selected.id === carpark.id ? ' result--active' : ''}`}
                  onClick={() => onSelect(carpark)}
                >
                  <span className="result__top">
                    <span className="result__id">{carpark.id}</span>
                    <span className={`dot dot--${free ? 'free' : 'charged'}`} aria-hidden="true" />
                    <span className={`badge badge--${free ? 'free' : 'charged'}`}>
                      {free ? 'Free' : 'Charged'}
                    </span>
                  </span>
                  <span className="result__address">{carpark.address}</span>
                </button>
              </li>
            )
          })}
          {results.length === 0 && <li className="results__empty">No car parks match your search.</li>}
        </ul>
      </div>

      <footer className="sidebar__foot">
        <div className="legend">
          <span className="legend__item">
            <span className="dot dot--free" aria-hidden="true" /> Free now
          </span>
          <span className="legend__item">
            <span className="dot dot--charged" aria-hidden="true" /> Charged now
          </span>
        </div>
        <p className="sidebar__source">
          Data: HDB Carpark Information. Map tiles &copy; OpenStreetMap contributors.
        </p>
      </footer>
    </aside>
  )
}
