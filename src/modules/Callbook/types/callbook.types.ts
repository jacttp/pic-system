// src/modules/Callbook/types/callbook.types.ts

// ─── Requests ───────────────────────────────────────────────────────────────

export interface CallbookSummaryRequest {
    clientId: string
    year: string
    weeks?: string[]
}

export interface CallbookFilteredRequest {
    filters: CallbookFilters
    limit?: number
}

export interface CallbookOutOfStockRequest {
    clientId: string
    year: string
    week: string
}

export interface CallbookWoWRequest {
    clientId: string
    year: string
    currentWeek: string
    previousWeek: string
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface CallbookFilters {
    clientId?: string[]
    sku?: string[]
    year?: string[]
    week?: string[]
}

// ─── Records ─────────────────────────────────────────────────────────────────

export interface CallbookSummaryRecord {
    week: string
    clientId: string
    captureDate: string
    sku: string
    pieces: number
}

export interface CallbookRawRecord {
    callId: string
    clientId: string
    pieces: number
    captureDate: string
    sku: string
    week: string
    year: string
}

export interface CallbookWoWRecord {
    sku: string
    clientId: string
    currentPieces: number
    previousPieces: number
    variation: number
}

// ─── Responses ───────────────────────────────────────────────────────────────

export interface CallbookSummaryResponse {
    success: boolean
    count: number
    data: CallbookSummaryRecord[]
}

export interface CallbookFilteredResponse {
    success: boolean
    count: number
    limit: number
    data: CallbookRawRecord[]
}

export interface CallbookOutOfStockResponse {
    success: boolean
    count: number
    data: CallbookSummaryRecord[]
}

export interface CallbookWoWResponse {
    success: boolean
    count: number
    data: CallbookWoWRecord[]
}

// ─── Store State ──────────────────────────────────────────────────────────────

export interface CallbookStoreFilters {
    clientId: string
    year: string
    currentWeek: string
    previousWeek: string
    skus: string[]
}

// ─── Global Overview ──────────────────────────────────────────────────────

export interface CallbookGlobalOverviewRequest {
    anio: string
    semanas?: string[]
    matriz?: string        // drill-down por cliente específico
}

export interface CallbookGlobalOverviewRecord {
    SEMANAIC: string
    SKUREAL: string
    TotalPZ: number
    TiendasCapturadas: number
    TiendasEnQuiebre: number
}

export type CallbookGlobalOverviewResponse = CallbookGlobalOverviewRecord[]

// ─── Global Summary ───────────────────────────────────────────────────────

export interface CallbookGlobalSummaryRequest {
    anio: string
    semanas?: string[]
}

export interface CallbookGlobalSummaryRecord {
    SEMANAIC: string
    SKUREAL: string
    TotalPZ: number
    TiendasCapturadas: number
}

export type CallbookGlobalSummaryResponse = CallbookGlobalSummaryRecord[]

// ─── Global Out of Stock ──────────────────────────────────────────────────

export interface CallbookGlobalOutOfStockRequest {
    anio: string
    semana: string
}

export interface CallbookGlobalOutOfStockRecord {
    SKUREAL: string
    TiendasEnQuiebre: number
}

export interface CallbookGlobalOutOfStockResponse {
    success: boolean
    count: number
    data: CallbookGlobalOutOfStockRecord[]
}
// ─── Matrices Overview ────────────────────────────────────────────────────

export interface CallbookMatricesOverviewRequest {
    anio: string
    semanas?: string[]
}

export interface CallbookMatricesOverviewRecord {
    SEMANAIC: string
    Matriz: string
    TotalPZ_Tienda: number
    SKUsCapturados: number
    UltimaCaptura: string
}

export interface CallbookMatricesOverviewResponse {
    success: boolean
    count: number
    data: CallbookMatricesOverviewRecord[]
}