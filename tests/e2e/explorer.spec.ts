import { expect, test } from '@playwright/test';

const kakaoSdkStub = `
  window.kakao = {
    maps: {
      load(callback) {
        callback();
      },
      Map: class {
        constructor(container, options) {
          this.container = container;
          this.options = options;
        }
        addControl() {}
        setBounds() {}
        setCenter() {}
      },
      LatLng: class {
        constructor(lat, lng) {
          this.lat = lat;
          this.lng = lng;
        }
      },
      LatLngBounds: class {
        extend() {}
      },
      Marker: class {
        constructor(options) {
          this.options = options;
        }
      },
      InfoWindow: class {
        setContent(content) {
          this.content = content;
        }
        open() {}
      },
      ZoomControl: class {},
      ControlPosition: {
        RIGHT_BOTTOM: 'RIGHT_BOTTOM'
      },
      event: {
        addListener() {}
      }
    }
  };
`;

test.beforeEach(async ({ page }) => {
  await page.route('https://dapi.kakao.com/v2/maps/sdk.js*', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript; charset=utf-8',
      body: kakaoSdkStub
    });
  });
});

test('seeded explorer boots in a browser and keeps map + ranking interactions in sync', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '동네 가성비 맛집 지도' })).toBeVisible();
  await expect(page.getByTestId('kakao-map-panel')).toContainText('카카오맵 연동 완료');
  await expect(page.getByTestId('selected-restaurant-panel')).toContainText('성수 갈비집');

  await page.getByTestId('neighborhood-switch-mangwon').click();
  await expect(page.getByTestId('selected-restaurant-panel')).toContainText('망원시장 국밥');
  await expect(page.getByTestId('report-panel')).toContainText('쇼트리스트');

  await page.getByTestId('ranking-mangwon-bbq-alley').click();
  await expect(page.getByTestId('selected-restaurant-panel')).toContainText('망원불향거리');
  await expect(page.getByTestId('kakao-map-panel')).toContainText('선택: 망원불향거리');
});
