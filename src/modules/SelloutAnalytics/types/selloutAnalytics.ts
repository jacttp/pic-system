export interface SelloutPeriodKey {
  year: number;
  week: number;
}

export interface SelloutPeriod extends SelloutPeriodKey {
  startDate: string;
  endDate: string;
  calendarDays: number;
  isClosed: boolean;
  completeness: 'unknown';
  firstLoadedAt: string;
  lastLoadedAt: string;
  sourceRowCount: number;
}

export interface SelloutSkuOption {
  value: string;
  brand: string;
}

export interface SelloutContext {
  source: 'dbo.sellout_ic';
  businessDate: string;
  periods: SelloutPeriod[];
  defaultPeriods: SelloutPeriodKey[];
  lastClosedPeriod: SelloutPeriod | null;
  chains: string[];
  brands: string[];
  skus: SelloutSkuOption[];
  semantics: {
    unit: 'kg';
    missing: 'null';
    zero: 'observed';
    negative: 'net';
    completeness: 'unknown';
  };
}

export interface SelloutFilters {
  chains: string[];
  stores: string[];
  brands: string[];
  skus: string[];
}

export interface SelloutSummaryRequest {
  periods: SelloutPeriodKey[];
  filters: SelloutFilters;
}

export interface SelloutSummaryPeriod extends SelloutPeriodKey {
  kg: number;
  sourceRowCount: number;
  chains: number;
  stores: number;
  skus: number;
  negativeRows: number;
  zeroRows: number;
}

export interface SelloutSummary {
  periods: SelloutSummaryPeriod[];
}

export type SelloutMatrixLevel = 'chain' | 'store' | 'sku';

export interface SelloutMatrixRequest extends SelloutSummaryRequest {
  level: SelloutMatrixLevel;
  parent?: { chain?: string; store?: string };
  page?: number;
  pageSize?: number;
}

export interface SelloutMatrixValue extends SelloutPeriodKey {
  kg: number;
  sourceRowCount: number;
}

export interface SelloutMatrixEntity {
  id: string;
  level: SelloutMatrixLevel;
  chain: string;
  store: string | null;
  sku: string | null;
  brand: string | null;
  totalKg: number;
  rank: number;
  values: SelloutMatrixValue[];
}

export interface SelloutMatrix {
  level: SelloutMatrixLevel;
  entities: SelloutMatrixEntity[];
  pagination: {
    page: number;
    pageSize: number;
    totalEntities: number;
    totalPages: number;
  };
}

export interface SelloutStoreOptions {
  options: string[];
  pagination: {
    page: number;
    pageSize: number;
    totalStores: number;
    totalPages: number;
  };
}

export interface SelloutExportRow extends SelloutPeriodKey {
  chain: string;
  store: string;
  sku: string;
  brand: string;
  kg: number;
}

export interface SelloutExportData {
  rows: SelloutExportRow[];
  totalRows: number;
}

export interface SelloutApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { source: string; completeness: 'unknown' };
}
