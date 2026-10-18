/**
 * Free-parking evaluation.
 *
 * The HDB CSV stores free parking as a short rule, which the build step turns
 * into a machine-readable object:
 *
 *   null                                          -> never free
 *   { days: 'ALL', start: null, end: null }       -> free at all times
 *   { days: ['SUN','PH'], start: 420, end: 1350 } -> free on Sundays & public
 *                                                    holidays, 07:00-22:30
 *
 * Times are minutes past midnight. A rule whose end is before its start wraps
 * past midnight.
 */
import { formatClock } from './singaporeTime.js'
import { holidayName, isPublicHoliday } from './holidays.js'

const DAY_LABELS = {
  SUN: 'Sundays',
  SAT: 'Saturdays',
  PH: 'public holidays',
}

/** Human readable "Sundays & public holidays, 7:00 AM-10:30 PM". */
export function describeRule(rule) {
  if (!rule) return 'Not free'
  if (rule.days === 'ALL') return 'Free at all times'

  const dayText = rule.days.map((day) => DAY_LABELS[day] ?? day).join(' & ')
  if (rule.start === null || rule.end === null) return `Free on ${dayText}`
  return `Free on ${dayText}, ${formatClock(rule.start)}-${formatClock(rule.end)}`
}

/**
 * Evaluate a free-parking rule against a set of Singapore time parts.
 * @param {object|null} rule
 * @param {ReturnType<import('./singaporeTime.js').singaporeParts>} parts
 */
export function evaluateRule(rule, parts) {
  if (!rule) {
    return { free: false, dayMatches: false, inWindow: false, holiday: null, allDay: false }
  }

  const holiday = isPublicHoliday(parts.dateKey) ? holidayName(parts.dateKey) : null

  if (rule.days === 'ALL') {
    return { free: true, dayMatches: true, inWindow: true, holiday, allDay: true }
  }

  const dayMatches =
    (rule.days.includes('SUN') && parts.isSunday) ||
    (rule.days.includes('SAT') && parts.isSaturday) ||
    (rule.days.includes('PH') && holiday !== null)

  let inWindow = true
  if (rule.start !== null && rule.end !== null) {
    const minutes = parts.minutesSinceMidnight
    inWindow =
      rule.start <= rule.end
        ? minutes >= rule.start && minutes < rule.end
        : minutes >= rule.start || minutes < rule.end
  }

  return { free: dayMatches && inWindow, dayMatches, inWindow, holiday, allDay: false }
}
