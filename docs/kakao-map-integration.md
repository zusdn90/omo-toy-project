# Kakao Map integration scope

이 문서는 **현재 코드베이스에 이미 들어와 있는 Kakao Map 연동 범위**를 코드와 테스트 기준으로 정리한 문서입니다. 목적은 현재 상태를 정확히 고정해 두고, 이후 seeded restaurant 데이터에서 실제 Kakao place 데이터로 넘어갈 때 어떤 경계를 유지해야 하는지 분명히 하는 것입니다.

## Verified sources

현재 범위는 아래 파일을 기준으로 확인했습니다.

- `src/main.js` — Kakao Maps SDK 로드, 지도 렌더링, 마커/리스트 동기화
- `src/api.js` — UI가 읽는 로컬 API 경로
- `src/server.js` — seeded data 기반 로컬 API 제공
- `src/data.js` — restaurant seed와 `x`/`y` 좌표 source of truth
- `tests/server.test.js` — 로컬 API/정적 셸 검증
- `tests/domain.test.js` — ranked view/report 파생 데이터 검증
- `tests/kakao-map-scope.test.js` — Kakao Map 연동 범위와 문서 고정 검증

## Current scope

### 1) Kakao Map은 UI 렌더링 레이어다

현재 Kakao 연동은 `src/main.js` 안에만 존재합니다.

- `renderMapShell()`이 `#kakao-map` 컨테이너를 렌더링한다.
- `loadKakaoMapsSdk()`가 브라우저에서 Kakao Maps JS SDK를 동적으로 주입한다.
- `syncKakaoMap()`이 현재 neighborhood view를 기반으로 새 지도를 만들고 마커를 다시 그린다.

즉, Kakao Map은 **후보를 보여주는 presentation layer**이고, 후보 데이터 자체를 가져오는 source가 아닙니다.

### 2) 현재 지도 좌표는 seeded restaurant 데이터에서 계산된다

실제 place 좌표를 Kakao에서 조회하지 않습니다.

- restaurant 원본은 `src/data.js`의 seeded dataset이다.
- 각 restaurant는 `x`, `y` 좌표를 가진다.
- `src/main.js`의 `NEIGHBORHOOD_MAP_CENTERS`와 `RESTAURANT_LAT_SPAN` / `RESTAURANT_LNG_SPAN`을 사용해 `x`, `y`를 `kakao.maps.LatLng`로 투영한다.

따라서 현재 마커 위치는 **실제 Kakao place 검색 결과**가 아니라, 동네 중심점 주변에 배치한 로컬 프로젝션 결과입니다.

### 3) marker/list synchronization은 이미 구현돼 있다

현재 동기화 범위는 다음과 같습니다.

- 리스트/Top 5 버튼 클릭 → `state.selectedRestaurantId` 갱신 → 전체 UI 재렌더
- 마커 클릭 → 같은 `state.selectedRestaurantId` 갱신 → 전체 UI 재렌더
- 재렌더 후 `syncKakaoMap()`이 선택된 restaurant 기준으로 info window를 다시 연다.

즉, **지도와 리스트는 같은 selection state를 공유**하지만, 이 state는 브라우저 메모리 안에만 존재합니다.

### 4) 데이터는 로컬 API에서만 온다

UI는 Kakao SDK에서 place 데이터를 받지 않습니다.

- `src/api.js`는 `/api/neighborhoods`
- `src/api.js`는 `/api/neighborhoods/:id/view`
- `src/api.js`는 `/api/neighborhoods/:id/report`

이 세 경로만 호출합니다. 실제 데이터와 점수/리포트 파생은 `src/server.js` + `src/domain.js`가 처리합니다.

## Explicit non-scope in the current code

현재 코드에는 아래가 **없습니다**.

- Kakao Places keyword/category search
- place id 저장 또는 참조
- 주소/도로명 기반 geocoding
- server-side Kakao API 호출
- neighborhood 밖의 동적 bounds 계산용 원본 place 좌표 저장
- marker 선택 상태의 URL/localStorage/persistence 연동

즉, 지금 단계는 **Kakao Maps base map + locally projected seeded markers** 까지만 구현된 상태입니다.

## Constraints this creates for real-place migration

실제 Kakao place 데이터로 넘어가려면 아래를 별도 작업으로 다뤄야 합니다.

1. restaurant seed의 `x`/`y`가 아닌 실좌표(`lat`/`lng`) 또는 place reference를 source of truth로 삼기
2. Top 5 / ranked list / selected detail이 유지되도록 기존 selection contract를 깨지 않기
3. `src/domain.js`의 ranking/report 계산과 `src/main.js`의 map rendering을 느슨하게 분리하기
4. Kakao SDK 실패 시에도 리스트/리포트는 계속 보이도록 current graceful-degradation behavior를 유지하기

## Verification mapping

현재 범위는 아래 검증으로 고정합니다.

- `tests/server.test.js` — UI가 읽는 local API contract 확인
- `tests/domain.test.js` — ranking/report derivation 확인
- `tests/kakao-map-scope.test.js` — Kakao SDK loader, seeded projection, marker/list synchronization, non-scope keywords 부재 확인

이 문서는 “다음에 무엇을 만들지”보다 “지금 무엇이 이미 들어와 있는지”를 고정하는 baseline 문서입니다.
