/**
 * Build script: HDB Carpark Information (data.gov.sg) -> public/data/carparks.json
 *
 * Responsibilities:
 *  1. Download the HDB Carpark Information dataset from the data.gov.sg
 *     datastore API, so the build never depends on a stale local copy.
 *  2. Convert the SVY21 (Singapore) projected x/y coordinates into WGS84
 *     latitude/longitude so the points land correctly on OpenStreetMap.
 *  3. Normalise the "free_parking" column into a machine-readable rule that
 *     the web app can evaluate against the current date/time.
 *
 * Run with:  npm run build:data
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const OUT_PATH = resolve(ROOT, 'public', 'data', 'carparks.json')

// HDB Carpark Information on data.gov.sg. The datastore_search endpoint is the
// documented, keyless way to pull the current rows (same columns as the CSV).
const DATASET_ID = 'd_23f946fa557947f93a8043bbef41dd09'
const DATASET_URL = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=100000`

/* ------------------------------------------------------------------ *
 * SVY21 -> WGS84
 *
 * SVY21 is Singapore's projected coordinate system (Transverse Mercator,
 * origin 1°22'N 103°50'E, false easting 28001.642, false northing 38744.572,
 * scale factor 1.0). The HDB dataset stores x_coord/y_coord in SVY21 metres.
 * ------------------------------------------------------------------ */
const A = 6378137.0 // semi-major axis, WGS84
const F = 1 / 298.257223563 // flattening, WGS84
const B = A * (1 - F) // semi-minor axis

const ORIGIN_LAT = ((1 + 22 / 60) * Math.PI) / 180
const ORIGIN_LON = ((103 + 50 / 60) * Math.PI) / 180
const FALSE_EASTING = 28001.642
const FALSE_NORTHING = 38744.572
const SCALE = 1.0

const E2 = F * (2 - F) // first eccentricity squared
const N_RATIO = (A - B) / (A + B)

// Meridional arc constant.
const G =
  A *
  (1 - N_RATIO) *
  (1 - N_RATIO * N_RATIO) *
  (1 + (9 / 4) * N_RATIO ** 2 + (225 / 64) * N_RATIO ** 4)

// Coefficients of the inverse meridional-arc series (lat as a function of sigma).
const C2 = (3 * N_RATIO) / 2 - (27 * N_RATIO ** 3) / 32
const C4 = (21 * N_RATIO ** 2) / 16 - (55 * N_RATIO ** 4) / 32
const C6 = (151 * N_RATIO ** 3) / 96
const C8 = (1097 * N_RATIO ** 4) / 512

/** Meridional arc (radians) -> geodetic latitude (radians). */
const latitudeFromArc = (sigma) =>
  sigma +
  C2 * Math.sin(2 * sigma) +
  C4 * Math.sin(4 * sigma) +
  C6 * Math.sin(6 * sigma) +
  C8 * Math.sin(8 * sigma)

/**
 * Northing at the projection origin is the false northing, so the meridional
 * arc between the equator and the origin latitude has to be added back before
 * inverting. Solve for it once with Newton's method.
 */
const ORIGIN_ARC = (() => {
  let sigma = ORIGIN_LAT
  for (let i = 0; i < 12; i += 1) {
    const f = latitudeFromArc(sigma) - ORIGIN_LAT
    const df =
      1 +
      2 * C2 * Math.cos(2 * sigma) +
      4 * C4 * Math.cos(4 * sigma) +
      6 * C6 * Math.cos(6 * sigma) +
      8 * C8 * Math.cos(8 * sigma)
    sigma -= f / df
  }
  return sigma * G
})()

const toDegrees = (rad) => (rad * 180) / Math.PI

/**
 * Convert an SVY21 easting/northing pair to WGS84 lat/lon.
 * @param {number} easting  x_coord, in metres
 * @param {number} northing y_coord, in metres
 * @returns {{lat: number, lon: number}}
 */
