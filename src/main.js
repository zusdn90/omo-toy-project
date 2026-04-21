import { createApiClient } from './api.js';

const runtimeConfig = window.__OMO_APP_CONFIG__ ?? {};
const KAKAO_JS_KEY = runtimeConfig.kakaoJsKey ?? '';
const RESTAURANT_LAT_SPAN = 0.00036;
const RESTAURANT_LNG_SPAN = 0.00044;

const app = document.querySelector('#app');
const api = createApiClient();
const state = {
  neighborhoods: [],
  activeNeighborhoodId: null,
  selectedRestaurantId: null,
  view: null,
  report: null,
  error: null,
  isLoading: true,
  requestId: 0
};

const mapState = {
  sdkPromise: null,
  renderToken: 0
};

function currency(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }

  return `${value.toLocaleString('ko-KR')}원`;
}

function percentage(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }

  return `${(value * 100).toFixed(0)}%`;
}

function formatDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return '-';
  }

  return `${distanceMeters.toLocaleString('ko-KR')}m`;
}

function getNeighborhoodCenter(neighborhoodOrId) {
  const neighborhood =
    typeof neighborhoodOrId === 'string'
      ? state.neighborhoods.find((item) => item.id === neighborhoodOrId)
      : neighborhoodOrId;

  return neighborhood?.mapCenter ?? state.neighborhoods.find((item) => item.id === 'seongsu')?.mapCenter ?? {
    lat: 37.5442,
    lng: 127.0558,
    level: 4
  };
}

function getPlaceLocationLabel(place) {
  return place.roadAddressName || place.addressName || place.note || '-';
}

function getPlaceSubtitle(place) {
  if (Number.isFinite(place.distanceMeters)) {
    return `${formatDistance(place.distanceMeters)} · ${place.category}`;
  }

  if (Number.isFinite(place.avgMealPrice)) {
    return `${place.category} · 평균 ${currency(place.avgMealPrice)}`;
  }

  return place.category || place.note || '-';
}

function getPlaceBadge(place) {
  if (Number.isFinite(place.score)) {
    return place.score;
  }

  if (Number.isFinite(place.distanceMeters)) {
    return place.distanceMeters;
  }

  return '-';
}

function isSelected(restaurantId, selectedRestaurantId) {
  return restaurantId === selectedRestaurantId ? 'active' : '';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safePlaceUrl(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return '#';
  }

  try {
    const url = new URL(value);
    if (url.hostname === 'place.map.kakao.com' && (url.protocol === 'https:' || url.protocol === 'http:')) {
      return url.href;
    }
  } catch {
    return '#';
  }

  return '#';
}

function renderNeighborhoodTabs() {
  return `
    <div class="neighborhood-tabs" role="tablist" aria-label="동네 선택">
      ${state.neighborhoods
        .map(
          (neighborhood) => `
            <button
              type="button"
              class="neighborhood-tab ${neighborhood.id === state.activeNeighborhoodId ? 'active' : ''}"
              data-neighborhood-id="${escapeHtml(neighborhood.id)}"
              aria-pressed="${neighborhood.id === state.activeNeighborhoodId ? 'true' : 'false'}"
            >
              <span class="tab-name">${escapeHtml(neighborhood.name)}</span>
              <span class="tab-vibe">${escapeHtml(neighborhood.id === state.activeNeighborhoodId ? '현재 탐색 중' : '전환')}</span>
            </button>
          `
        )
        .join('')}
    </div>
  `;
}

