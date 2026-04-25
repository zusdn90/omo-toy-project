# Kakao Map integration

This project now uses **runtime-configured Kakao keys** and a **server-side Kakao Local place search adapter** inside a **React + Next.js + TypeScript** app.

## Current implementation

- `src/app/layout.tsx` loads `/runtime-config.js` before the app hydrates.
- `src/server.ts` serves `runtime-config.js` with the Kakao JavaScript key from environment-backed config and proxies the rest of the app to Next.js.
- `src/components/neighborhood-explorer.tsx` reads the Kakao JavaScript key from `window.__OMO_APP_CONFIG__` instead of hardcoding it.
- `src/server.ts` uses the Kakao REST API key server-side to query `GET /v2/local/search/keyword.json`.
- `src/kakao-local.ts` normalizes Kakao place results into the app’s ranked view/report shape.
- `src/components/kakao-map-panel.tsx` prefers real Kakao `lat`/`lng` coordinates when available and falls back to seeded coordinates only for demo data.
- Marker clicks and list clicks still share the selected restaurant state, so selection sync remains intact.

## Secrets and config

- Put keys in `.env`.
- `.env` is ignored by git.
- Required keys:
  - `KAKAO_JS_KEY`
  - `KAKAO_REST_API_KEY`

## Fallback behavior

If the REST API key is missing or Kakao Local search fails, the app falls back to the seeded local dataset so the UI still works in offline/demo mode.
