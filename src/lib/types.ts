export type MapCenter = {
  lat: number;
  lng: number;
  level: number;
};

export type Neighborhood = {
  id: string;
  name: string;
  vibe: string;
  mapCenter: MapCenter;
  kakaoSearch?: {
    query: string;
    radius?: number;
    sort?: string;
  };
};

export type NeighborhoodViewSummary = {
  totalRestaurants?: number;
  totalPlaces?: number;
  averageScore: string;
  bestEvidenceName: string;
  lowestPriceLabel: string;
  averageDistance?: number;
  searchQuery?: string;
  nearestPlaceName?: string;
  nearestPlaceLabel?: string;
  searchRadiusMeters?: number | null;
  searchSort?: string;
};

export type Restaurant = {
  id: string;
  neighborhoodId?: string;
  name: string;
  category?: string;
  avgMealPrice?: number;
  tasteScore?: number;
  evidenceCount?: number;
  blogMentions?: number;
  positiveReviewRatio?: number;
  x?: number;
  y?: number;
  specialties?: string[];
  note?: string;
  addressName?: string;
  roadAddressName?: string;
  phone?: string;
  placeUrl?: string;
  lat?: number;
  lng?: number;
  distanceMeters?: number;
  score?: number;
  reasons?: string[];
  source?: 'kakao';
};

export type EnrichedRestaurant = Restaurant & {
  score: number;
  reasons: string[];
};

export type SeedRestaurant = Restaurant &
  Required<
    Pick<
      Restaurant,
      | 'neighborhoodId'
      | 'category'
      | 'avgMealPrice'
      | 'tasteScore'
      | 'evidenceCount'
      | 'blogMentions'
      | 'positiveReviewRatio'
      | 'x'
      | 'y'
      | 'specialties'
      | 'note'
    >
  >;

export type NeighborhoodView = {
  neighborhood: Neighborhood | null;
  source: 'seeded' | 'kakao';
  fallbackReason?: string;
  ranked: EnrichedRestaurant[];
  top5: EnrichedRestaurant[];
  selected: EnrichedRestaurant | null;
  summary: NeighborhoodViewSummary;
};

export type CandidateReportWeights = {
  taste: number;
  affordability: number;
  evidence: number;
  sentiment: number;
};

export type CandidateReportThresholds = {
  affordableMealPrice: number;
  evidenceStrong: number;
  highConfidenceRatio: number;
};

export type CandidateReportInstrumentation = {
  source: 'seeded' | 'kakao-local-api';
  query?: string;
  radiusMeters?: number;
  sort?: string;
  weights: CandidateReportWeights;
  strategy: string;
  thresholds: CandidateReportThresholds;
};

export type CandidateReportSummary = {
  candidateCount: number;
  shortlistCount: number;
  affordableCount?: number;
  evidenceStrongCount?: number;
  highConfidenceCount?: number;
  averageDistance?: number;
  nearestDistance?: number;
  averageScore?: number;
  averageEvidenceCount?: number;
  averagePrice?: number;
  scoreSpread?: number;
};

export type CandidateReportShortlistItem = {
  rank: number;
  id: string;
  name: string;
  score: number;
  avgMealPrice?: number;
  evidenceCount?: number;
  primaryReason: string;
};

export type CandidateReportCandidateSignals = {
  affordable: boolean;
  evidenceStrong: boolean;
  highConfidence: boolean;
};

export type CandidateReportCandidateItem = {
  rank: number;
  id: string;
  name: string;
  score: number;
  avgMealPrice?: number;
  evidenceCount?: number;
  blogMentions?: number;
  positiveReviewRatio?: number;
  signals: CandidateReportCandidateSignals;
  primaryReason: string;
};

export type CandidateReport = {
  neighborhood: Neighborhood | null;
  source: 'seeded' | 'kakao';
  fallbackReason?: string;
  summary: CandidateReportSummary;
  instrumentation: CandidateReportInstrumentation;
  shortlist: CandidateReportShortlistItem[];
  candidates: CandidateReportCandidateItem[];
  narrative: string;
};

export type NeighborhoodSnapshot = {
  view: NeighborhoodView;
  report: CandidateReport;
};
