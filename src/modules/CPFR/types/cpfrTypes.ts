// src/modules/CPFR/types/cpfrTypes.ts

// ─── Dato base que devuelve el backend (o mock) ───────────────────────────────

export interface CpfrDataItem {
    id_cliente: string
    formatocte: string        // nombre de la tienda
    jefatura: string
    ruta: string
    dia: string               // Lunes, Martes... (mock por ahora)
    SKU_NOMBRE: string
    semana: number
    ano: number
    invActual: number         // VENTA_KG WHERE TRANSACCION = 'InvSis' última semana
    ventaPromSemanal: number  // AVG(VENTA_KG) WHERE TRANSACCION = 'VtaOut' N semanas
    pedidoCadena: number      // viene de otra tabla; mock = aleatorio
}

// ─── Dato calculado en frontend (composable useCpfrCalculations) ──────────────

export interface CpfrCalculatedRow extends CpfrDataItem {
    criterioAplicado: number   // storeCriteria ?? skuCriteria ?? 2.5
    semanasActuales: number    // invActual / ventaPromSemanal
    pedidoSugerido: number     // CEIL(criterio * ventaProm - inv), mín 0
    fillRate: number           // pedidoCadena / pedidoSugerido * 100
    estado: 'INSTOCK' | 'BAJO' | 'AGOTADO'
}

// ─── Agrupación por tienda para renderizado ───────────────────────────────────

export interface CpfrStoreGroup {
    id_cliente: string
    formatocte: string
    jefatura: string
    dia: string
    skus: CpfrCalculatedRow[]
    // macros calculados en el componente
    macro: CpfrStoreMacro
}

export interface CpfrStoreMacro {
    sumInv: number
    sumVentaProm: number
    sumSugerido: number
    sumCadena: number
    avgCriterio: number
    macroSemanas: number
    fillRate: number
    instockPct: number
    estado: 'INSTOCK' | 'BAJO' | 'AGOTADO'
}

// ─── Filtros ──────────────────────────────────────────────────────────────────

export interface CpfrFilterOptions {
    anos: number[]
    semanas: number[]
    jefaturas: string[]
    tiendas: { id: string; nombre: string }[]
    dias: string[]
}

export interface CpfrActiveFilters {
    ano: number | null
    semana: number | null
    jefatura: string        // '' = todas
    tienda: string          // '' = todas
    dia: string             // '' = todos
}