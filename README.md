# HDB Car Park Map

An interactive map of Singapore's HDB car parks, built with **React + Vite** and
**OpenStreetMap (Leaflet)**. Every car park is a clickable marker that shows its
details (address, parking system, decks, gantry height, etc.) and whether
parking there is **free right now**.

## What "free right now" means

The HDB dataset's `free_parking` column describes when a car park is free, for
example:

| Raw value                     | Meaning                                            |
| ----------------------------- | -------------------------------------------------- |
| `NO`                          | Charged at all times                               |
| `SUN & PH FR 7AM-10.30PM`     | Free on Sundays & public holidays, 07:00–22:30     |
| `SUN & PH FR 1PM-10.30PM`     | Free on Sundays & public holidays, 13:00–22:30     |

The app evaluates that rule against the **current Singapore date and time**
(UTC+8, no DST) and against the **Singapore public holidays** from the
data.gov.sg consolidated holidays dataset (`public/data/holidays.json`,
referenced by `src/lib/holidays.js`). No availability API and no API key
required.

> The map shows the *entitlement* based on the HDB schedule, not live lot
> availability.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

The CSV is converted to `public/data/carparks.json` automatically before `dev`
and `build` (via the `predev` / `prebuild` scripts), together with
`public/data/holidays.json`.

Other scripts:

```bash
npm run build:data   # regenerate public/data/carparks.json only
npm run build        # production build into dist/
npm run preview      # serve the production build
```

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes `dist/` on every push to
`main` (and on manual dispatch). One-time setup on GitHub:

1. Push this repo. Note the branch name — the workflow triggers on `main`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Watch the run under the **Actions** tab. The site lands at
   `https://<user>.github.io/<repo>/`.

You do **not** need to name the repo in the config. Vite's `base` comes from the
`BASE_PATH` environment variable, and the workflow sets it from
`github.event.repository.name`, so a rename or a fork keeps working. Locally the
base stays `/`, which is why `npm run preview` sits at the root.

`public/data/` is **gitignored** on purpose: it is generated data (≈800 KB of
car parks plus the holiday list), and `npm run build` regenerates it by
downloading the current datasets from data.gov.sg. No local copy of the data is
committed.

## How the data is prepared

The HDB Carpark Information dataset (data.gov.sg
`d_23f946fa557947f93a8043bbef41dd09`) has no latitude/longitude — it stores
projected **SVY21** `x_coord`/`y_coord` metres. `scripts/build-data.mjs`:

1. Downloads every row from the data.gov.sg datastore API (`datastore_search`).
2. Converts SVY21 → WGS84 lat/lon, verified to sub-metre accuracy against
   OneMap ground-truth coordinates (see the self-check printed on every build).
3. Normalises `free_parking` into a machine-readable rule
   (`{ days, start, end }`, times as minutes past midnight).
4. Writes `public/data/carparks.json` (≈2,273 car parks).
5. Downloads the Singapore Public Holidays dataset (data.gov.sg
   `d_8ef23381f9417e4d4254ee8b4dcdb176`, 2020 onwards) and writes
   `public/data/holidays.json`.

The build needs network access; if data.gov.sg is unreachable the build fails
rather than falling back to stale data.

## Project structure

```
scripts/build-data.mjs        Download → JSON build step (projection + rule parsing)
public/data/carparks.json     Generated data consumed by the app (gitignored)
public/data/holidays.json     Generated public holidays data (gitignored)
.github/workflows/deploy.yml  Build + publish dist/ to GitHub Pages
src/
  App.jsx                     Loads data, computes free status, holds UI state
  components/
    MapView.jsx               Leaflet map, canvas markers, selection popup
    Sidebar.jsx               Clock, search, "free now only" filter, results
    CarparkDetails.jsx        Detail card + plain-English status explanation
  lib/
    singaporeTime.js          Singapore (UTC+8) date/time helpers
    freeParking.js            free-parking rule evaluation + descriptions
    holidays.js               Public-holiday lookup over holidays.json
  styles.css
```

## Design: Liquid Glass

The UI uses a **liquid glass** treatment (per the `ui-ux-pro-max` style record for
Apple Liquid Glass): a full-bleed map with a floating, frosted panel on top,
layered depth shadows, a specular top sheen, and tinted glass controls.

The style record's guidance is that glass is for **navigation and controls**, and
should **not** be used for *content layers or dense reading surfaces*. This app
follows that literally:

| Layer | Treatment |
| ----- | --------- |
| Panel frame, clock card, search, details card, legend, map popup, zoom control | Frosted glass (`backdrop-filter: blur() saturate()`) |
| The results list (up to 150 rows) | Opaque white surface |

The glass tint is intentionally fairly opaque (76% white). A 15%-opacity overlay
over map tiles would drop body text below the required 4.5:1 contrast ratio, so
the frosted read comes from blur, sheen and shadow rather than from transparency.

The record also requires `contrast-text-4.5`, `keyboard`, `visible-focus` and
`reduced-motion`. All four are handled:

- **Contrast** — secondary text is `#3f4a5c`, which measures 5.0:1 against the
  glass composited over a worst-case black backdrop and 8.9:1 on the opaque list.
- **Visible focus** — a 2px outline at 2px offset on all interactive elements.
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` drops transitions.
- **Reduced transparency** — `@media (prefers-reduced-transparency: reduce)` falls
  back to fully opaque surfaces.

Lighthouse reports an accessibility score of **1.0** on this build.

## Notes & limitations

- Public holidays come from the data.gov.sg consolidated holidays dataset
  `d_8ef23381f9417e4d4254ee8b4dcdb176` (2020 onwards, updated ~annually in Q3
  when the next year is gazetted). Substitute holidays are included as separate
  "(Observed)" rows.
- Markers are drawn on a canvas (`preferCanvas`) for smooth interaction with the
  full set of car parks.
- Data sources: HDB Car Park Information and Singapore Public Holidays. Map
  tiles © OpenStreetMap contributors.
