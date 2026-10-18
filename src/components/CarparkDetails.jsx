import { describeRule } from '../lib/freeParking.js'
import { formatClock } from '../lib/singaporeTime.js'

const yesNo = (value) => (value ? 'Yes' : 'No')

/**
 * Explains the current free-parking status in words, e.g.
 * "Free now - it is Sunday and 11:05 AM is within 7:00 AM-10:30 PM."
 */
function explain(carpark, evaluation, parts) {
  const rule = carpark.freeParkingRule

  if (!rule) {
    return 'You have to pay at all times here.'
  }

  if (rule.days === 'ALL') {
    return 'Parking is free at this car park at all times.'
  }

  const dayReason = evaluation.holiday
    ? `today is a public holiday (${evaluation.holiday})`
    : parts.isSunday
      ? 'today is a Sunday'
      : null

  if (rule.start === null || rule.end === null) {
    return evaluation.free
      ? `Free right now because ${dayReason}.`
      : 'Free only on the days listed below.'
  }

  const window = `${formatClock(rule.start)}-${formatClock(rule.end)}`

  if (evaluation.free) {
    return `Free right now: ${dayReason} and ${parts.timeLabel} is within ${window}.`
  }

  if (!dayReason) {
    return `Not free today: the ${window} window only applies on the days listed below.`
  }

  return `Today qualifies (${dayReason}) but ${parts.timeLabel} is outside ${window}.`
}

function Row({ label, children }) {
  return (
    <div className="row">
      <dt className="row__label">{label}</dt>
      <dd className="row__value">{children}</dd>
    </div>
  )
}

export default function CarparkDetails({ carpark, evaluation, parts, onClose }) {
  return (
    <section className="details" aria-live="polite">
      <header className="details__head">
        <div>
          <span className="details__id">{carpark.id}</span>
          <span className={`badge badge--${evaluation.free ? 'free' : 'charged'}`}>
            {evaluation.free ? 'Free now' : 'Charged now'}
          </span>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close details">
          &times;
        </button>
      </header>

      <p className="details__address">{carpark.address}</p>
      <p className="details__explain">{explain(carpark, evaluation, parts)}</p>

      <dl className="details__rows">
        <Row label="Free parking">{describeRule(carpark.freeParkingRule)}</Row>
        <Row label="Short-term parking">{carpark.shortTermParking}</Row>
        <Row label="Car park type">{carpark.type}</Row>
        <Row label="Parking system">{carpark.system}</Row>
        <Row label="Night parking">{yesNo(carpark.nightParking)}</Row>
        <Row label="Decks">{carpark.decks}</Row>
        <Row label="Gantry height">{carpark.gantryHeight ? `${carpark.gantryHeight} m` : '\u2014'}</Row>
        <Row label="Basement">{yesNo(carpark.basement)}</Row>
      </dl>
    </section>
  )
}
