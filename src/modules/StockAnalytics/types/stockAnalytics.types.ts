// src/modules/StockAnalytics/types/stockAnalytics.types.ts

// ─── TRANSACCIÓN ────────────────────────────────────────────────────────────────

export type StockTransactionType = 'VtaOut' | 'InvSis';

// ─── FILTROS ─────────────────────────────────────────────────────────────────────

export interface StockFilters {
    id_cliente?: string[];
    formatocte?: string[];
    SKU_NOMBRE?: string[];
    Marca?: string[];
    Jefatura?: string[];
    Gerencia?: string[];
    Ruta?: string[];
    canal?: string[];
    GrupoSKU?: string[];
    Categorias?: string[];
    Semana?: number[];
}

/** Estado activo de filtros en el store + semana range */
export interface StockActiveFilters {
    year: number;
    startWeek: number;
    endWeek: number;
    filters: StockFilters;
}

/** Opción genérica para comboboxes */
export interface FilterOption {
    value: string;
    label: string;
}

/** Respuesta genérica de /api/filters/* (GET planos) */
export type FilterListResponse = string[];

// ─── ENDPOINT 1: SUMMARY ─────────────────────────────────────────────────────────

export interface WeeklySummaryRequest {
    transaction: StockTransactionType;
    year: number;
    filters?: StockFilters;
}

export interface WeeklySummaryRecord {
    id_cliente: string;
    formatoCte: string;
    SKU_NOMBRE: string;
    totalVolume: number;
    [week: string]: string | number;
}

export interface WeeklySummaryResponse {
    success: boolean;
    data: WeeklySummaryRecord[];
    message?: string;
}

// ─── ENDPOINT 2: AVERAGE ─────────────────────────────────────────────────────────

export interface AverageMetricRequest {
    transaction: StockTransactionType;
    year: number;
    startWeek: number;
    endWeek: number;
    filters?: StockFilters;
}

export interface AverageMetricRecord {
    id_cliente: string;
    formatoCte: string;
    SKU_NOMBRE: string;
    AverageKG: number;
    TotalKG: number;
    ActiveWeeks: number;
}

export interface AverageMetricResponse {
    success: boolean;
    data: AverageMetricRecord[];
    message?: string;
}

// ─── ENDPOINT 3: CURRENT INVENTORY ───────────────────────────────────────────────

export interface CurrentInventoryRequest {
    year: number;
    endWeek: number;
    filters?: StockFilters;
}

export interface CurrentInventoryRecord {
    id_cliente: string;
    formatoCte: string;
    SKU_NOMBRE: string;
    CurrentStockKG: number;
    LastActiveYear: number;
    LastActiveWeek: number;
}

export interface CurrentInventoryResponse {
    success: boolean;
    data: CurrentInventoryRecord[];
    message?: string;
}

// ─── ENDPOINT 4: COVERAGE ────────────────────────────────────────────────────────

export interface CoverageRequest {
    year: number;
    startWeek: number;
    endWeek: number;
    filters?: StockFilters;
}

export interface CoverageRecord {
    id_cliente: string;
    formatoCte: string;
    SKU_NOMBRE: string;
    CurrentStockKG: number;
    AverageSalesKG: number;
    /** 999 = inventario estancado (stock > 0 pero ventas = 0) */
    CoverageWeeks: number;
}

export interface CoverageResponse {
    success: boolean;
    data: CoverageRecord[];
    message?: string;
}

// ─── ENDPOINT 5: STOCKOUTS ───────────────────────────────────────────────────────

export interface StockoutsRequest {
    year: number;
    startWeek: number;
    endWeek: number;
    filters?: StockFilters;
}

export interface StockoutsRecord {
    id_cliente: string;
    formatoCte: string;
    SKU_NOMBRE: string;
    ActiveWeeks: number;
    ZeroSalesWeeks: number;
}

export interface StockoutsResponse {
    success: boolean;
    data: StockoutsRecord[];
    message?: string;
}