function svy21ToWgs84(easting, northing) {
  // Meridional arc from the equator to this point.
  const m = (northing - FALSE_NORTHING) / SCALE + ORIGIN_ARC
  const sigma = m / G

  const phiPrime = latitudeFromArc(sigma)

  const sinPhi = Math.sin(phiPrime)
  const oneMinus = 1 - E2 * sinPhi * sinPhi

  const rho = (A * (1 - E2)) / Math.pow(oneMinus, 1.5)
  const v = A / Math.sqrt(oneMinus)
  const psi = v / rho
  const t = Math.tan(phiPrime)

  const x = easting - FALSE_EASTING
  const w = x / (SCALE * v)
  const t2 = t * t
  const t4 = t2 * t2
  const t6 = t4 * t2

  const VII = (t / (2 * rho * v)) * SCALE ** 2 * x ** 2
  const VIII =
    (t / (24 * rho * v ** 3)) *
    SCALE ** 4 *
    x ** 4 *
    (5 + 3 * t2 + psi - 9 * psi * t2)
  const IX = (t / (720 * rho * v ** 5)) * SCALE ** 6 * x ** 6 * (61 + 90 * t2 + 45 * t4)

  const X = (1 / Math.cos(phiPrime)) * (1 / (SCALE * v)) * x
  const XI =
    (1 / (Math.cos(phiPrime) * 6 * SCALE ** 3 * v ** 3)) * x ** 3 * (psi + 2 * t2)
  const XII =
    (1 / (Math.cos(phiPrime) * 120 * SCALE ** 5 * v ** 5)) *
    x ** 5 *
    (5 + 28 * t2 + 24 * t4 + 6 * psi + 8 * psi * t2)
  const XIIA =
    (1 / (Math.cos(phiPrime) * 5040 * SCALE ** 7 * v ** 7)) *
    x ** 7 *
    (61 + 662 * t2 + 1320 * t4 + 720 * t6)

  const lat = phiPrime - VII + VIII - IX
  const lon = ORIGIN_LON + X - XI + XII - XIIA

  return { lat: toDegrees(lat), lon: toDegrees(lon) }
}

/* ------------------------------------------------------------------ *
 * Projection self-check
 *
 * Ground truth comes from OneMap (which publishes both SVY21 X/Y and WGS84
 * lat/lon for the same address), so we can measure the conversion error
 * without any network access at build time.
 * ------------------------------------------------------------------ */
const GROUND_TRUTH = [
  // X, Y (SVY21), latitude, longitude (WGS84)
  { x: 28001.642, y: 38744.572, lat: 1.366666667, lon: 103.8333333, note: 'projection origin' },
  { x: 30314.54084019642, y: 31494.7782710623, lat: 1.301102015734238, lon: 103.8541157790862, note: 'Albert Centre' },
  { x: 39465.4691351587, y: 38138.72606699541, lat: 1.361185398260385, lon: 103.9363434625769, note: 'Tampines Ave 9' },
]

