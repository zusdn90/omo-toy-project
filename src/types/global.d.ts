export {};

declare global {
  interface Window {
    __OMO_APP_CONFIG__?: import('../lib/kakao-types').RuntimeConfig;
    kakao?: import('../lib/kakao-types').KakaoNamespace;
  }
}
