# Kakao Map integration scope

This note captures the current Kakao integration shape and the remaining tradeoffs.

## What is implemented now

- Kakao Maps JavaScript SDK loads from runtime config rather than a hardcoded source value.
- Kakao Local place search runs server-side with the REST API key.
- The app prefers Kakao place coordinates when available.
- Marker/list synchronization still uses a single shared selection state.
- The app falls back to seeded data when Kakao Local search is unavailable.
- The active UI shell is a React + Next.js + TypeScript page using shadcn/ui + Tailwind CSS.

## What remains intentionally unresolved

- No production deployment domain has been registered yet.
- No Admin key is used or needed.
- No Kakao Login flow is part of this project.
- The UI still supports seeded demo data, so some metrics are local fallback metrics when Kakao data is unavailable.

## Important constraints

- JavaScript key must stay in runtime config and not in tracked source.
- REST API key must stay in `.env` and never be committed.
- Local development should register the exact dev-server origin in the Kakao JavaScript SDK domain list. The default dev command now uses `http://localhost:4173`; if you set `HOST=127.0.0.1`, register that origin instead.
- The runtime-config route still exists at `/runtime-config.js`; do not hardcode the Kakao JS key into the React components.
