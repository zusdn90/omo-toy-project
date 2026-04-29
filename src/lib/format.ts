export function currency(value: number | null | undefined) {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return '-';
  }

  return `${Number(value).toLocaleString('ko-KR')}원`;
}

export function percentage(value: number | null | undefined) {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return '-';
  }

  return `${(Number(value) * 100).toFixed(0)}%`;
}

export function formatDistance(distanceMeters: number | null | undefined) {
  if (!Number.isFinite(distanceMeters ?? Number.NaN)) {
    return '-';
  }

  return `${Number(distanceMeters).toLocaleString('ko-KR')}m`;
}

export function safePlaceUrl(value: string | null | undefined) {
  if (typeof value !== 'string' || value.length === 0) {
    return '#';
  }

  try {
    const url = new URL(value);
    if (
      (url.hostname === 'place.map.kakao.com' ||
        url.hostname === 'map.naver.com' ||
        url.hostname === 'pcmap.place.naver.com' ||
        url.hostname.endsWith('visitkorea.or.kr')) &&
      (url.protocol === 'https:' || url.protocol === 'http:')
    ) {
      return url.href;
    }
  } catch {
    return '#';
  }

  return '#';
}