function renderMetricStrip(view, report) {
  const shortlistCount = report?.summary.shortlistCount ?? view.top5.length;
  const candidateCount = report?.summary.candidateCount ?? view.ranked.length;
  const scoreLabel =
    report?.summary.averageScore != null ? report.summary.averageScore : view.summary.averageScore ?? '0.0';
  const sourceLabel = view.source === 'kakao' ? 'Kakao Local' : 'Seeded fallback';
  const distanceLabel = report?.summary.averageDistance ?? view.summary.averageDistance ?? 0;

  return `
    <div class="metric-strip">
      <article class="summary-card emphasis">
        <span class="summary-label">탐색 결과</span>
        <span class="summary-value">${escapeHtml(view.summary.totalPlaces ?? view.summary.totalRestaurants ?? view.ranked.length)}곳</span>
      </article>
      <article class="summary-card">
        <span class="summary-label">${view.source === 'kakao' ? '평균 점수' : '평균 가성비 점수'}</span>
        <span class="summary-value">${escapeHtml(scoreLabel)}</span>
      </article>
      <article class="summary-card">
        <span class="summary-label">Top 5 압축</span>
        <span class="summary-value">${escapeHtml(shortlistCount)}/${escapeHtml(candidateCount)}</span>
      </article>
      <article class="summary-card">
        <span class="summary-label">${view.source === 'kakao' ? '평균 거리' : '데이터 소스'}</span>
        <span class="summary-value">${escapeHtml(view.source === 'kakao' ? formatDistance(distanceLabel) : sourceLabel)}</span>
      </article>
    </div>
  `;
}

function renderMapShell(view, selectedRestaurant) {
  return `
      <div class="map-shell">
        <div id="kakao-map" class="kakao-map" aria-label="카카오 지도"></div>
        <div class="map-overlay">
          <span class="map-chip">Kakao Map</span>
          <span class="map-chip subtle">${escapeHtml(view.source === 'kakao' ? view.summary.searchQuery : view.summary.bestEvidenceName)}</span>
        </div>
        <div class="map-status" data-map-status>${
        view.source === 'kakao' ? 'Kakao place 데이터를 불러오는 중입니다...' : '카카오맵을 불러오는 중입니다...'
      }</div>
        <div class="map-status-pill">
        <span class="tag">${escapeHtml(view.summary.totalPlaces ?? view.summary.totalRestaurants)} places</span>
        <span class="tag subtle">${selectedRestaurant ? `선택: ${escapeHtml(selectedRestaurant.name)}` : '선택 없음'}</span>
        </div>
      </div>
  `;
}

function bindInteractions() {
  document.querySelectorAll('[data-neighborhood-id]').forEach((element) => {
    element.addEventListener('click', () => {
      const neighborhoodId = element.dataset.neighborhoodId;
      if (neighborhoodId) {
        void loadNeighborhood(neighborhoodId);
      }
    });
  });

  document.querySelectorAll('[data-restaurant-id]').forEach((element) => {
    element.addEventListener('click', () => {
      state.selectedRestaurantId = element.dataset.restaurantId ?? null;
      render();
    });
  });
}

async function bootstrap() {
  try {
    state.isLoading = true;
    render();
    state.neighborhoods = await api.fetchNeighborhoods();
    state.activeNeighborhoodId = state.neighborhoods[0]?.id ?? null;

    if (!state.activeNeighborhoodId) {
      state.isLoading = false;
      render();
      return;
    }

    await loadNeighborhood(state.activeNeighborhoodId, { keepSelection: false, showLoadingState: false });
  } catch (error) {
    state.error = error instanceof Error ? error.message : '로컬 API를 불러오지 못했습니다.';
    state.isLoading = false;
    render();
  }
}

async function loadNeighborhood(neighborhoodId, { keepSelection = false, showLoadingState = true } = {}) {
  const requestId = ++state.requestId;
  state.activeNeighborhoodId = neighborhoodId;
  state.error = null;
  state.isLoading = showLoadingState;

  if (!keepSelection) {
    state.selectedRestaurantId = null;
  }

  render();

  try {
    const { view, report } = await api.fetchNeighborhoodSnapshot(neighborhoodId);
    if (requestId !== state.requestId) {
      return;
    }

    state.view = view;
    state.report = report;
    const selectedRestaurant =
      view.ranked.find((restaurant) => restaurant.id === state.selectedRestaurantId) ?? view.selected;

    state.selectedRestaurantId = selectedRestaurant?.id ?? null;
    state.isLoading = false;
    render();
  } catch (error) {
    if (requestId !== state.requestId) {
      return;
    }

    state.error = error instanceof Error ? error.message : '선택한 동네 데이터를 불러오지 못했습니다.';
    state.isLoading = false;
    render();
  }
}

