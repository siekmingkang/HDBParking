/**
 * Singapore public holidays.
 *
 * The HDB dataset grants free parking on "Sundays & public holidays", so the
 * app needs to know which dates are public holidays. There is no offline
 * package for this, so the gazetted dates are listed here explicitly.
 *
 * Source: Ministry of Manpower (https://www.mom.gov.sg/employment-practices/public-holidays)
 *
 * Notes:
 *  - When a public holiday falls on a Sunday, the following Monday is a
 *    substitute holiday; both dates are listed so free parking applies to each.
 *  - Update this list when MOM gazettes new years (from 2028 onwards).
 */

/** @type {Record<string, string>} date (YYYY-MM-DD) -> holiday name */
export const PUBLIC_HOLIDAYS = {
  // 2025
  '2025-01-01': "New Year's Day",
  '2025-01-29': 'Chinese New Year',
  '2025-01-30': 'Chinese New Year',
  '2025-03-31': 'Hari Raya Puasa',
  '2025-04-18': 'Good Friday',
  '2025-05-01': 'Labour Day',
  '2025-05-03': 'Polling Day',
  '2025-05-12': 'Vesak Day',
  '2025-06-07': 'Hari Raya Haji',
  '2025-08-09': 'National Day',
  '2025-10-20': 'Deepavali',
  '2025-12-25': 'Christmas Day',

  // 2026
  '2026-01-01': "New Year's Day",
  '2026-02-17': 'Chinese New Year',
  '2026-02-18': 'Chinese New Year',
  '2026-03-21': 'Hari Raya Puasa',
  '2026-04-03': 'Good Friday',
  '2026-05-01': 'Labour Day',
  '2026-05-27': 'Hari Raya Haji',
  '2026-05-31': 'Vesak Day',
  '2026-06-01': 'Vesak Day (substitute)',
  '2026-08-09': 'National Day',
  '2026-08-10': 'National Day (substitute)',
  '2026-11-08': 'Deepavali',
  '2026-11-09': 'Deepavali (substitute)',
  '2026-12-25': 'Christmas Day',

  // 2027
  '2027-01-01': "New Year's Day",
  '2027-02-06': 'Chinese New Year',
  '2027-02-07': 'Chinese New Year',
  '2027-02-08': 'Chinese New Year (substitute)',
  '2027-03-10': 'Hari Raya Puasa',
  '2027-03-26': 'Good Friday',
  '2027-05-01': 'Labour Day',
  '2027-05-17': 'Hari Raya Haji',
  '2027-05-20': 'Vesak Day',
  '2027-08-09': 'National Day',
  '2027-10-28': 'Deepavali',
  '2027-12-25': 'Christmas Day',
}

/** Is the given YYYY-MM-DD date a Singapore public holiday? */
export function isPublicHoliday(dateKey) {
  return Object.prototype.hasOwnProperty.call(PUBLIC_HOLIDAYS, dateKey)
}

/** Holiday name for a YYYY-MM-DD date, or null. */
export function holidayName(dateKey) {
  return PUBLIC_HOLIDAYS[dateKey] ?? null
}
