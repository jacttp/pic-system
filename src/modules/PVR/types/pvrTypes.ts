// src/modules/PVR/types/pvrTypes.ts

export type MonthlyValues = (number | null)[];

export interface PvrIndicator {
   months: MonthlyValues;
   total: number | null;
}

/**
 * Datos de un canal (Moderno | Tradicional | Total).
 * Refleja exactamente los campos que devuelve pvrController.buildIndicators().
 */
export interface PvrCanalData {
   // ── Volumen KG ─────────────────────────────
   metasKg: PvrIndicator;
   ventaKg: PvrIndicator;
   degustacionKg: PvrIndicator;

   // ── Facturación ────────────────────────────
   facturacion: PvrIndicator;
   indicePrecioBruto: PvrIndicator;

   // ── Venta Bruta (derivada) ─────────────────
   ventaBruta: PvrIndicator;

   // ── Rebajas — partidas directas ────────────
   devoluciones: PvrIndicator;        // (A)
   diferenciaPrecios: PvrIndicator;   // (B)
   promModerno: PvrIndicator;         // (C) parte
   promTradicional: PvrIndicator;     // (C) parte
   totalPromociones: PvrIndicator;    // (C) subtotal
   degustacionDol: PvrIndicator;      // (D)
   cargos: PvrIndicator;              // (E)
   planesLealtad: PvrIndicator;       // (F) parte
   acuerdosTrad: PvrIndicator;        // (F) parte
   bonificacionesTrad: PvrIndicator;  // (F) subtotal
   acuerdosCadenas: PvrIndicator;     // (G) parte
   descuentoRapel: PvrIndicator;      // (G) parte
   rapelYAcuerdos: PvrIndicator;      // (G) subtotal
   totalRebajas: PvrIndicator;        // A+B+C+D+E+F+G

   // ── Venta Neta (directa de BD) ─────────────
   ventaNeta: PvrIndicator;

   // ── Ratios ─────────────────────────────────
   precioKgNeto: PvrIndicator;
   inversionKg: PvrIndicator;
   pctRebajasBrutas: PvrIndicator;
   pctRebajasNetas: PvrIndicator;

   // ── Subproductos ───────────────────────────
   subproductos: PvrIndicator;
   ventaNetaSubproductos: PvrIndicator;
}

export type PvrCanal = string; // 'Moderno' | 'Tradicional' | 'Total'

export interface PvrReportResponse {
   success: boolean;
   data: Record<PvrCanal, PvrCanalData>;
   meta: {
      canales: PvrCanal[];
      rowCount: number;
   };
}

/** Opciones disponibles para los filtros del módulo PVR */
export interface PvrFilterOptions {
   años: string[];      // de /pvr/filters (tabla InformePVR)
   canales: string[];   // de /filters/canales (catálogo, cacheado)
   gerencias: string[]; // de /filters/gerencias (catálogo, cacheado)
   cadenas: string[];   // de /filters/cadenas (catálogo, cacheado)
   meses: string[];     // estático 1-12
}

export interface PvrActiveFilters {
   años: string[];
   meses: string[];
   gerencias: string[];
   cadenas: string[];  // solo UI, NO se envía al endpoint de reporte
   canal: string;      // '' = todos
}