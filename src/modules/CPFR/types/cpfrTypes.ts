// src/modules/CPFR/types/cpfrTypes.ts
// Shapes alineados con los nuevos endpoints de dash-orders

// ─── GET /cpfr/current-week ──────────────────────────────────────────────────

export interface CpfrCurrentWeek {
    anio: number
    semana: number
    semana_ic: string
}

// ─── POST /cpfr/dash-orders · POST /cpfr/dash-orders/recalculate ─────────────

export interface CpfrContext {
    year: number
    week: number
    semana_ic: string
    nom_cadena: string
    criterio_global: number
    total_tiendas: number
    total_skus: number
}

/** Fila de SKU dentro de una tienda (alineado con cpfrDashController.js v2) */
export interface CpfrSkuDash {
    // Identificación
    oc_id: number                       // PK de CPFR_OrdenCompra
    sku_muliix: string | null           // null si la OC no tiene homologación
    sku_nombre: string                  // nombre del SKU (o desc_art / sku_cadena como fallback)

    // Datos de la OC
    num_pedido: string | null
    sku_cadena: string | null           // identificador interno cadena (DESC_ART en Soriana)
    upc_cadena: string | null           // código EAN/UPC de la cadena
    cant_pedida: number                 // cantidad pedida por la cadena (antes pedido_cadena_pz)
    unidad_inventario: number
    pzas_bolsa: number
    uni_com: string | null
    cap_emp: number
    desc_art: string | null
    estado_oc: string | null
    fec_pedido_cadena: string | null
    fec_captura: string | null
    fec_fin_embarque: string | null

    // Inventario y sellout
    inv_actual_kg: number
    inv_actual_pz: number
    promedio_sellout_kg: number
    promedio_sellout_pz: number
    sellout_semanal_kg: number

    // Cálculo
    semanas_objetivo: number
    cobertura_actual: number | null
    pedido_sugerido_kg: number
    pedido_sugerido_pz_br: number
    pedido_sugerido_pz_red: number          // editable inline
    pedido_cadena_pz: number
    escenario: 'A' | 'B' | null
    demanda_requerida_kg: number | null

    // Indicadores
    instock: number | null          // null=sin dato, >=100 INSTOCK, >=50 BAJO, <50 CRÍTICO
    fill_rate: number | null
    enviado_pz: number | null
    factor_ajuste: number
    sellout_semanas?: Array<{ semana: number, kg: number }>
}

/** Resumen de nivel tienda (buildStoreResumen en controller) */
export interface CpfrStoreResumen {
    inv_actual_kg: number
    inv_actual_pz: number
    promedio_sellout_kg: number
    promedio_sellout_pz: number
    sellout_semanal_kg: number
    semanas_objetivo: number
    cobertura_actual: number | null
    lead_time: number
    factor_leadtime: number | null
    pedido_sugerido_kg: number
    pedido_sugerido_pz_br: number
    pedido_sugerido_pz_red: number
    cant_pedida_total: number           // suma de cant_pedida de los SKUs
    instock: number | null
    fill_rate: number | null
}

/** Tienda dentro de un día */
export interface CpfrStoreDash {
    id_cliente: string
    nombre_tienda: string
    jefatura: string
    fec_envio: string | null
    estado_pedido: 'pendiente' | 'procesado' | 'cerrado'
    resumen: CpfrStoreResumen
    total_skus: number
    skus: CpfrSkuDash[]
}

/** Grupo de día */
export interface CpfrDiaDash {
    dia_num: number
    dia_nombre: string
    tiendas: CpfrStoreDash[]
}

/** Response completo de dash-orders */
export interface CpfrDashResponse {
    success: boolean
    preview?: boolean
    context: CpfrContext
    dias: CpfrDiaDash[]
}

// ─── Filtros activos (modifican el body del POST) ────────────────────────────

export interface CpfrFilters {
    dia?: number            // 1–7
    jefatura?: string
    id_cliente?: string
    nombre_tienda?: string
    semanas_sellout?: number
}

// ─── Override de criterio por tienda (para /recalculate) ────────────────────

export interface CpfrOverride {
    id_cliente: string
    semanas_objetivo: number
}

// ─── PATCH /cpfr/order/:id ───────────────────────────────────────────────────

export interface CpfrAdjustSkuBody {
    cantidad_final_pz: number
    semanas_objetivo?: number
    enviado_pz?: number
    fill_rate?: number | null
    factor_ajuste?: number
}


// ─── PATCH /cpfr/orders/status ───────────────────────────────────────────────

export interface CpfrUpdateStatusBody {
    num_pedido: string
    year: number
    week: number
    estado: 'pendiente' | 'borrador' | 'revision' | 'aprobado' | 'procesado' | 'cerrado' | 'reemplazado' | 'enviado'
}

// ─── Config de tienda — GET|PUT /api/v2/cpfr/config/:id_cliente ─────────────
// (usado por CpfrStoreConfigModal)

export interface CpfrStoreConfig {
    id_cliente: string
    nombre_tienda?: string
    dia_cadena: number           // 1=Lun…7=Dom — día que cadena envía OC
    dia_ventas: number
    lead_time: number
    semanas_objetivo: number
    semanas_sellout: number
    factor_ajuste?: number       // SOLO LECTURA
}

// ─── SKU Overrides — GET /api/v2/cpfr/config/:id_cliente/skus ───────────────

export interface CpfrSkuOverride {
    sku_muliix: string
    sku_nombre?: string
    semanas_objetivo: number
}

// ─── SKU Unit Config — GET|PATCH /api/cpfr/units ────────────────────────────
// Unidades de conversión de un SKU en skus_IC

export interface CpfrSkuUnit {
    sku_muliix: string
    sku_nombre: string
    unidad_inventario: number | null
    pzas_caja: number | null
    kg_caja: number | null
    cajas_pallet: number | null
    pzas_pallet: number | null
    pzas_bolsa: number | null
    unidad_ventau: number | null
}

export type CpfrSkuUnitPayload = Omit<CpfrSkuUnit, 'sku_muliix' | 'sku_nombre'>

// ─── Upload OC — POST /cpfr/upload-oc ────────────────────────────────────────
// (usado por CpfrUploadModal)

export interface CpfrUploadOCResponse {
    success: boolean
    id_cliente: string
    num_tienda: string
    num_pedido: string
    fec_pedido_cadena: string
    nom_cadena: string
    inserted: number
    skipped: number
    skipped_detail: Array<{ row: number; sku_cadena?: string; reason: string }>
}