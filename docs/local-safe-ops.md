# Local-safe runtime + review notes

이 문서는 정적 MVP를 **로컬 전용으로 안전하게 확장**할 때 지켜야 하는 API/계측/검증 계약과 코드 리뷰 포인트를 정리합니다.

## 1) 목적

외부 크롤러나 SaaS 분석 도구 없이, 그리고 **지도는 Kakao Maps SDK를 표시 레이어로만 제한**한 상태에서 아래를 가능하게 만드는 것이 목표입니다.

- seeded 데이터의 로컬 API 소비
- 후보 탐색 시간을 줄였는지 확인할 수 있는 로컬 계측
- 회귀를 빠르게 확인할 수 있는 재현 가능한 검증 루틴

## 2) 권장 로컬 아키텍처

### Data flow

1. `src/data.ts`의 seeded dataset이 단일 source of truth 역할을 한다.
2. 도메인 계산(점수, Top 5, 추천 이유, neighborhood summary)은 `src/domain.ts`에 유지한다.
3. 로컬 서버는 위 도메인 계산 결과를 JSON으로 노출한다.
4. UI는 직접 계산 또는 API 소비 중 어느 경로를 쓰더라도 **동일한 파생 결과**를 보여줘야 한다.

### Dependency guardrails

- 로컬 서버/API 구현은 Node 내장 모듈만 사용한다.
- 외부 네트워크 의존은 Kakao Maps JS SDK 로드로 한정하고, place 검색·분석·수집 용도로 넓히지 않는다.
- 런타임 저장소는 선택적 로컬 파일 또는 메모리 수준에 한정한다.
- 계측 데이터는 개인 로컬 워크플로 분석용이며, 외부 전송을 금지한다.

## 3) Suggested API contract

구현 세부는 달라도, 문서/테스트/리뷰 관점에서는 아래 계약을 충족하는 편이 안전합니다.

### `GET /api/neighborhoods`

반환 목적:
- neighborhood selector를 API 기반으로 채울 수 있게 함

예상 응답 shape:

```json
{
  "neighborhoods": [
    {
      "id": "seongsu",
      "name": "성수",
      "vibe": "..."
    }
  ]
}
```

### `GET /api/neighborhoods/:id/snapshot`

반환 목적:
- Top 5, ranking, summary, selected fallback, candidate report를 한 번에 제공

예상 응답 shape:

```json
{
  "view": {
    "neighborhood": { "id": "seongsu", "name": "성수", "vibe": "..." },
    "source": "seeded",
    "ranked": [],
    "top5": [],
    "selected": null,
    "summary": {
      "totalRestaurants": 0,
      "averageScore": "0.0",
      "bestEvidenceName": "-",
      "lowestPriceLabel": "-"
    }
  },
  "report": {
    "source": "seeded",
    "summary": {
      "candidateCount": 0,
      "shortlistCount": 0
    },
    "instrumentation": {
      "source": "seeded",
      "weights": {
        "taste": 0.34,
        "affordability": 0.26,
        "evidence": 0.25,
        "sentiment": 0.15
      },
      "strategy": "...",
      "thresholds": {
        "affordableMealPrice": 10000,
        "evidenceStrong": 70,
        "highConfidenceRatio": 0.91
      }
    },
    "shortlist": [],
    "candidates": [],
    "narrative": "..."
  }
}
```

### `GET /api/neighborhoods/:id/view`

호환성을 위해 유지되는 단일 뷰 엔드포인트다. 내부적으로는 `/snapshot`의 `view`와 같은 산출물을 반환한다.

### `GET /api/neighborhoods/:id/report`

호환성을 위해 유지되는 단일 리포트 엔드포인트다. 내부적으로는 `/snapshot`의 `report`와 같은 산출물을 반환한다.

## 4) Instrumentation/reporting guidance

### 최소 측정 지표

1. **동네 전환 수**
   - 사용자가 후보 풀을 얼마나 넓게 탐색했는지 확인
2. **후보 선택 수**
   - 상세 패널/랭킹/마커 상호작용 빈도 파악
