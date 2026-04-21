# Kakao Map integration

This project now uses **runtime-configured Kakao keys** and a **server-side Kakao Local place search adapter**.

## Current implementation

- `index.html` loads `/runtime-config.js` before the app bundle.
- `src/server.js` serves `runtime-config.js` with the Kakao JavaScript key from environment-backed config.
- `src/main.js` reads the Kakao JavaScript key from `window.__OMO_APP_CONFIG__` instead of hardcoding it.
- `src/server.js` uses the Kakao REST API key server-side to query `GET /v2/local/search/keyword.json`.
- `src/kakao-local.js` normalizes Kakao place results into the app’s ranked view/report shape.
- `src/main.js` prefers real Kakao `lat`/`lng` coordinates when available and falls back to seeded coordinates only for demo data.
- Marker clicks and list clicks still share `state.selectedRestaurantId`, so selection sync remains intact.

## Secrets and config

- Put keys in `.env`.
- `.env` is ignored by git.
- Required keys:
  - `KAKAO_JS_KEY`
  - `KAKAO_REST_API_KEY`

## Fallback behavior

If the REST API key is missing or Kakao Local search fails, the app falls back to the seeded local dataset so the UI still works in offline/demo mode.
