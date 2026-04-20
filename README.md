# omo-toy-project

동네 가성비 맛집을 **지도 + 랭킹 + 자동 Top 5 추천**으로 보여주는 개인용 MVP입니다.  
외부 의존성 없이 로컬에서 동작하도록, 시드 데이터 기반 UI와 로컬 API 레이어를 함께 제공합니다.

## 주요 기능

- 동네 선택(성수/망원/을지로) 기반 후보 탐색
- 가성비 점수(맛/가격/근거량/긍정비율) 기반 랭킹
- 자동 Top 5 쇼트리스트
- 후보 탐색 리포트(압축률, 근거량, 점수 편차 등)
- 로컬 API 제공 (Node 내장 HTTP)

## 로컬 실행

```bash
npm run dev
```

기본 주소: `http://127.0.0.1:4173`

## 로컬 API 엔드포인트

- `GET /api/health`
- `GET /api/neighborhoods`
- `GET /api/neighborhoods/:id/view`
- `GET /api/neighborhoods/:id/report`

## 검증

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## 문서

- 로컬 확장/운영 계약: [`docs/local-safe-ops.md`](docs/local-safe-ops.md)