function render() {
  if (!app) {
    return;
  }

  if (!state.view && state.isLoading) {
    app.innerHTML = '<section class="panel section status-panel">로컬 API에서 시드 데이터를 불러오는 중입니다...</section>';
    return;
  }

  if (!state.view) {
    app.innerHTML = `<section class="panel section status-panel error">${escapeHtml(state.error ?? '표시할 데이터가 없습니다.')}</section>`;
    return;
  }

  const view = state.view;
  const report = state.report;
  const selectedRestaurant =
    view.ranked.find((restaurant) => restaurant.id === state.selectedRestaurantId) ?? view.selected;

  state.selectedRestaurantId = selectedRestaurant?.id ?? null;

  app.innerHTML = `
    <section class="panel hero-panel">
      <div class="hero-copy-block">
        <p class="eyebrow">개인용 블로그 후보 발굴 도구</p>
        <h1>동네 가성비 맛집 지도</h1>
        <p class="hero-copy">
          동네를 바꾸면 지도와 랭킹이 동시에 갱신되고, Kakao 장소 결과와 로컬 후보를 한 화면에서 함께 확인할 수 있습니다.
        </p>
      </div>

      <div class="hero-stats">
        <article class="hero-stat">
          <span class="summary-label">현재 탐색 동네</span>
          <strong>${escapeHtml(view.neighborhood?.name ?? '동네 없음')}</strong>
          <p>${escapeHtml(view.neighborhood?.vibe ?? '선택한 동네 정보가 없습니다.')}</p>
        </article>
        <article class="hero-stat">
          <span class="summary-label">가성비 전략</span>
          <strong>Evidence first</strong>
          <p>장소 정보와 위치 맥락을 먼저 확인한 뒤 후보를 빠르게 좁힙니다.</p>
        </article>
      </div>
    </section>

    <section class="panel section control-panel">
      <div class="section-header control-header">
        <div>
          <p class="section-kicker">Neighborhood switcher</p>
          <h2>동네를 빠르게 전환</h2>
          <p class="top-reasons">탭을 누르면 지도, 랭킹, 리포트가 한 번에 갱신됩니다.</p>
        </div>
        <span class="tag subtle">v1 · 로컬 전용</span>
      </div>
      ${renderNeighborhoodTabs()}
      ${renderMetricStrip(view, report)}
    </section>

    <div class="dashboard-grid">
      <main class="dashboard-main">
        <section class="panel section map-panel">
          <div class="section-header">
            <div>
              <p class="section-kicker">Map view</p>
              <h2>지도 + 랭킹</h2>
              <p>카카오맵 위에서 마커를 누르거나 리스트를 클릭하면 같은 후보가 강조됩니다.</p>
            </div>
          </div>
          ${renderMapShell(view, selectedRestaurant)}
        </section>

        <section class="panel section shortlist-panel">
          <div class="section-header">
            <div>
              <p class="section-kicker">Shortlist</p>
              <h2>자동 추천 Top 5</h2>
              <p class="top-reasons">지도와 리스트를 한 번에 보면서 바로 검토할 수 있게 정리했어요.</p>
            </div>
          </div>
          ${renderTopCards(view.top5, state.selectedRestaurantId)}
        </section>

        <section class="panel section rank-panel">
          <div class="section-header">
            <div>
              <p class="section-kicker">Ranked list</p>
              <h2>전체 후보 랭킹</h2>
              <p class="top-reasons">점수 순서와 증거 신호를 한눈에 비교할 수 있습니다.</p>
            </div>
          </div>
          <div class="rank-list">${renderRankList(view.ranked, state.selectedRestaurantId)}</div>
        </section>
      </main>

      <aside class="dashboard-side">
        <section class="panel section detail-panel detail-panel-sticky">
          ${renderDetail(selectedRestaurant)}
        </section>

        <section class="panel section report-panel">
          ${renderReport(report)}
        </section>
      </aside>
    </div>

    <footer>
      블로그 후보 탐색 시간을 줄이기 위한 개인용 MVP · Kakao Map powered
    </footer>
  `;

  bindInteractions();
  void syncKakaoMap(view, selectedRestaurant);
}

