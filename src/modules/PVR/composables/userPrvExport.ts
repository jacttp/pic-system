// src/modules/PVR/composables/usePvrExport.ts
import * as XLSX from 'xlsx';
import type { PvrCanalData, PvrCanal } from '../types/pvrTypes';
import { MONTH_LABELS } from '../utils/pvrFormatters';

// ─────────────────────────────────────────────
// TIPOS INTERNOS
// ─────────────────────────────────────────────

type RowType = 'kg' | 'currency' | 'price' | 'pct';

interface ExportRow {
   label: string;
   key: keyof PvrCanalData | '_spacer';
   type: RowType;
   spacer?: boolean;
   isSectionHeader?: boolean;
   isSubRow?: boolean;
}

// Misma definición que PvrReportTable — fuente de verdad compartida
const EXPORT_ROWS: ExportRow[] = [
   { label: 'Metas KG', key: 'metasKg', type: 'kg' },
   { label: 'Venta KG', key: 'ventaKg', type: 'kg' },
   { label: '  Degustación KG', key: 'degustacionKg', type: 'kg', isSubRow: true },
   { label: '', key: '_spacer', type: 'kg', spacer: true },
   { label: 'Facturación', key: 'facturacion', type: 'currency' },
   { label: 'Índice Precio Bruto x KG', key: 'indicePrecioBruto', type: 'price' },
   { label: '', key: '_spacer', type: 'kg', spacer: true },
   { label: 'VENTA BRUTA $$', key: 'ventaBruta', type: 'currency', isSectionHeader: true },
   { label: '', key: '_spacer', type: 'kg', spacer: true },
   { label: '  (A) Devoluciones', key: 'devoluciones', type: 'currency', isSubRow: true },
   { label: '  (B) Diferencia en Precios', key: 'diferenciaPrecios', type: 'currency', isSubRow: true },
   { label: '  (C) Total Promociones', key: 'totalPromociones', type: 'currency', isSubRow: true },
   { label: '  (D) Degustación $$', key: 'degustacionDol', type: 'currency', isSubRow: true },
   { label: '  (E) Cargos', key: 'cargos', type: 'currency', isSubRow: true },
   { label: '  (F) Bonificaciones Tradicional', key: 'bonificacionesTrad', type: 'currency', isSubRow: true },
   { label: '  (G) Rapel y Acuerdos Cadenas', key: 'rapelYAcuerdos', type: 'currency', isSubRow: true },
   { label: 'TOTAL (-) REBAJAS Y DESCUENTOS $$', key: 'totalRebajas', type: 'currency', isSectionHeader: true },
   { label: '', key: '_spacer', type: 'kg', spacer: true },
   { label: 'VENTA NETA $$', key: 'ventaNeta', type: 'currency', isSectionHeader: true },
   { label: '', key: '_spacer', type: 'kg', spacer: true },
   { label: 'Precio $$ x KG Neto', key: 'precioKgNeto', type: 'price' },
   { label: 'Inversión por KG', key: 'inversionKg', type: 'price' },
   { label: '% Rebajas vs Brutas', key: 'pctRebajasBrutas', type: 'pct' },
   { label: '% Rebajas vs Netas', key: 'pctRebajasNetas', type: 'pct' },
   { label: '', key: '_spacer', type: 'kg', spacer: true },
   { label: 'Subproductos', key: 'subproductos', type: 'currency' },
   { label: 'VENTA NETA + SUBPRODUCTOS', key: 'ventaNetaSubproductos', type: 'currency', isSectionHeader: true },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getRawValue(data: PvrCanalData, key: keyof PvrCanalData, monthIdx: number): number | null {
   const indicator = data[key];
   if (!indicator || typeof indicator !== 'object' || !('months' in indicator)) return null;
   return (indicator as { months: (number | null)[] }).months[monthIdx] ?? null;
}

function getRawTotal(data: PvrCanalData, key: keyof PvrCanalData): number | null {
   const indicator = data[key];
   if (!indicator || typeof indicator !== 'object' || !('total' in indicator)) return null;
   return (indicator as { total: number | null }).total;
}

/**
 * Formatea el valor RAW para la celda de Excel según tipo.
 * Los porcentajes se escriben como decimal (0.125) y se formatean con el formato de celda.
 */
function rawForExcel(v: number | null, type: RowType): number | string {
   if (v === null || v === undefined) return '';
   if (type === 'pct') return v; // decimal real, formato aplicado por SheetJS
   return v;
}

// ─────────────────────────────────────────────
// ESTILOS DE CELDA
// SheetJS Community no soporta estilos — usamos
// indentación de texto como alternativa visual.
// ─────────────────────────────────────────────

function buildSheetForCanal(
   canal: PvrCanal,
   data: PvrCanalData,
   activeMonthIndices: number[],
): XLSX.WorkSheet {

   const visibleMonths = activeMonthIndices.length > 0
      ? activeMonthIndices
      : Array.from({ length: 12 }, (_, i) => i);

   // ── Fila de encabezado ────────────────────
   const headerRow: (string | number)[] = [
      `Indicador (${canal})`,
      ...visibleMonths.map((i) => MONTH_LABELS[i] ?? ''),
      'Total',
   ];

   const sheetData: (string | number)[][] = [headerRow];

   // ── Filas de datos ────────────────────────
   for (const row of EXPORT_ROWS) {
      if (row.spacer) {
         sheetData.push(Array(headerRow.length).fill(''));
         continue;
      }

      const cells: (string | number)[] = [row.label];

      for (const monthIdx of visibleMonths) {
         const raw = getRawValue(data, row.key as keyof PvrCanalData, monthIdx);
         cells.push(rawForExcel(raw, row.type));
      }

      cells.push(rawForExcel(getRawTotal(data, row.key as keyof PvrCanalData), row.type));
      sheetData.push(cells);
   }

   const ws = XLSX.utils.aoa_to_sheet(sheetData);

   // ── Ancho de columnas ─────────────────────
   ws['!cols'] = [
      { wch: 38 }, // Indicador
      ...visibleMonths.map(() => ({ wch: 14 })), // meses
      { wch: 16 }, // Total
   ];

   // ── Formato numérico por columna (pct como %) ─
   // Iteramos las filas de datos para aplicar formato a celdas de tipo pct
   EXPORT_ROWS.forEach((row, rowOffset) => {
      if (row.spacer) return;
      // +1 por la fila header
      const excelRow = rowOffset + 2;
      if (row.type === 'pct') {
         // Aplicar formato % a todas las celdas de esa fila
         const totalCols = visibleMonths.length + 1;
         for (let col = 1; col <= totalCols; col++) {
            const cellAddr = XLSX.utils.encode_cell({ r: excelRow - 1, c: col });
            if (ws[cellAddr]) {
               ws[cellAddr].z = '0.0%';
            }
         }
      }
   });

   return ws;
}

// ─────────────────────────────────────────────
// COMPOSABLE PÚBLICO
// ─────────────────────────────────────────────

export function usePvrExport() {

   /**
    * Genera y descarga un archivo .xlsx con una hoja por canal.
    *
    * @param reportData  Datos completos del store { Moderno, Tradicional, Total }
    * @param activeMonthIndices  Índices (0-based) de los meses con datos
    * @param activeFilters  Texto descriptivo de los filtros para el nombre del archivo
    */
   function exportToExcel(
      reportData: Record<PvrCanal, PvrCanalData>,
      activeMonthIndices: number[],
      fileSuffix = '',
   ): void {
      const wb = XLSX.utils.book_new();

      const canales = Object.keys(reportData) as PvrCanal[];

      for (const canal of canales) {
         const ws = buildSheetForCanal(canal, reportData[canal]!, activeMonthIndices);
         // SheetJS limita nombres de hoja a 31 chars
         XLSX.utils.book_append_sheet(wb, ws, String(canal).substring(0, 31));
      }

      const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const filename = `InformePVR${fileSuffix ? `_${fileSuffix}` : ''}_${date}.xlsx`;

      XLSX.writeFile(wb, filename);
   }

   return { exportToExcel };
}