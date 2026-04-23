// src/modules/CPFR/types/cpfrZ8Types.ts
// Tipos para el endpoint POST /api/cpfr/dash-orders/z8
// El response extiende CpfrDashResponse pero a nivel tienda expone ocs_z8
// en lugar de skus directos.

import type { CpfrStoreResumen, CpfrSkuDash } from './cpfrTypes'

// ─── SKU Z8 ──────────────────────────────────────────────────────────────────
// Mismo shape que CpfrSkuDash con campos adicionales informativos Z8.
// cant_pedida siempre 0 (no hay OC de cadena).

export interface CpfrSkuZ8 extends CpfrSkuDash {
    permiso_oc: string
    par_muliix: string | null
    mixbase: number | null
    mixpar: number | null
}

// ─── OC Z8 (agrupa SKUs del mismo permiso_oc) ────────────────────────────────

export interface CpfrOcZ8 {
    permiso_oc: string
    num_pedido: string
    estado_pedido: 'pendiente' | 'borrador' | 'revision' | 'aprobado' | 'enviado' | 'cerrado'
    resumen: CpfrStoreResumen
    total_skus: number
    skus: CpfrSkuZ8[]
}

// ─── Tienda Z8 ───────────────────────────────────────────────────────────────

export interface CpfrStoreDashZ8 {
    id_cliente: string
    nombre_tienda: string
    jefatura: string | null
    fec_envio: string | null
    dia_cadena: number
    dia_ventas: number
    lead_time: number
    factor_ajuste: number | null
    ocs_z8: CpfrOcZ8[]
}

// ─── Día Z8 ──────────────────────────────────────────────────────────────────

export interface CpfrDiaDashZ8 {
    dia_num: number
    dia_nombre: string
    tiendas: CpfrStoreDashZ8[]
}

// ─── Response completo Z8 ────────────────────────────────────────────────────

export interface CpfrZ8Context {
    year: number
    week: number
    semana_ic: string
    nom_cadena: string
    criterio_global: number | null
    total_tiendas: number
    total_skus_z8: number
}

export interface CpfrDashZ8Response {
    success: boolean
    context: CpfrZ8Context
    dias: CpfrDiaDashZ8[]
}