function renderReport(report) {
  if (!report) {
    return '<div class="empty-state">탐색 리포트를 생성하지 못했습니다.</div>';
  }

  if (report.instrumentation?.source === 'kakao-local-api') {
    return `
      <div class="section-header report-header">
        <div>
          <p class="section-kicker">Insight report</p>
          <h2>Kakao place 탐색 리포트</h2>
        </div>
        <span class="tag">kakao local</span>
      </div>

      <p class="report-copy">${escapeHtml(report.narrative)}</p>

      <div class="summary-strip report-metrics">
        <article class="summary-card">
          <span class="summary-label">후보 수</span>
          <span class="summary-value">${escapeHtml(report.summary.candidateCount)}</span>
        </article>
        <article class="summary-card">
          <span class="summary-label">쇼트리스트</span>
          <span class="summary-value">${escapeHtml(report.summary.shortlistCount)}</span>
        </article>
        <article class="summary-card">
          <span class="summary-label">평균 거리</span>
          <span class="summary-value">${escapeHtml(formatDistance(report.summary.averageDistance))}</span>
        </article>
        <article class="summary-card">
          <span class="summary-label">가장 가까운 후보</span>
          <span class="summary-value">${escapeHtml(formatDistance(report.summary.nearestDistance))}</span>
        </article>
      </div>

      <div class="report-grid">
        <article class="report-block">
          <h3>검색 기준</h3>
          <ul class="reason-list">
            <li>검색어: ${escapeHtml(report.instrumentation.query)}</li>
            <li>반경: ${escapeHtml(formatDistance(report.instrumentation.radiusMeters))}</li>
            <li>정렬: ${escapeHtml(report.instrumentation.sort)}</li>
          </ul>
          <p class="report-copy subtle">${escapeHtml(report.instrumentation.strategy)}</p>
        </article>
        <article class="report-block">
          <h3>상위 후보 신호</h3>
          <ul class="reason-list compact">
            ${report.shortlist
              .map(
                (candidate) =>
                  `<li><strong>${escapeHtml(candidate.rank)}위 ${escapeHtml(candidate.name)}</strong> · ${escapeHtml(candidate.category)} · ${escapeHtml(formatDistance(candidate.distanceMeters))}</li>`
              )
              .join('')}
          </ul>
        </article>
      </div>
    `;
  }

  return `
      <div class="section-header report-header">
        <div>
          <p class="section-kicker">Insight report</p>
          <h2>후보 탐색 리포트</h2>
        </div>
      <span class="tag">local API</span>
    </div>

    <p class="report-copy">${escapeHtml(report.narrative)}</p>

    <div class="summary-strip report-metrics">
      <article class="summary-card">
          <span class="summary-label">쇼트리스트 압축</span>
          <span class="summary-value">${escapeHtml(report.summary.shortlistCount)}/${escapeHtml(report.summary.candidateCount)}</span>
        </article>
        <article class="summary-card">
          <span class="summary-label">만원 이하 후보</span>
          <span class="summary-value">${escapeHtml(report.summary.affordableCount)}곳</span>
        </article>
        <article class="summary-card">
          <span class="summary-label">근거량 강한 후보</span>
          <span class="summary-value">${escapeHtml(report.summary.evidenceStrongCount)}곳</span>
        </article>
        <article class="summary-card">
          <span class="summary-label">긍정 반응 강한 후보</span>
          <span class="summary-value">${escapeHtml(report.summary.highConfidenceCount)}곳</span>
        </article>
    </div>

    <div class="report-grid">
      <article class="report-block">
        <h3>탐색 기준</h3>
        <ul class="reason-list">
          <li>맛 ${escapeHtml(Math.round(report.instrumentation.weights.taste * 100))}%</li>
          <li>가성비 ${escapeHtml(Math.round(report.instrumentation.weights.affordability * 100))}%</li>
          <li>근거량 ${escapeHtml(Math.round(report.instrumentation.weights.evidence * 100))}%</li>
          <li>긍정 반응 ${escapeHtml(Math.round(report.instrumentation.weights.sentiment * 100))}%</li>
        </ul>
        <p class="report-copy subtle">${escapeHtml(report.instrumentation.strategy)}</p>
      </article>
      <article class="report-block">
        <h3>상위 후보 신호</h3>
        <ul class="reason-list compact">
          ${report.shortlist
            .map(
              (candidate) =>
                `<li><strong>${escapeHtml(candidate.rank)}위 ${escapeHtml(candidate.name)}</strong> · 점수 ${escapeHtml(candidate.score)} · 후기 ${escapeHtml(candidate.evidenceCount)}개</li>`
            )
            .join('')}
        </ul>
      </article>
    </div>
  `;
}

