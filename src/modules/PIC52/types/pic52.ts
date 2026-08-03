export type Pic52DataState = 'observed' | 'missing';

export interface Pic52Filters {
  canales: string[];
  gerencias: string[];
  jefaturas: string[];
  rutas: string[];
  matrices: string[];
  formatos: string[];
  marcas: string[];
  gruposSku: string[];
  categorias: string[];
  gruposComercialesA: string[];
  gruposComercialesB: string[];
  skus: string[];
}

export type Pic52ProductDimension =
  | 'marcas'
  | 'gruposSku'
  | 'categorias'
  | 'gruposComercialesA'
  | 'gruposComercialesB'
  | 'skus';

export interface Pic52ReportRequest {
  years: number[];
  weeks: number[];
  transaction: string;
  transactions?: string[];
  trend?: {
    productDimension?: Pic52ProductDimension;
  };
  filters: Pic52Filters;
}

export interface Pic52TransactionOption {
  value: string;
  label: string;
  sourceTransactions: string[];
}

export interface Pic52Catalogs {
  years: number[];
  defaultReferenceYear: number;
  defaultYears: number[];
  transactions: Pic52TransactionOption[];
  weeksByYear: Record<string, number[]>;
  defaultWeeks: number[];
}

export interface Pic52ProductOptions {
  marcas: string[];
  gruposSku: string[];
  categorias: string[];
  gruposComercialesA: string[];
  gruposComercialesB: string[];
  skus: string[];
}

export interface Pic52UserContext {
  role: string;
  gerencia: string | null;
  jefatura: string | null;
}

export interface Pic52MatrixOption {
  matriz: string;
  clientCount: number;
}

export interface Pic52MatrixSearchResponse {
  success: boolean;
  data: Pic52MatrixOption[];
  message?: string;
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}

export interface Pic52Point {
  week: number;
  kg: number | null;
  pesos: number | null;
  dataState: Pic52DataState;
}

export interface Pic52YearSeries {
  year: number;
  points: Pic52Point[];
  totals: {
    kg: number | null;
    pesos: number | null;
    observedWeeks: number;
  };
}

export interface Pic52TrendPeriod {
  key: string;
  year: number;
  week: number;
  label: string;
}

export interface Pic52TrendPoint extends Pic52Point {
  year: number;
}

export interface Pic52TrendSeries {
  key: string;
  label: string;
  productValue: string | null;
  transaction: Pic52TransactionOption;
  points: Pic52TrendPoint[];
}

export interface Pic52TrendData {
  start: { year: number; week: number };
  end: { year: number; week: number };
  timeline: Pic52TrendPeriod[];
  transactions: Pic52TransactionOption[];
  productDimension: Pic52ProductDimension | null;
  productValues: string[];
  series: Pic52TrendSeries[];
}

export type Pic52TrendJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Pic52TrendJob {
  jobId: string;
  status: Pic52TrendJobStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  elapsedMs: number;
  cached: boolean;
  message: string | null;
  result?: Pic52TrendData;
}

export interface Pic52Report {
  referenceYear: number;
  years: number[];
  weeks: number[];
  transaction: Pic52TransactionOption;
  filters: Partial<Pic52Filters>;
  series: Pic52YearSeries[];
  generatedAt: string;
}

export interface Pic52ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    cached?: boolean;
    reused?: boolean;
  };
}
