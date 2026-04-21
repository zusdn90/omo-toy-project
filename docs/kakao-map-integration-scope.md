# Kakao Map integration scope (current baseline)

This note documents what the repo currently does, what it does **not** do yet, and the smallest safe path to real Kakao place data.

## 1) Current implementation surface

### UI entry points

- `src/main.js` renders the map shell with `#kakao-map` and a status node.
- `src/main.js` calls `syncKakaoMap(view, selectedRestaurant)` after every render.
- `src/main.js` keeps marker/list synchronization by storing a single `state.selectedRestaurantId`.
  - list click: `bindInteractions()` updates `state.selectedRestaurantId`, then calls `render()`
  - marker click: `syncKakaoMap()` registers a Kakao marker click listener that updates the same state, then calls `render()`

### Data path feeding the map

1. `src/main.js` bootstraps with `createApiClient()` from `src/api.js`.
2. `src/api.js` fetches only local endpoints:
   - `GET /api/neighborhoods`
   - `GET /api/neighborhoods/:id/view`
   - `GET /api/neighborhoods/:id/report`
3. `src/server.js` serves those endpoints from local domain functions:
   - `buildNeighborhoodView(neighborhoodId)`
   - `buildCandidateReport(neighborhoodId)`
4. `src/domain.js` derives ranking/report data from `src/data.js` seeded restaurants.
5. `src/main.js` converts seeded `x`/`y` offsets into `kakao.maps.LatLng` via `getRestaurantLatLng()` around neighborhood center constants.

## 2) What Kakao is currently used for

The current Kakao integration is **map rendering only**:

- loads the Kakao Maps JavaScript SDK in `loadKakaoMapsSdk()`
- creates a `kakao.maps.Map`
- creates markers and an info window from already-ranked local restaurant records
- syncs map selection with the ranked list/detail panel

## 3) What is not implemented yet

The current codebase does **not** yet fetch real Kakao place search results.

Evidence from the current code:

- `src/api.js` has no Kakao endpoint/client path; it only hits the local Node server.
- `src/server.js` has no Kakao REST proxy/search endpoint.
- `src/data.js` remains the authoritative source of restaurant records.
- `src/main.js` derives marker coordinates from synthetic `x`/`y` values instead of persisted `lat`/`lng` place coordinates.

## 4) Exact code path required for real Kakao place data

The smallest safe replacement path is:

1. **Add a server-side Kakao place adapter**
   - new module, e.g. `src/kakao-places.js`
   - responsibility: call Kakao place search/keyword search, normalize results, and keep key handling off the browser path
2. **Introduce a server contract for normalized place results**
   - update `src/server.js` to either:
     - extend `GET /api/neighborhoods/:id/view`, or
     - add a dedicated place-search endpoint that the UI can consume
3. **Normalize a place model that preserves current UI expectations**
   - required fields for current UI parity: `id`, `name`, `category`, `avgMealPrice`, `evidenceCount`, `blogMentions`, `positiveReviewRatio`, `note`, and either `lat`/`lng` or a deterministic fallback mapping
4. **Update UI map rendering to prefer real coordinates**
   - `src/main.js:getRestaurantLatLng()` should prefer normalized `lat`/`lng`
   - fallback to seeded `x`/`y` only while migration is incomplete
5. **Preserve marker/list synchronization**
   - keep `state.selectedRestaurantId` as the single shared selection source
   - ensure normalized place IDs remain stable across refreshes and neighborhood switches

## 5) Required tests before/while replacing seeded data

### Tests already proving the current baseline

- `tests/server.test.js` proves the local server currently serves neighborhood/view/report payloads
- `tests/domain.test.js` proves the ranking/report derivation logic is seeded-data driven
- `tests/api.test.js` proves the browser API client currently drives the map UI only through local `/api/neighborhoods/:id/view` and `/report` endpoints

### Additional tests needed for real-place migration

1. **Place normalization unit tests**
   - verify Kakao payload → internal restaurant/place model mapping
   - verify stable ID generation and required-field fallbacks
2. **Server contract tests**
   - verify real place results are exposed without breaking the current `/view` consumer shape
3. **Selection persistence tests**
   - verify list click and marker click still converge on the same `selectedRestaurantId`
4. **Fallback tests**
   - verify seeded/demo mode still works when Kakao place lookup is unavailable

## 6) Concrete blocker / constraint

The main blocker to implementing real Kakao place data immediately is **missing data-contract and secret-handling decisions**, not map rendering:

- the repo currently hardcodes only the browser JS SDK key path in `src/main.js`
- there is no established server-side env contract for a Kakao REST key
- the UI/domain model expects editorial fields (`avgMealPrice`, `evidenceCount`, `blogMentions`, `positiveReviewRatio`, `note`) that Kakao place search alone does not provide

Because of that, replacing seeded restaurants with raw Kakao place results requires a decision first:

- **augment** Kakao place results with local editorial metadata, or
- **degrade** the ranking/detail UI to a smaller place-search-only model

Until that choice is made, the safest near-term move is to keep the current seeded ranking contract intact and introduce Kakao place data behind a normalized server-side adapter.