function renderTopCards(top5, selectedRestaurantId) {
  if (top5.length === 0) {
    return '<div class="empty-state">이 동네에는 아직 추천 후보가 없습니다.</div>';
  }

  return `
    <div class="top-grid">
      ${top5
        .map(
          (restaurant, index) => `
            <article class="top-card ${isSelected(restaurant.id, selectedRestaurantId)}">
              <button type="button" data-restaurant-id="${escapeHtml(restaurant.id)}">
                <span class="top-rank">Top ${escapeHtml(index + 1)}</span>
                <h3>${escapeHtml(restaurant.name)}</h3>
                <p class="rank-meta">${escapeHtml(getPlaceSubtitle(restaurant))}</p>
                <span class="top-score">점수 ${escapeHtml(getPlaceBadge(restaurant))}</span>
                <p class="top-reasons">${escapeHtml(getPlaceLocationLabel(restaurant))}</p>
              </button>
            </article>
          `
        )
        .join('')}
    </div>
  `;
}

function renderRankList(ranked, selectedRestaurantId) {
  if (ranked.length === 0) {
    return '<div class="empty-state">이 동네에는 데이터가 없습니다.</div>';
  }

  return ranked
    .map(
      (restaurant, index) => `
        <article class="rank-item ${isSelected(restaurant.id, selectedRestaurantId)}">
          <button type="button" data-restaurant-id="${escapeHtml(restaurant.id)}">
            <div class="rank-topline">
              <div>
                <span class="summary-label">${escapeHtml(index + 1)}위</span>
                <div class="rank-name">${escapeHtml(restaurant.name)}</div>
              </div>
              <span class="score-badge">${escapeHtml(getPlaceBadge(restaurant))}</span>
            </div>
            <p class="rank-meta">${escapeHtml(getPlaceSubtitle(restaurant))}</p>
            <div class="rank-tags">
              <span class="tag">${escapeHtml(restaurant.placeUrl ? 'Kakao place' : 'Seeded data')}</span>
              <span class="tag subtle">${escapeHtml(getPlaceLocationLabel(restaurant))}</span>
            </div>
          </button>
        </article>
      `
    )
    .join('');
}

