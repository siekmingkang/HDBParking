/**
 * Singapore public holidays.
 *
 * The HDB dataset grants free parking on "Sundays & public holidays", so the
 * app needs to know which dates are public holidays. The dates come from the
 * data.gov.sg consolidated public holidays dataset, downloaded by
 * scripts/build-data.mjs into public/data/holidays.json (same pipeline as
 * carparks.json), so new years appear automatically once gazetted.
 *
 * Source: data.gov.sg dataset d_8ef23381f9417e4d4254ee8b4dcdb176
 * (Singapore Public Holidays, columns: date, day, holiday).
 *
 * The table starts empty and is filled by setHolidays() once
 * public/data/holidays.json has loaded (see src/App.jsx).
 */

let byDate = new Map()

/**
 * Load holiday rows into the lookup table. Call once at app startup with the
 * contents of public/data/holidays.json.
 * @param {Array<{date: string, name: string}>} rows
 */
export function setHolidays(rows) {
  byDate = new Map((rows ?? []).map((row) => [row.date, row.name]))
}

/** Is the given YYYY-MM-DD date a Singapore public holiday? */
export function isPublicHoliday(dateKey) {
  return byDate.has(dateKey)
}

/** Holiday name for a YYYY-MM-DD date, or null. */
export function holidayName(dateKey) {
  return byDate.get(dateKey) ?? null
}
