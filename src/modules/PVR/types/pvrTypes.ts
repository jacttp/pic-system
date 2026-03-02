// src/modules/PVR/types/pvrTypes.ts

// ─────────────────────────────────────────────
// PRIMITIVOS
// ─────────────────────────────────────────────

/** Array de 12 valores mensuales (null = sin dato para ese mes) */
export type MonthlyValues = (number | null)[];

/**
 * Estructura base de cualquier indicador del informe.
 * months[0] = Enero, months[11] = Diciembre.
 */
export interface PvrIndicator {
   months: MonthlyValues;
   total: number | null;
}

// ─────────────────────────────────────────────
// INDICADORES POR CANAL
// ─────────────────────────────────────────────

/** Desglose interno de promociones y acuerdos (filas expandibles en UI) */
export interface PvrBreakdown {
   promModerno: PvrIndicator;
   promTradicional: PvrIndicator;
   acuerdosCadenas: PvrIndicator;
   acuerdosTrad: PvrIndicator;
   descuentoRapel: PvrIndicator;
}

/**
 * Todos los indicadores calculados para un canal (Moderno, Tradicional o Total).
 * Refleja exactamente la respuesta del backend buildIndicators().
 */
export interface PvrCanalData {
   // ── Volumen KG ──────────────────────────────
   metasKg: PvrIndicator;
   ventaKg: PvrIndicator;
   degustacionKg: PvrIndicator;

   // ── Facturación ─────────────────────────────
   facturacion: PvrIndicator;
   indicePrecioBruto: PvrIndicator; // $/kg promedio bruto

   // ── Venta Bruta $$ ──────────────────────────
   ventaBruta: PvrIndicator;

   // ── Rebajas y Descuentos ────────────────────
   devoluciones: PvrIndicator;
   diferenciaPrecios: PvrIndicator;
   promociones: PvrIndicator; // agrupado: Moderno + Tradicional
   degustacionDol: PvrIndicator;
   cargos: PvrIndicator;
   planesLealtad: PvrIndicator;
   rapelYAcuerdos: PvrIndicator; // agrupado: Cadenas + Trad + Rapel
   totalRebajas: PvrIndicator;

   // ── Venta Neta $$ ───────────────────────────
   ventaNeta: PvrIndicator;

   // ── Precios y Ratios ────────────────────────
   precioKgNeto: PvrIndicator; // $/kg promedio neto
   inversionKg: PvrIndicator; // rebajas/kg
   pctRebajasBrutas: PvrIndicator; // rebajas / venta bruta
   pctRebajasNetas: PvrIndicator; // rebajas / venta neta
   pctCumplimientoKg: PvrIndicator; // venta kg / metas kg

   // ── Subproductos ────────────────────────────
   subproductos: PvrIndicator;

   // ── Desglose interno (expandible) ───────────
   _breakdown: PvrBreakdown;
}

// ─────────────────────────────────────────────
// RESPUESTA API
// ─────────────────────────────────────────────

export type PvrCanal = 'Moderno' | 'Tradicional' | 'Total' | string;

/** Respuesta completa de GET /api/pvr/report */
export interface PvrReportResponse {
   success: boolean;
   data: Record<PvrCanal, PvrCanalData>;
   meta: {
      canales: PvrCanal[];
      rowCount: number;
   };
}

/** Respuesta de GET /api/pvr/filters */
export interface PvrFiltersResponse {
   success: boolean;
   data: PvrFilterOptions;
}

// ─────────────────────────────────────────────
// FILTROS
// ─────────────────────────────────────────────

/** Opciones disponibles para poblar los selectores */
export interface PvrFilterOptions {
   años: string[];
   meses: string[];
   gerencias: string[];
   cadenas: string[];
   canales: string[];
}

/** Estado de los filtros activos en el store */
export interface PvrActiveFilters {
   años: string[];
   meses: string[];
   gerencias: string[];
   cadenas: string[];
   canal: PvrCanal | '';  // '' = todos los canales
}