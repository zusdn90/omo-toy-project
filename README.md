# omo-toy-project

동네 가성비 맛집을 지도 + 랭킹 + 자동 Top 5 추천으로 보여주는 개인용 MVP입니다.

## Current shape

- **현재 베이스라인**: seeded 데이터 기반의 정적 MVP
- **이번 local-safe 확장 목표**: 외부 서비스나 새 의존성 없이 로컬 서버/API 레이어, 후보 탐색 계측, 문서/검증 품질을 강화
- **주 사용자**: 블로그 후보를 빠르게 고르고 싶은 개인 사용자의 로컬 워크플로

## Local-safe expansion contract

이번 라운드에서 문서화한 확장 방향은 아래 3가지입니다.

1. **Local server / API layer**
   - seeded 데이터를 브라우저 직접 import 대신 로컬 API로도 소비할 수 있게 유지
   - Node 내장 기능만 사용하고 외부 DB/호스팅 의존성을 추가하지 않음
2. **Candidate-finding instrumentation**
   - 어떤 동네를 얼마나 전환했는지
   - Top 5/상세 패널에서 어떤 후보를 선택했는지
   - 첫 후보 선택까지 걸린 시간을 로컬에서만 측정
3. **Verification tightening**
   - `npm test`, `npm run lint`, `npm run build`를 기본 회귀 체크로 유지
   - 변경 시에는 로컬 API 응답/리포트 산출물까지 함께 확인

세부 계약과 리뷰 메모는 [`docs/local-safe-ops.md`](docs/local-safe-ops.md)에 정리했습니다.

## Run locally

### Static demo

브라우저에서 `index.html`을 직접 열거나, 정적 서버를 띄워 확인할 수 있습니다.

### Local-safe runtime (documented target)

로컬 서버/API 레이어가 켜진 브랜치에서는 아래 흐름을 기대합니다.

1. Node 내장 HTTP 서버를 실행한다.
2. 브라우저 UI는 seeded 데이터의 파생 뷰를 직접 계산하거나, 동일한 계산 결과를 로컬 API로 조회한다.
3. 사용 중 발생한 후보 탐색 이벤트는 브라우저 메모리/로컬 리포트 파일에만 남긴다.

예상 엔트리포인트와 리포트 형식은 `docs/local-safe-ops.md` 참고.

## Verification

```bash
npm test
npm run lint
npm run build
```

추가로 local-safe 확장 브랜치에서는 아래를 함께 확인합니다.

- 로컬 API가 seeded neighborhood / ranking / report 데이터를 노출하는지
- 후보 탐색 계측이 로컬 범위를 벗어나지 않는지
- 문서의 계약과 실제 엔드포인트/산출물이 일치하는지