function renderDetail(selectedRestaurant) {
  if (!selectedRestaurant) {
    return '<div class="empty-state">선택된 후보가 없습니다.</div>';
  }

  if (selectedRestaurant.placeUrl || selectedRestaurant.addressName || selectedRestaurant.roadAddressName) {
    return `
      <div class="detail-hero">
        <span class="tag">${escapeHtml(selectedRestaurant.source === 'kakao' ? 'Kakao place' : '현재 추천 후보')}</span>
        <h2>${escapeHtml(selectedRestaurant.name)}</h2>
        <p class="detail-copy">${escapeHtml(getPlaceLocationLabel(selectedRestaurant))}</p>
      </div>

      <div class="detail-grid">
        <article class="detail-metric">
          <span class="metric-label">점수</span>
          <span class="metric-value">${escapeHtml(getPlaceBadge(selectedRestaurant))}</span>
        </article>
        <article class="detail-metric">
          <span class="metric-label">카테고리</span>
          <span class="metric-value">${escapeHtml(selectedRestaurant.category || '-')}</span>
        </article>
        <article class="detail-metric">
          <span class="metric-label">거리</span>
          <span class="metric-value">${escapeHtml(formatDistance(selectedRestaurant.distanceMeters))}</span>
        </article>
        <article class="detail-metric">
          <span class="metric-label">전화</span>
          <span class="metric-value">${escapeHtml(selectedRestaurant.phone || '-')}</span>
        </article>
      </div>

      <section>
        <h3>주소</h3>
        <ul class="specialty-list">
          <li>${escapeHtml(selectedRestaurant.roadAddressName || '도로명 주소 정보 없음')}</li>
          <li>${escapeHtml(selectedRestaurant.addressName || '지번 주소 정보 없음')}</li>
        </ul>
      </section>

      <section>
        <h3>바로가기</h3>
        <ul class="specialty-list">
          <li><a href="${escapeHtml(safePlaceUrl(selectedRestaurant.placeUrl))}" target="_blank" rel="noreferrer">카카오 장소 상세 페이지 열기</a></li>
        </ul>
      </section>
    `;
  }

  return `
    <div class="detail-hero">
      <span class="tag">현재 추천 후보</span>
      <h2>${escapeHtml(selectedRestaurant.name)}</h2>
      <p class="detail-copy">${escapeHtml(selectedRestaurant.note)}</p>
    </div>

    <div class="detail-grid">
      <article class="detail-metric">
        <span class="metric-label">가성비 점수</span>
        <span class="metric-value">${escapeHtml(selectedRestaurant.score)}</span>
      </article>
      <article class="detail-metric">
        <span class="metric-label">평균 식사비</span>
        <span class="metric-value">${escapeHtml(currency(selectedRestaurant.avgMealPrice))}</span>
      </article>
      <article class="detail-metric">
        <span class="metric-label">근거 후기 수</span>
        <span class="metric-value">${escapeHtml(selectedRestaurant.evidenceCount)}</span>
      </article>
      <article class="detail-metric">
        <span class="metric-label">긍정 반응</span>
        <span class="metric-value">${escapeHtml(percentage(selectedRestaurant.positiveReviewRatio))}</span>
      </article>
    </div>

    <div class="detail-tags">
      ${selectedRestaurant.specialties
        .map((specialty) => `<span class="tag subtle">${escapeHtml(specialty)}</span>`)
        .join('')}
    </div>

    <section>
      <h3>추천 이유</h3>
      <ul class="reason-list">
        ${selectedRestaurant.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}
      </ul>
    </section>

    <section>
      <h3>포스팅 포인트</h3>
      <ul class="specialty-list">
        <li>${escapeHtml(selectedRestaurant.category)} 카테고리에서 블로그 포맷화가 쉬운 메뉴 구성이에요.</li>
        <li>근거량 우선 전략에서 안정적인 검증 후보예요.</li>
        <li>지도와 랭킹에서 위치/점수 맥락을 동시에 확인할 수 있어요.</li>
      </ul>
    </section>
  `;
}

function getRestaurantLatLng(restaurant, kakao, neighborhoodId) {
  if (Number.isFinite(restaurant.lat) && Number.isFinite(restaurant.lng)) {
    return new kakao.maps.LatLng(restaurant.lat, restaurant.lng);
  }

  const center = getNeighborhoodCenter(neighborhoodId);
  const lat = center.lat + (50 - restaurant.y) * RESTAURANT_LAT_SPAN;
  const lng = center.lng + (restaurant.x - 50) * RESTAURANT_LNG_SPAN;

  return new kakao.maps.LatLng(lat, lng);
}