3. **첫 후보 선택까지 걸린 시간**
   - “찾는 데 덜 걸렸는가?”를 가장 단순하게 보는 핵심 신호
4. **선택된 후보 목록**
   - 실제로 어떤 식당이 끝까지 검토되었는지 확인

### 계측 원칙

- 계측은 UX를 방해하지 않아야 한다.
- 식당 점수 계산에 계측 상태를 섞지 않는다.
- 계측 실패가 UI 기본 기능을 깨뜨리지 않아야 한다.
- 브라우저 메모리/로컬 파일 산출물은 허용하되 외부 전송은 금지한다.

### 리포트 해석 팁

- `timeToFirstSelectionMs`가 낮고 `candidateSelectionCount`가 적당하면 빠른 의사결정 흐름일 수 있다.
- `candidateSelectionCount`가 매우 높으면 shortlist/summary가 충분히 압축적이지 않을 수 있다.
- 특정 neighborhood에서만 선택이 몰리면 dataset 균형 또는 추천 기준 설명을 점검한다.

## 5) Code review checklist

### Domain consistency

- API 응답이 `buildNeighborhoodView` 결과와 불일치하지 않는가?
- UI가 직접 계산 경로와 API 소비 경로에서 서로 다른 정렬/선택 규칙을 사용하지 않는가?
- 추천 이유 문자열 생성 로직이 한 곳에만 유지되는가?

### Local server safety

- 서버가 seeded 데이터 외의 외부 입력에 의존하지 않는가?
- query 파라미터가 없거나 잘못돼도 빈 상태/안전한 기본값으로 처리되는가?
- CORS/외부 공개를 전제로 한 복잡한 설정을 도입하지 않았는가?

### Reporting integrity

- report endpoint/산출물이 개인 로컬 분석 범위를 넘지 않는가?
- timestamp와 카운터 계산이 deterministic하게 검증 가능한가?
- 리포트가 없더라도 main flow(지도/랭킹/상세 패널)가 정상 동작하는가?

### Maintainability

- 새 런타임 코드가 기존 정적 진입점 사용성을 해치지 않는가?
- docs의 엔드포인트 이름과 실제 코드가 일치하는가?
- 빌드 산출물에 API 관련 정적 자산/문서 누락이 없는가?

## 6) Verification checklist

기본 회귀:

```bash
npm test
npm run lint
npm run build
```

추가 확인 권장:

1. 로컬 서버 실행 후 `GET /api/neighborhoods` 확인
2. `GET /api/neighborhoods/seongsu/snapshot` 확인
3. 후보 선택/동네 전환 후 `GET /api/neighborhoods/seongsu/snapshot` 또는 동등 산출물 확인
4. README와 실제 실행 절차/엔드포인트 이름이 일치하는지 확인

## 7) Review outcome for the current baseline

현재 베이스라인 정적 MVP를 기준으로 보면:

- `src/domain.ts`는 점수 계산과 Top 5 파생 로직을 중앙화하고 있어 API 레이어 재사용에 적합함
- `src/components/neighborhood-explorer.tsx`와 `src/components/kakao-map-panel.tsx`가 seeded `x`/`y` 좌표를 neighborhood 중심점 기준으로 Kakao Map 마커에 투영하며, marker/list selection state를 공유함
- `scripts/lint.ts`, `tests/domain.test.ts`, `tests/server.test.ts`, `scripts/build.ts`가 이미 경량 검증 루프를 제공함
- Kakao Map 연동은 이미 들어와 있지만 place search/geocoding은 아직 없으므로, 이번 backlog에서는 **문서-구현-검증 이름 일치**와 **현재 scope 고정**이 특히 중요함

## 8) Do / don't

### Do

- seeded data를 authoritative source로 유지
- domain derivation 로직을 재사용
- 로컬 사용자 의사결정 시간 단축에 직접 연결되는 지표만 수집
- 문서와 테스트를 실제 엔드포인트/산출물 이름에 맞춰 갱신

### Don't

- 새 의존성 추가
- 외부 분석 SDK 연동
- 계측 데이터를 점수 산식에 직접 반영
- static demo와 local API 흐름을 서로 다른 진실 소스로 분리
