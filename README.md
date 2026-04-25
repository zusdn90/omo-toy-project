# omo-toy-project

동네 가성비 맛집을 **지도 + 랭킹 + 자동 Top 5 추천**으로 보여주는 개인용 MVP입니다.  
현재 구현은 **React + Next.js + TypeScript** 기반이며, **shadcn/ui + Tailwind CSS**로 UI를 구성합니다.
시드 데이터 기반 UI와 로컬 API 레이어를 함께 제공하며, Kakao Maps JS SDK와 Kakao Local REST API를 환경변수 기반으로 연결할 수 있습니다.

## 주요 기능

- 동네 선택(성수/망원/을지로) 기반 후보 탐색
- 가성비 점수(맛/가격/근거량/긍정비율) 기반 랭킹
- 자동 Top 5 쇼트리스트
- Kakao Map 마커 + 리스트 선택 동기화
- 후보 탐색 리포트(압축률, 근거량, 점수 편차 등)
- 로컬 API 제공 (Node 내장 HTTP)

## 로컬 실행

먼저 `.env`를 준비하세요.

```bash
cp .env.example .env
```

`.env`에는 다음 값을 넣습니다.

- `KAKAO_JS_KEY`
- `KAKAO_REST_API_KEY`

그 다음 실행합니다.

```bash
npm run dev
```

기본 주소: `http://localhost:4173`

필요하면 `HOST=127.0.0.1 npm run dev` 또는 `HOST=localhost npm run dev`처럼 Kakao JS SDK에 등록한 정확한 로컬 origin으로 맞추세요.

## 로컬 API 엔드포인트

- `GET /api/health`
- `GET /api/neighborhoods`
- `GET /api/neighborhoods/:id/snapshot`
- `GET /api/neighborhoods/:id/view` / `GET /api/neighborhoods/:id/report` (compatibility)
- `GET /runtime-config.js`

## 검증

```bash
npm run typecheck
npm test
npm run test:e2e
npm run lint
npm run build
```

브라우저 e2e는 Playwright Chromium이 필요합니다. 처음 실행 전 `npx playwright install chromium`를 한 번 실행하세요.

## 문서

- 로컬 확장/운영 계약: [`docs/local-safe-ops.md`](docs/local-safe-ops.md)
- 현재 Kakao Map 연동 범위: [`docs/kakao-map-integration.md`](docs/kakao-map-integration.md)
- Kakao place migration scope: [`docs/kakao-map-integration-scope.md`](docs/kakao-map-integration-scope.md)
