# AGENTS.md — omo-toy-project

This repository contains a Kakao Map + local REST MVP. Follow these working rules when editing or shipping changes here.

## Core workflow
- Prefer small, reviewable diffs.
- Keep behavior stable unless the task explicitly requires a change.
- Run the relevant verification before claiming completion:
  - `npm test`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
- The default local dev origin is `http://127.0.0.1:4173`.
- The app expects `/runtime-config.js` to exist in both dev and build output.
- If you change server startup or build behavior, keep `runtime-config.js` generation and serving working together.

## Secret handling and API key safety
- **Never commit or push API keys, tokens, or other secret values.**
- Store secret values only in local environment files such as `.env` or in the shell environment.
- Keep `.env` out of git; it must remain ignored.
- Use `.env.example` for placeholders only. Do not put real values there.
- Do not hardcode Kakao keys or any other API key into tracked source files, docs, tests, or build scripts.
- If a secret appears in a diff, stop and remove it before committing or pushing.
- Before `git commit` or `git push`, verify the tree is clean of secrets and local env files:
  - check `git status --short`
  - scan the diff for key-like values
  - make sure `.env` is not staged

## Kakao-specific rules
- `KAKAO_JS_KEY` may be exposed to the browser only through runtime config, not hardcoded in source.
- `KAKAO_REST_API_KEY` must stay server-side only.
- Any Kakao API usage must respect the current local-dev domain registration and env-based config flow.
- When rendering Kakao-backed data in the UI, escape untrusted text and validate place URLs before inserting them into HTML.
- If you change the Kakao data path, preserve marker/list synchronization and the seeded fallback path.

## Documentation and examples
- If you change secret/config behavior, update `README.md` and `.env.example` together.
- Keep docs aligned with the actual dev server origin and build behavior.
- Keep `docs/kakao-map-integration.md` and `docs/kakao-map-integration-scope.md` aligned with the real code path.

## Safety stop
- If you are unsure whether a value is a secret, treat it as one and do not push it.
