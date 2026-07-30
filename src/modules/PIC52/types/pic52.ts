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

export interface Pic52ReportRequest {
  years: number[];
  weeks: number[];
  transaction: string;
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

export interface Pic52Report {
  referenceYear: number;
  years: number[];
  weeks: number[];
  transaction: Pic52TransactionOption;
  filters: Pic52Filters;
  series: Pic52YearSeries[];
  generatedAt: string;
}

export interface Pic52ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    cached?: boolean;
  };
}