function metresBetween(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function selfCheck() {
  let worst = 0
  for (const p of GROUND_TRUTH) {
    const got = svy21ToWgs84(p.x, p.y)
    const err = metresBetween(got.lat, got.lon, p.lat, p.lon)
    worst = Math.max(worst, err)
    console.log(
      `  ${p.note.padEnd(18)} -> ${got.lat.toFixed(6)}, ${got.lon.toFixed(6)}  (error ${err.toFixed(1)} m)`,
    )
  }
  console.log(`  worst-case projection error: ${worst.toFixed(1)} m`)
  if (worst > 50) {
    console.warn('  WARNING: projection error is larger than expected for this dataset.')
  }
}

/* ------------------------------------------------------------------ *
 * Data source
 * ------------------------------------------------------------------ */
/** Download every row of the dataset from the data.gov.sg datastore API. */
async function fetchRecords() {
  const res = await fetch(DATASET_URL)
  if (!res.ok) throw new Error(`data.gov.sg returned HTTP ${res.status}`)
  const body = await res.json()
  if (!body.success) throw new Error(`data.gov.sg error: ${JSON.stringify(body)}`)
  const { records, total } = body.result
  if (records.length < total) {
    // shortcut: single request capped by the server's max limit; paginate if this trips.
    throw new Error(`received ${records.length} of ${total} rows; bump the limit or paginate`)
  }
  return records
}

/* ------------------------------------------------------------------ *
 * Free-parking rule parsing
 *
 * Raw values look like:
 *   "NO"
 *   "SUN & PH FR 7AM-10.30PM"
 *   "SUN & PH FR 1PM-10.30PM"
 *   "YES"                      (free at all times)
 * ------------------------------------------------------------------ */
const SINGAPORE_TIMEZONE_OFFSET_MINUTES = 8 * 60

/** "7AM" | "10.30PM" | "13:00" -> minutes past midnight, or null. */
function parseClock(raw) {
  if (!raw) return null
  const match = raw.trim().match(/^(\d{1,2})(?:[.:](\d{2}))?\s*(AM|PM)?$/i)
  if (!match) return null

  let hours = Number(match[1])
  const minutes = match[2] ? Number(match[2]) : 0
  const meridiem = match[3] ? match[3].toUpperCase() : null

  if (meridiem === 'PM' && hours !== 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0

  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/**
 * Convert a raw free-parking string into a rule the client can evaluate,
 * or null when parking is never free.
 */
function parseFreeParking(raw) {
  const text = (raw ?? '').trim()
  if (!text) return null

  const upper = text.toUpperCase()
  if (upper === 'NO' || upper.startsWith('NO ')) return null
  if (upper === 'YES' || upper.includes('WHOLE DAY')) {
    return { days: 'ALL', start: null, end: null, label: 'Free at all times' }
  }

  const days = []
  if (upper.includes('SUN')) days.push('SUN')
  if (/\bPH\b/.test(upper) || upper.includes('PUBLIC HOLIDAY')) days.push('PH')
  if (/\bSAT\b/.test(upper)) days.push('SAT')

  // Only "Sundays & Public Holidays" rules appear in the HDB dataset. Anything
  // we do not recognise is surfaced as-is instead of being silently dropped.
  if (days.length === 0) {
    return { days: 'ALL', start: null, end: null, label: text, raw: text }
  }

  const range = text.match(/(\d{1,2}(?:[.:]\d{2})?\s*(?:AM|PM)?)\s*(?:-|TO|–)\s*(\d{1,2}(?:[.:]\d{2})?\s*(?:AM|PM)?)/i)
  let start = null
  let end = null
  if (range) {
    start = parseClock(range[1])
    end = parseClock(range[2])
    // "SUN & PH FR 3PM-7AM" style ranges simply wrap past midnight.
  }

  return { days, start, end, label: text }
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */
const NUMERIC_OR_NULL = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

async function main() {
  selfCheck()

  const records = await fetchRecords()

  const carparks = []
  let skipped = 0

  for (const record of records) {
    const get = (name) => String(record[name] ?? '').trim()

    const x = Number(get('x_coord'))
    const y = Number(get('y_coord'))
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      skipped += 1
      continue
    }

    const { lat, lon } = svy21ToWgs84(x, y)
    const decks = NUMERIC_OR_NULL(get('car_park_decks'))
    const gantry = NUMERIC_OR_NULL(get('gantry_height'))

    carparks.push({
      id: get('car_park_no'),
      address: get('address'),
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6)),
      type: get('car_park_type'),
      system: get('type_of_parking_system'),
      shortTermParking: get('short_term_parking') || 'NO',
      freeParking: get('free_parking') || 'NO',
      freeParkingRule: parseFreeParking(get('free_parking')),
      nightParking: get('night_parking').toUpperCase() === 'YES',
      decks: decks ?? 0,
      gantryHeight: gantry ?? 0,
      basement: get('car_park_basement').toUpperCase() === 'Y',
    })
  }

  const payload = {
    source: `HDB Carpark Information (data.gov.sg ${DATASET_ID})`,
    projection: 'SVY21 -> WGS84 (client-side converted at build time)',
    singaporeUtcOffsetMinutes: SINGAPORE_TIMEZONE_OFFSET_MINUTES,
    generatedAt: new Date().toISOString(),
    count: carparks.length,
    carparks,
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(payload))

  // Sanity report so regressions in the converter are easy to spot.
  const [first] = carparks
  console.log(`Downloaded ${records.length} rows -> ${carparks.length} car parks (${skipped} skipped).`)
  console.log(`Sample: ${first.id} @ ${first.lat}, ${first.lon}`)
  console.log(`Wrote ${OUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
