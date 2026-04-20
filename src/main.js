import { createApiClient } from './api.js';

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

function currency(value) {
  return `${value.toLocaleString('ko-KR')}원`;
}

function percentage(value) {
  return `${(value * 100).toFixed(0)}%`;
}

function isSelected(restaurantId, selectedRestaurantId) {
  return restaurantId === selectedRestaurantId ? 'active' : '';
}

function bindInteractions() {
  document.querySelector('#neighborhood-select')?.addEventListener('change', (event) => {
    void loadNeighborhood(event.target.value);
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
    <section class="panel toolbar">
      <label>
        동네 선택
        <select id="neighborhood-select" aria-label="동네 선택">
          ${state.neighborhoods
            .map(
              (neighborhood) => `
                <option value="${neighborhood.id}" ${neighborhood.id === state.activeNeighborhoodId ? 'selected' : ''}>
                  ${neighborhood.name}
                </option>
              `
            )
            .join('')}
        </select>
      </label>
      <div>
        <strong>${view.neighborhood?.name ?? '동네 없음'}</strong>
        <p class="rank-meta">${view.neighborhood?.vibe ?? '선택한 동네의 분위기 설명이 없습니다.'}</p>
      </div>
      <div class="summary-strip">
        <article class="summary-card">
          <span class="summary-label">등록 후보</span>
          <span class="summary-value">${view.summary.totalRestaurants}곳</span>
        </article>
        <article class="summary-card">
          <span class="summary-label">평균 가성비 점수</span>
          <span class="summary-value">${view.summary.averageScore}</span>
        </article>
        <article class="summary-card">
          <span class="summary-label">근거량 최다</span>
          <span class="summary-value">${view.summary.bestEvidenceName}</span>
        </article>
        <article class="summary-card">
          <span class="summary-label">최저 평균 식사비</span>
          <span class="summary-value">${view.summary.lowestPriceLabel}</span>
        </article>
      </div>
    </section>

    <section class="panel section report-panel">
      <div class="section-header">
        <div>
          <h2>후보 탐색 리포트</h2>
          <p class="top-reasons">로컬 API가 생성한 계량 지표로 후보군을 얼마나 빨리 좁혔는지 보여줍니다.</p>
        </div>
        <span class="tag">${state.isLoading ? '동기화 중' : 'local API'}</span>
      </div>
      ${renderReport(report)}
      ${state.error ? `<p class="status-inline error">${state.error}</p>` : ''}
    </section>

    <section class="panel">
      <p class="evidence-note">
        v1은 숨은 맛집 탐색보다 <strong>공개 후기·블로그 근거량이 풍부한 후보</strong>를 우선 신뢰합니다.
      </p>
    </section>

    <section class="panel section">
      <div class="section-header">
        <div>
          <h2>자동 추천 Top 5</h2>
          <p class="top-reasons">가성비 점수와 근거량을 묶어서 바로 포스팅 후보를 추렸어요.</p>
        </div>
      </div>
      ${renderTopCards(view.top5, state.selectedRestaurantId)}
    </section>

    <section class="dual-grid">
      <section class="panel section">
        <div class="section-header">
          <div>
            <h2>지도 + 랭킹</h2>
            <p>마커를 누르거나 리스트를 클릭하면 디테일 패널이 함께 바뀝니다.</p>
          </div>
        </div>
        <div class="map-shell">
          <div class="map-road horizontal" style="top: 18%;"></div>
          <div class="map-road horizontal" style="top: 54%;"></div>
          <div class="map-road vertical" style="left: 34%;"></div>
          <div class="map-road vertical" style="left: 68%;"></div>
          <div class="map-river" style="top: 72%;"></div>
          <div class="marker-layer">${renderMarkers(view.ranked, state.selectedRestaurantId)}</div>
        </div>
        <div class="rank-list" style="margin-top: 16px;">
          ${renderRankList(view.ranked, state.selectedRestaurantId)}
        </div>
      </section>

      <aside class="panel detail-panel">
        ${renderDetail(selectedRestaurant)}
      </aside>
    </section>

    <footer>
      블로그 후보 탐색 시간을 줄이기 위한 개인용 MVP · seeded dataset demo · local API powered
    </footer>
  `;

  bindInteractions();
}

function renderReport(report) {
  if (!report) {
    return '<div class="empty-state">탐색 리포트를 생성하지 못했습니다.</div>';
  }

  return `
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
        <span class="summary-label">점수 편차</span>
        <span class="summary-value">${report.summary.scoreSpread}</span>
      </article>
    </div>
    <p class="report-copy">${report.narrative}</p>
    <div class="report-grid">
      <article class="report-block">
        <h3>탐색 기준</h3>
        <ul class="reason-list">
          <li>맛 ${Math.round(report.instrumentation.weights.taste * 100)}%</li>
          <li>가성비 ${Math.round(report.instrumentation.weights.affordability * 100)}%</li>
          <li>근거량 ${Math.round(report.instrumentation.weights.evidence * 100)}%</li>
          <li>긍정 반응 ${Math.round(report.instrumentation.weights.sentiment * 100)}%</li>
        </ul>
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

function renderMarkers(ranked, selectedRestaurantId) {
  return ranked
    .map(
      (restaurant, index) => `
        <button
          type="button"
          class="marker ${isSelected(restaurant.id, selectedRestaurantId)}"
          style="left:${restaurant.x}%; top:${restaurant.y}%;"
          data-restaurant-id="${restaurant.id}"
          aria-label="${index + 1}위 ${restaurant.name}"
          title="${restaurant.name}"
        ></button>
        <div class="marker-label" style="left:${restaurant.x}%; top:${restaurant.y}%">${index + 1}</div>
      `
    )
    .join('');
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
    <span class="tag">현재 추천 후보</span>
    <h2>${selectedRestaurant.name}</h2>
    <p class="detail-copy">${selectedRestaurant.note}</p>

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

void bootstrap();
