// src/modules/SellOut/types/sellout.types.ts

// ─── Filtros ────────────────────────────────────────────────────────────────

export interface SellOutFilters {
    año: string
    semana: string
    gerencia: string | null
    ruta: string | null
    sku: string | null
}

// Opciones disponibles para poblar los dropdowns
export interface SellOutFilterOptions {
    años: string[]
    semanas: SellOutWeek[]
    gerencias: string[]
    rutas: string[]
    skus: SellOutSku[]
}

export interface SellOutWeek {
    semana: string
    año: string
    label: string // "Semana 10 - 2025"
}

export interface SellOutSku {
    sku: string
    nombre: string
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

export interface SellOutKpis {
    // Sell Out
    ventaKg: number
    ventaMoney: number
    vsWeekKg: number        // variación % vs semana anterior
    vsWeekMoney: number

    // Inventario (invSis)
    inventarioKg: number

    // Cobertura (cruce con CALLBOOKIC)
    tiendasActivas: number     // tiendas con vtaOut > 0 (fuente: basev52PicSO)
    tiendasCapturadas: number  // tiendas con registro en callbook (fuente: CALLBOOKIC · PZ)
    coberturaPct: number    // % tiendas con PZ > 0
    quiebres: number        // tiendas con PZ = 0 en callbook

    // Ticket
    ticketPromedio: number  // VENTA_$$ / TRANSACCION count
}

// ─── Trend ───────────────────────────────────────────────────────────────────

export interface SellOutTrendPoint {
    semana: string
    año: string
    label: string           // "S10" — para eje X
    ventaKg: number
    ventaMoney: number
    inventarioKg: number
    pzPromedio: number      // PZ promedio de callbook esa semana
}

// ─── Response de la API ──────────────────────────────────────────────────────

export interface SellOutSummaryResponse {
    kpis: SellOutKpis
    trend: SellOutTrendPoint[]
}

export interface SellOutWeeksResponse {
    data: SellOutWeek[]
}