function buildInfoWindowContent(restaurant) {
  return `
    <div class="map-popover">
      <strong>${escapeHtml(restaurant.name)}</strong>
      <div>${escapeHtml(restaurant.category || '-')} · ${escapeHtml(getPlaceLocationLabel(restaurant))}</div>
      <div class="map-popover-score">점수 ${escapeHtml(getPlaceBadge(restaurant))}</div>
    </div>
  `;
}

function loadKakaoMapsSdk() {
  if (!KAKAO_JS_KEY) {
    return Promise.reject(new Error('Kakao JS key is missing from runtime config'));
  }

  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao);
  }

  if (!mapState.sdkPromise) {
    mapState.sdkPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-kakao-maps-sdk="true"]');

      if (existing) {
        existing.addEventListener(
          'load',
          () => {
            window.kakao.maps.load(() => resolve(window.kakao));
          },
          { once: true }
        );
        existing.addEventListener('error', () => reject(new Error('Kakao Maps SDK failed to load')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.dataset.kakaoMapsSdk = 'true';
      script.async = true;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`;
      script.onload = () => {
        if (!window.kakao?.maps) {
          reject(new Error('Kakao Maps SDK loaded without kakao.maps'));
          return;
        }

        window.kakao.maps.load(() => resolve(window.kakao));
      };
      script.onerror = () => reject(new Error('Kakao Maps SDK failed to load'));
      document.head.append(script);
    });
  }

  return mapState.sdkPromise;
}

async function syncKakaoMap(view, selectedRestaurant) {
  const renderToken = ++mapState.renderToken;
  const statusNode = document.querySelector('[data-map-status]');
  const mapNode = document.querySelector('#kakao-map');

  if (!statusNode || !mapNode) {
    return;
  }

  statusNode.textContent = '카카오맵을 불러오는 중입니다...';
  statusNode.classList.remove('error');

  try {
    const kakao = await loadKakaoMapsSdk();
    if (renderToken !== mapState.renderToken || !mapNode.isConnected) {
      return;
    }

    const neighborhoodId = view.neighborhood?.id ?? state.activeNeighborhoodId ?? 'seongsu';
    const center = getNeighborhoodCenter(neighborhoodId);
    const centerLatLng = new kakao.maps.LatLng(center.lat, center.lng);
    const map = new kakao.maps.Map(mapNode, {
      center: centerLatLng,
      level: center.level,
      draggable: true,
      scrollwheel: true
    });

    map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT_BOTTOM);

    const bounds = new kakao.maps.LatLngBounds();
    const infoWindow = new kakao.maps.InfoWindow({ zIndex: 10 });
    const markers = view.ranked.map((restaurant) => {
      const position = getRestaurantLatLng(restaurant, kakao, neighborhoodId);
      const marker = new kakao.maps.Marker({
        map,
        position,
        title: restaurant.name,
        zIndex: restaurant.id === selectedRestaurant?.id ? 3 : 1
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        state.selectedRestaurantId = restaurant.id;
        render();
      });

      bounds.extend(position);
      return { restaurant, marker, position };
    });

    if (markers.length > 1) {
      map.setBounds(bounds);
    } else if (markers.length === 1) {
      map.setCenter(markers[0].position);
    }

    const selectedEntry =
      markers.find(({ restaurant }) => restaurant.id === selectedRestaurant?.id) ?? markers[0] ?? null;

    if (selectedEntry) {
      infoWindow.setContent(buildInfoWindowContent(selectedEntry.restaurant));
      infoWindow.open(map, selectedEntry.marker);
    }

    statusNode.textContent = `카카오맵 연동 완료 · ${view.ranked.length}개 마커`;
  } catch (error) {
    if (renderToken !== mapState.renderToken || !statusNode.isConnected) {
      return;
    }

    statusNode.textContent = error instanceof Error ? error.message : '카카오맵을 불러오지 못했습니다.';
    statusNode.classList.add('error');
  }
}

void bootstrap();
