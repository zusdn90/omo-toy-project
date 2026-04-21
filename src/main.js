import { createApiClient } from './api.js';

const KAKAO_JS_KEY = '954b9ee91e9b8b758ca48e368d9cdaeb';
const NEIGHBORHOOD_MAP_CENTERS = {
  seongsu: { lat: 37.5442, lng: 127.0558, level: 4 },
  mangwon: { lat: 37.5567, lng: 126.9105, level: 4 },
  euljiro: { lat: 37.5663, lng: 126.9924, level: 4 }
};
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
  return `${value.toLocaleString('ko-KR')}원`;
}

function percentage(value) {
  return `${(value * 100).toFixed(0)}%`;
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

function renderNeighborhoodTabs() {
  return `
    <div class="neighborhood-tabs" role="tablist" aria-label="동네 선택">
      ${state.neighborhoods
        .map(
          (neighborhood) => `
            <button
              type="button"
              class="neighborhood-tab ${neighborhood.id === state.activeNeighborhoodId ? 'active' : ''}"
              data-neighborhood-id="${neighborhood.id}"
              aria-pressed="${neighborhood.id === state.activeNeighborhoodId ? 'true' : 'false'}"
            >
              <span class="tab-name">${neighborhood.name}</span>
              <span class="tab-vibe">${neighborhood.id === state.activeNeighborhoodId ? '현재 탐색 중' : '전환'}</span>
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
  const scoreSpread = report?.summary.scoreSpread ?? 0;

  return `
    <div class="metric-strip">
      <article class="summary-card emphasis">
        <span class="summary-label">등록 후보</span>
        <span class="summary-value">${view.summary.totalRestaurants}곳</span>
      </article>
      <article class="summary-card">
        <span class="summary-label">평균 가성비 점수</span>
        <span class="summary-value">${view.summary.averageScore}</span>
      </article>
      <article class="summary-card">
        <span class="summary-label">Top 5 압축</span>
        <span class="summary-value">${shortlistCount}/${candidateCount}</span>
      </article>
      <article class="summary-card">
        <span class="summary-label">점수 편차</span>
        <span class="summary-value">${scoreSpread}</span>
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
        <span class="map-chip subtle">${view.summary.bestEvidenceName}</span>
      </div>
      <div class="map-status" data-map-status>카카오맵을 불러오는 중입니다...</div>
      <div class="map-status-pill">
        <span class="tag">${view.summary.totalRestaurants} places</span>
        <span class="tag subtle">${selectedRestaurant ? `선택: ${selectedRestaurant.name}` : '선택 없음'}</span>
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
    app.innerHTML = `<section class="panel section status-panel error">${state.error ?? '표시할 데이터가 없습니다.'}</section>`;
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
          동네를 바꾸면 지도와 랭킹이 동시에 갱신되고, 공개 후기·블로그 근거가 풍부한 후보를 우선으로 자동 Top 5가 정리됩니다.
        </p>
      </div>

      <div class="hero-stats">
        <article class="hero-stat">
          <span class="summary-label">현재 탐색 동네</span>
          <strong>${view.neighborhood?.name ?? '동네 없음'}</strong>
          <p>${view.neighborhood?.vibe ?? '선택한 동네 정보가 없습니다.'}</p>
        </article>
        <article class="hero-stat">
          <span class="summary-label">가성비 전략</span>
          <strong>Evidence first</strong>
          <p>후기·블로그 근거량이 충분한 곳을 먼저 검토합니다.</p>
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
              <p class="top-reasons">가성비 점수와 근거량을 묶어서 바로 검토할 수 있게 정리했어요.</p>
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
      블로그 후보 탐색 시간을 줄이기 위한 개인용 MVP · seeded dataset demo · Kakao Map powered
    </footer>
  `;

  bindInteractions();
  void syncKakaoMap(view, selectedRestaurant);
}

function renderReport(report) {
  if (!report) {
    return '<div class="empty-state">탐색 리포트를 생성하지 못했습니다.</div>';
  }

  return `
    <div class="section-header report-header">
      <div>
        <p class="section-kicker">Insight report</p>
        <h2>후보 탐색 리포트</h2>
      </div>
      <span class="tag">local API</span>
    </div>

    <p class="report-copy">${report.narrative}</p>

    <div class="summary-strip report-metrics">
      <article class="summary-card">
        <span class="summary-label">쇼트리스트 압축</span>
        <span class="summary-value">${report.summary.shortlistCount}/${report.summary.candidateCount}</span>
      </article>
      <article class="summary-card">
        <span class="summary-label">만원 이하 후보</span>
        <span class="summary-value">${report.summary.affordableCount}곳</span>
      </article>
      <article class="summary-card">
        <span class="summary-label">근거량 강한 후보</span>
        <span class="summary-value">${report.summary.evidenceStrongCount}곳</span>
      </article>
      <article class="summary-card">
        <span class="summary-label">긍정 반응 강한 후보</span>
        <span class="summary-value">${report.summary.highConfidenceCount}곳</span>
      </article>
    </div>

    <div class="report-grid">
      <article class="report-block">
        <h3>탐색 기준</h3>
        <ul class="reason-list">
          <li>맛 ${Math.round(report.instrumentation.weights.taste * 100)}%</li>
          <li>가성비 ${Math.round(report.instrumentation.weights.affordability * 100)}%</li>
          <li>근거량 ${Math.round(report.instrumentation.weights.evidence * 100)}%</li>
          <li>긍정 반응 ${Math.round(report.instrumentation.weights.sentiment * 100)}%</li>
        </ul>
        <p class="report-copy subtle">${report.instrumentation.strategy}</p>
      </article>
      <article class="report-block">
        <h3>상위 후보 신호</h3>
        <ul class="reason-list compact">
          ${report.shortlist
            .map(
              (candidate) => `<li><strong>${candidate.rank}위 ${candidate.name}</strong> · 점수 ${candidate.score} · 후기 ${candidate.evidenceCount}개</li>`
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
              <button type="button" data-restaurant-id="${restaurant.id}">
                <span class="top-rank">Top ${index + 1}</span>
                <h3>${restaurant.name}</h3>
                <p class="rank-meta">${restaurant.category} · 평균 ${currency(restaurant.avgMealPrice)}</p>
                <span class="top-score">점수 ${restaurant.score}</span>
                <p class="top-reasons">${restaurant.reasons[0]}</p>
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
          <button type="button" data-restaurant-id="${restaurant.id}">
            <div class="rank-topline">
              <div>
                <span class="summary-label">${index + 1}위</span>
                <div class="rank-name">${restaurant.name}</div>
              </div>
              <span class="score-badge">${restaurant.score}</span>
            </div>
            <p class="rank-meta">${restaurant.category} · 평균 ${currency(restaurant.avgMealPrice)} · 후기 ${restaurant.evidenceCount}개</p>
            <div class="rank-tags">
              <span class="tag">블로그 ${restaurant.blogMentions}</span>
              <span class="tag subtle">긍정 ${percentage(restaurant.positiveReviewRatio)}</span>
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

  return `
    <div class="detail-hero">
      <span class="tag">현재 추천 후보</span>
      <h2>${selectedRestaurant.name}</h2>
      <p class="detail-copy">${selectedRestaurant.note}</p>
    </div>

    <div class="detail-grid">
      <article class="detail-metric">
        <span class="metric-label">가성비 점수</span>
        <span class="metric-value">${selectedRestaurant.score}</span>
      </article>
      <article class="detail-metric">
        <span class="metric-label">평균 식사비</span>
        <span class="metric-value">${currency(selectedRestaurant.avgMealPrice)}</span>
      </article>
      <article class="detail-metric">
        <span class="metric-label">근거 후기 수</span>
        <span class="metric-value">${selectedRestaurant.evidenceCount}</span>
      </article>
      <article class="detail-metric">
        <span class="metric-label">긍정 반응</span>
        <span class="metric-value">${percentage(selectedRestaurant.positiveReviewRatio)}</span>
      </article>
    </div>

    <div class="detail-tags">
      ${selectedRestaurant.specialties.map((specialty) => `<span class="tag subtle">${specialty}</span>`).join('')}
    </div>

    <section>
      <h3>추천 이유</h3>
      <ul class="reason-list">
        ${selectedRestaurant.reasons.map((reason) => `<li>${reason}</li>`).join('')}
      </ul>
    </section>

    <section>
      <h3>포스팅 포인트</h3>
      <ul class="specialty-list">
        <li>${selectedRestaurant.category} 카테고리에서 블로그 포맷화가 쉬운 메뉴 구성이에요.</li>
        <li>근거량 우선 전략에서 안정적인 검증 후보예요.</li>
        <li>지도와 랭킹에서 위치/점수 맥락을 동시에 확인할 수 있어요.</li>
      </ul>
    </section>
  `;
}

function getNeighborhoodCenter(neighborhoodId) {
  return NEIGHBORHOOD_MAP_CENTERS[neighborhoodId] ?? NEIGHBORHOOD_MAP_CENTERS.seongsu;
}

function getRestaurantLatLng(restaurant, kakao, neighborhoodId) {
  const center = getNeighborhoodCenter(neighborhoodId);
  const lat = center.lat + (50 - restaurant.y) * RESTAURANT_LAT_SPAN;
  const lng = center.lng + (restaurant.x - 50) * RESTAURANT_LNG_SPAN;

  return new kakao.maps.LatLng(lat, lng);
}

function buildInfoWindowContent(restaurant) {
  return `
    <div class="map-popover">
      <strong>${escapeHtml(restaurant.name)}</strong>
      <div>${escapeHtml(restaurant.category)} · ${escapeHtml(currency(restaurant.avgMealPrice))}</div>
      <div class="map-popover-score">점수 ${escapeHtml(restaurant.score)}</div>
    </div>
  `;
}

function loadKakaoMapsSdk() {
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
