export type KakaoLatLng = {
  lat: number;
  lng: number;
};

export type KakaoMapOptions = {
  center: KakaoLatLng;
  level: number;
  draggable?: boolean;
  scrollwheel?: boolean;
};

export interface KakaoLatLngBounds {
  extend(point: KakaoLatLng): void;
}

export interface KakaoMarker {
  setZIndex?(zIndex: number): void;
}

export interface KakaoMarkerImage {}

export interface KakaoSize {}

export interface KakaoPoint {}

export interface KakaoInfoWindow {
  setContent(content: string): void;
  open(map: KakaoMapInstance, marker: KakaoMarker): void;
}

export interface KakaoZoomControl {}

export interface KakaoMapInstance {
  addControl(control: KakaoZoomControl, position: string): void;
  setBounds(bounds: KakaoLatLngBounds): void;
  setCenter(point: KakaoLatLng): void;
}

export interface KakaoMapsApi {
  Map: new (container: HTMLElement, options: KakaoMapOptions) => KakaoMapInstance;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Marker: new (options: { map: KakaoMapInstance; position: KakaoLatLng; title?: string; zIndex?: number; image?: KakaoMarkerImage }) => KakaoMarker;
  MarkerImage: new (src: string, size: KakaoSize, options?: { offset?: KakaoPoint }) => KakaoMarkerImage;
  Size: new (width: number, height: number) => KakaoSize;
  Point: new (x: number, y: number) => KakaoPoint;
  InfoWindow: new (options: { zIndex?: number }) => KakaoInfoWindow;
  ZoomControl: new () => KakaoZoomControl;
  ControlPosition: {
    RIGHT_BOTTOM: string;
  };
  event: {
    addListener(target: KakaoMarker, type: 'click', handler: () => void): void;
  };
  load(callback: () => void): void;
}

export interface KakaoNamespace {
  maps: KakaoMapsApi;
}

export type RuntimeConfig = {
  kakaoJsKey?: string;
};
