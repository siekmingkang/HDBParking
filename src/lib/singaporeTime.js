/**
 * Singapore time helpers.
 *
 * Singapore is UTC+8 all year round and has no daylight saving, so "now" in
 * Singapore is simply the browser clock shifted by 8 hours. We deliberately do
 * not use the browser's local timezone, otherwise someone in London would see
 * the wrong free-parking status.
 */

export const SINGAPORE_UTC_OFFSET_MINUTES = 8 * 60

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const pad = (value) => String(value).padStart(2, '0')

/**
 * Break a JavaScript Date down into Singapore date/time parts.
 * @param {Date} [date] defaults to now
 */
export function singaporeParts(date = new Date()) {
  const shifted = new Date(date.getTime() + SINGAPORE_UTC_OFFSET_MINUTES * 60_000)

  const weekdayIndex = shifted.getUTCDay()
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth() + 1
  const day = shifted.getUTCDate()
  const hours = shifted.getUTCHours()
  const minutes = shifted.getUTCMinutes()

  return {
    year,
    month,
    day,
    hours,
    minutes,
    weekday: WEEKDAYS[weekdayIndex],
    isSunday: weekdayIndex === 0,
    isSaturday: weekdayIndex === 6,
    minutesSinceMidnight: hours * 60 + minutes,
    dateKey: `${year}-${pad(month)}-${pad(day)}`,
    dateLabel: `${WEEKDAYS_LONG[weekdayIndex]}, ${day} ${MONTHS_SHORT[month - 1]} ${year}`,
    timeLabel: `${pad(hours)}:${pad(minutes)}`,
    fullLabel: `${WEEKDAYS_LONG[weekdayIndex]}, ${day} ${MONTHS_SHORT[month - 1]} ${year}, ${pad(hours)}:${pad(minutes)} SGT`,
  }
}

/** Format "minutes past midnight" as a 12-hour clock string, e.g. 1350 -> "10:30 PM". */
export function formatClock(minutesPastMidnight) {
  if (minutesPastMidnight === null || minutesPastMidnight === undefined) return ''
  const hours24 = Math.floor(minutesPastMidnight / 60) % 24
  const minutes = minutesPastMidnight % 60
  const meridiem = hours24 < 12 ? 'AM' : 'PM'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12}:${pad(minutes)} ${meridiem}`
}
