<!-- src/modules/PVR/components/PvrReportTable.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PvrCanalData } from '../types/pvrTypes';
import { fmtCurrency, fmtKg, fmtPrice, fmtPct, MONTH_LABELS } from '../utils/pvrFormatters';

// ─────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────

interface Props {
  moderno?:     PvrCanalData | null;
  tradicional?: PvrCanalData | null;
  total?:       PvrCanalData | null;
}

const props = defineProps<Props>();

// ─────────────────────────────────────────────
// TIPOS DE FILA
// ─────────────────────────────────────────────

type RowType  = 'kg' | 'currency' | 'price' | 'pct';
type RowStyle = 'normal' | 'sub' | 'subtotal' | 'grand-total' | 'ratio';

interface TableRow {
  label:              string;
  key:                keyof PvrCanalData | null;
  source:             'moderno' | 'tradicional' | 'total' | 'both';
  type:               RowType;
  style:              RowStyle;
  tooltip?:           string;
  indent?:            boolean;
  negativeIsNormal?:  boolean;
}

// ─────────────────────────────────────────────
// DEFINICIÓN DE SECCIONES + FILAS
// ─────────────────────────────────────────────

interface Section {
  id:       string;
  label:    string;
  icon:     string;
  /** Clases Tailwind para el header de la sección */
  headerBg: string;
  rows:     TableRow[];
}

const SECTIONS: Section[] = [
  // ─────────────────────────────────────────────
  {
    id: 'volumen', label: 'Volumen KG', icon: 'fa-solid fa-weight-hanging',
    headerBg: 'bg-slate-700',
    rows: [
      { label: 'Metas KG',      key: 'metasKg',      source: 'moderno',     type: 'kg', style: 'normal' },
      { label: 'Metas KG',      key: 'metasKg',      source: 'tradicional', type: 'kg', style: 'normal' },
      { label: 'TOTAL Metas KG',key: 'metasKg',      source: 'total',       type: 'kg', style: 'subtotal', tooltip: 'Suma Metas Moderno + Tradicional' },
      { label: 'Venta KG',      key: 'ventaKg',      source: 'moderno',     type: 'kg', style: 'normal' },
      { label: 'Venta KG',      key: 'ventaKg',      source: 'tradicional', type: 'kg', style: 'normal' },
      { label: 'TOTAL Venta KG',key: 'ventaKg',      source: 'total',       type: 'kg', style: 'subtotal', tooltip: 'Suma Venta KG Moderno + Tradicional' },
      { label: 'Degustación KG',key: 'degustacionKg', source: 'moderno',    type: 'kg', style: 'normal' },
      { label: 'Degustación KG',key: 'degustacionKg', source: 'tradicional',type: 'kg', style: 'normal' },
      { label: 'TOTAL Degust. KG',key:'degustacionKg',source: 'total',      type: 'kg', style: 'subtotal' },
    ],
  },

  // ─────────────────────────────────────────────
  {
    id: 'facturacion', label: 'Facturación y Venta Bruta', icon: 'fa-solid fa-file-invoice-dollar',
    headerBg: 'bg-blue-800',
    rows: [
      { label: 'Facturación $$',       key: 'facturacion',      source: 'moderno',     type: 'currency', style: 'normal' },
      { label: 'Facturación $$',       key: 'facturacion',      source: 'tradicional', type: 'currency', style: 'normal' },
      { label: 'TOTAL Facturación $$', key: 'facturacion',      source: 'total',       type: 'currency', style: 'subtotal' },
      { label: 'Índice Precio Bruto x KG', key: 'indicePrecioBruto', source: 'total', type: 'price', style: 'ratio',
        tooltip: 'Venta Bruta ÷ Venta KG' },
      { label: 'Venta Bruta',          key: 'ventaBruta',       source: 'moderno',     type: 'currency', style: 'normal' },
      { label: 'Venta Bruta',          key: 'ventaBruta',       source: 'tradicional', type: 'currency', style: 'normal' },
      { label: 'VENTA BRUTA $$',       key: 'ventaBruta',       source: 'total',       type: 'currency', style: 'grand-total',
        tooltip: 'Venta Neta - Total Rebajas (rebajas en BD son negativas; restar = sumar su valor absoluto)' },
    ],
  },

  // ─────────────────────────────────────────────
  {
    id: 'rebajas', label: 'Rebajas y Descuentos', icon: 'fa-solid fa-tags',
    headerBg: 'bg-red-800',
    rows: [
      // (A)
      { label: '(A) Devoluciones',     key: 'devoluciones',      source: 'moderno',     type: 'currency', style: 'normal', negativeIsNormal: true },
      { label: '(A) Devoluciones',     key: 'devoluciones',      source: 'tradicional', type: 'currency', style: 'normal', negativeIsNormal: true },
      { label: '(A) DEVOLUCIONES',     key: 'devoluciones',      source: 'total',       type: 'currency', style: 'subtotal', negativeIsNormal: true },
      // (B)
      { label: '(B) Dif. en Precios',  key: 'diferenciaPrecios', source: 'moderno',     type: 'currency', style: 'normal', indent: true, negativeIsNormal: true },
      { label: '(B) Dif. en Precios',  key: 'diferenciaPrecios', source: 'tradicional', type: 'currency', style: 'normal', indent: true, negativeIsNormal: true },
      { label: '(B) DIF. EN PRECIOS',  key: 'diferenciaPrecios', source: 'total',       type: 'currency', style: 'subtotal', negativeIsNormal: true },
      // (C) Promociones
      { label: '(C) Prom. Moderno',    key: 'promModerno',       source: 'moderno',     type: 'currency', style: 'normal', indent: true, negativeIsNormal: true },
      { label: '(C) Prom. Tradicional',key: 'promTradicional',   source: 'tradicional', type: 'currency', style: 'normal', indent: true, negativeIsNormal: true },
      { label: '(C) TOTAL PROMOCIONES',key: 'totalPromociones',  source: 'total',       type: 'currency', style: 'subtotal', negativeIsNormal: true,
        tooltip: 'Suma de Promociones Moderno + Promociones Tradicional' },
      // (D)
      { label: '(D) Degustación $$',   key: 'degustacionDol',    source: 'moderno',     type: 'currency', style: 'normal', negativeIsNormal: true },
      { label: '(D) Degustación $$',   key: 'degustacionDol',    source: 'tradicional', type: 'currency', style: 'normal', negativeIsNormal: true },
      { label: '(D) DEGUSTACIÓN $$',   key: 'degustacionDol',    source: 'total',       type: 'currency', style: 'subtotal', negativeIsNormal: true },
      // (E)
      { label: '(E) Cargos',           key: 'cargos',            source: 'moderno',     type: 'currency', style: 'normal', negativeIsNormal: true },
      { label: '(E) Cargos',           key: 'cargos',            source: 'tradicional', type: 'currency', style: 'normal', negativeIsNormal: true },
      { label: '(E) CARGOS',           key: 'cargos',            source: 'total',       type: 'currency', style: 'subtotal', negativeIsNormal: true },
      // (F) Bonificaciones Tradicional
      { label: 'Planes Lealtad',       key: 'planesLealtad',     source: 'moderno',     type: 'currency', style: 'normal', indent: true, negativeIsNormal: true },
      { label: 'Planes Lealtad',       key: 'planesLealtad',     source: 'tradicional', type: 'currency', style: 'normal', indent: true, negativeIsNormal: true },
      { label: 'Acuerdos Tradicional', key: 'acuerdosTrad',      source: 'moderno',     type: 'currency', style: 'normal', indent: true, negativeIsNormal: true },
      { label: 'Acuerdos Tradicional', key: 'acuerdosTrad',      source: 'tradicional', type: 'currency', style: 'normal', indent: true, negativeIsNormal: true },
      { label: '(F) BONIF. TRADICIONAL',key:'bonificacionesTrad',source: 'total',       type: 'currency', style: 'subtotal', negativeIsNormal: true,
        tooltip: 'Planes Lealtad + Acuerdos Tradicional' },
      // (G) Rapel y Acuerdos Cadenas
      { label: 'Acuerdos Cadenas',     key: 'acuerdosCadenas',   source: 'moderno',     type: 'currency', style: 'normal', indent: true, negativeIsNormal: true },
      { label: 'Acuerdos Cadenas',     key: 'acuerdosCadenas',   source: 'tradicional', type: 'currency', style: 'normal', indent: true, negativeIsNormal: true },
      { label: 'Descuento Rapel',      key: 'descuentoRapel',    source: 'moderno',     type: 'currency', style: 'normal', indent: true, negativeIsNormal: true },
      { label: 'Descuento Rapel',      key: 'descuentoRapel',    source: 'tradicional', type: 'currency', style: 'normal', indent: true, negativeIsNormal: true },
      { label: '(G) RAPEL Y ACUERDOS', key: 'rapelYAcuerdos',   source: 'total',       type: 'currency', style: 'subtotal', negativeIsNormal: true,
        tooltip: 'Acuerdos Cadenas + Descuentos Rapel' },
      // Total Rebajas
      { label: 'Moderno',              key: 'totalRebajas',      source: 'moderno',     type: 'currency', style: 'normal', negativeIsNormal: true },
      { label: 'Tradicional',          key: 'totalRebajas',      source: 'tradicional', type: 'currency', style: 'normal', negativeIsNormal: true },
      { label: 'TOTAL REBAJAS (A+B+C+D+E+F+G)', key: 'totalRebajas', source: 'total', type: 'currency', style: 'grand-total', negativeIsNormal: true,
        tooltip: 'Suma de todas las partidas de descuento' },
    ],
  },

  // ─────────────────────────────────────────────
  {
    id: 'ventaneta', label: 'Venta Neta', icon: 'fa-solid fa-sack-dollar',
    headerBg: 'bg-brand-700',
    rows: [
      { label: 'Venta Neta $$',         key: 'ventaNeta',   source: 'moderno',     type: 'currency', style: 'normal' },
      { label: 'Venta Neta $$',         key: 'ventaNeta',   source: 'tradicional', type: 'currency', style: 'normal' },
      { label: 'VENTA NETA $$ MARCAS',  key: 'ventaNeta',   source: 'total',       type: 'currency', style: 'grand-total',
        tooltip: 'Suma directa de BD — transacción Venta Neta' },
    ],
  },

  // ─────────────────────────────────────────────
  {
    id: 'ratios', label: 'Ratios y KPIs', icon: 'fa-solid fa-percent',
    headerBg: 'bg-slate-600',
    rows: [
      { label: 'Precio $$ x KG Neto',      key: 'precioKgNeto',     source: 'total', type: 'price', style: 'ratio',
        tooltip: 'Venta Neta ÷ Venta KG' },
      { label: 'Inversión por KG',          key: 'inversionKg',      source: 'moderno',     type: 'price', style: 'normal', negativeIsNormal: true },
      { label: 'Inversión por KG',          key: 'inversionKg',      source: 'tradicional', type: 'price', style: 'normal', negativeIsNormal: true },
      { label: 'INVERSIÓN POR KG',          key: 'inversionKg',      source: 'total',       type: 'price', style: 'subtotal', negativeIsNormal: true,
        tooltip: '(Total Rebajas ÷ Venta KG) × −1' },
      { label: '% Rebajas vs Brutas',       key: 'pctRebajasBrutas', source: 'total', type: 'pct',   style: 'ratio', negativeIsNormal: true,
        tooltip: 'Total Rebajas ÷ Venta Bruta' },
      { label: '% Rebajas vs Netas',        key: 'pctRebajasNetas',  source: 'total', type: 'pct',   style: 'ratio', negativeIsNormal: true,
        tooltip: 'Total Rebajas ÷ Venta Neta' },
    ],
  },

  // ─────────────────────────────────────────────
  {
    id: 'subproductos', label: 'Subproductos', icon: 'fa-solid fa-boxes-stacked',
    headerBg: 'bg-emerald-700',
    rows: [
      { label: 'Subproductos',             key: 'subproductos',          source: 'moderno',     type: 'currency', style: 'normal' },
      { label: 'Subproductos',             key: 'subproductos',          source: 'tradicional', type: 'currency', style: 'normal' },
      { label: 'VENTA NETA SUBPRODUCTOS',  key: 'subproductos',          source: 'total',       type: 'currency', style: 'subtotal' },
      { label: 'VENTA NETA + SUBPRODUCTOS',key: 'ventaNetaSubproductos', source: 'total',       type: 'currency', style: 'grand-total',
        tooltip: 'Venta Neta Marcas + Venta Subproductos' },
    ],
  },
];

// ─────────────────────────────────────────────
// ESTADO COLAPSABLE
// ─────────────────────────────────────────────

const collapsedSections = ref<Record<string, boolean>>({
  volumen:       false,
  facturacion:   false,
  rebajas:       false,
  ventaneta:     false,
  ratios:        false,
  subproductos:  false,
});

function toggleSection(id: string): void {
  collapsedSections.value[id] = !collapsedSections.value[id];
}

function collapseAll(): void {
  for (const key of Object.keys(collapsedSections.value)) {
    collapsedSections.value[key] = true;
  }
}
function expandAll(): void {
  for (const key of Object.keys(collapsedSections.value)) {
    collapsedSections.value[key] = false;
  }
}

// ─────────────────────────────────────────────
// ACCESO A DATOS
// ─────────────────────────────────────────────

function getSource(source: TableRow['source']): PvrCanalData | null | undefined {
  if (source === 'moderno')     return props.moderno;
  if (source === 'tradicional') return props.tradicional;
  return props.total;
}

function getVal(row: TableRow, monthIdx: number): number | null {
  const src = getSource(row.source);
  if (!src || !row.key) return null;
  const ind = src[row.key];
  if (!ind || typeof ind !== 'object' || !('months' in ind)) return null;
  return (ind as { months: (number | null)[] }).months[monthIdx] ?? null;
}

function getTotal(row: TableRow): number | null {
  const src = getSource(row.source);
  if (!src || !row.key) return null;
  const ind = src[row.key];
  if (!ind || typeof ind !== 'object' || !('total' in ind)) return null;
  return (ind as { total: number | null }).total;
}

// ─────────────────────────────────────────────
// MESES VISIBLES
// ─────────────────────────────────────────────

const visibleMonths = computed<number[]>(() => {
  const src = props.total ?? props.moderno ?? props.tradicional;
  if (!src) return MONTH_LABELS.map((_, i) => i);
  const ventaKg = src.ventaKg?.months ?? [];
  const active = ventaKg
    .map((v, i) => ({ i, hasData: v !== null && v !== 0 }))
    .filter((x) => x.hasData)
    .map((x) => x.i);
  return active.length > 0 ? active : MONTH_LABELS.map((_, i) => i);
});

// ─────────────────────────────────────────────
// RESPONSIVE / MESES OCULTOS
// ─────────────────────────────────────────────

const tableContainer = ref<HTMLElement | null>(null);
const containerWidth = ref(1000);
let resizeObserver: ResizeObserver | null = null;

import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  if (tableContainer.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width;
      }
    });
    resizeObserver.observe(tableContainer.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
});

const maxCols = computed(() => {
  // Concepto (210) + Canal (90) + Toggle (40) + Acumulado (100) = ~440px + Padding buffer = 480px
  const available = containerWidth.value - 480;
  let cols = Math.floor(available / 95); // 95px por mes aprox
  if (cols < 1) cols = 1;
  return cols;
});

const displayedMonths = computed(() => {
  if (visibleMonths.value.length <= maxCols.value) return visibleMonths.value;
  return visibleMonths.value.slice(-maxCols.value);
});

const hiddenMonths = computed(() => {
  if (visibleMonths.value.length <= maxCols.value) return [];
  return visibleMonths.value.slice(0, visibleMonths.value.length - maxCols.value);
});

const expandedRows = ref<string[]>([]);
function toggleRowExpand(id: string) {
  const idx = expandedRows.value.indexOf(id);
  if (idx > -1) expandedRows.value.splice(idx, 1);
  else expandedRows.value.push(id);
}

// ─────────────────────────────────────────────
// FORMATEO
// ─────────────────────────────────────────────

function fmt(value: number | null, type: RowType): string {
  if (value === null || value === undefined) return '—';
  switch (type) {
    case 'kg':       return fmtKg(value);
    case 'price':    return fmtPrice(value);
    case 'pct':      return fmtPct(value);
    case 'currency':
    default:         return fmtCurrency(value);
  }
}

function valColor(value: number | null, negativeIsNormal = false): string {
  if (value === null) return 'text-slate-400';
  if (negativeIsNormal) {
    return value > 0 ? 'text-red-600 font-semibold' : 'text-slate-700';
  }
  if (value > 0) return 'text-slate-700';
  if (value < 0) return 'text-red-600';
  return 'text-slate-400';
}

function canalLabel(source: TableRow['source']): string {
  if (source === 'moderno')     return 'Moderno';
  if (source === 'tradicional') return 'Tradicional';
  return '';
}

function rowBg(style: RowStyle): string {
  switch (style) {
    case 'subtotal':    return 'bg-yellow-50';
    case 'grand-total': return 'bg-amber-100';
    case 'ratio':       return 'bg-slate-50';
    default:            return 'bg-white';
  }
}
function rowHover(style: RowStyle): string {
  switch (style) {
    case 'subtotal':    return 'hover:bg-yellow-100';
    case 'grand-total': return 'hover:bg-amber-200';
    case 'ratio':       return 'hover:bg-slate-100';
    default:            return 'hover:bg-brand-50/30';
  }
}
function labelBold(style: RowStyle): boolean {
  return style === 'subtotal' || style === 'grand-total';
}

// Tooltip
const activeTooltip = ref<string | null>(null);
const tooltipPos = ref<[number, number]>([0, 0]);

function openTooltip(id: string, e: MouseEvent) {
  activeTooltip.value = id;
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  tooltipPos.value = [rect.right + 8, rect.top + (rect.height / 2)];
}

// ─────────────────────────────────────────────
// VISTA DE REBAJAS (%)
// ─────────────────────────────────────────────
const rebajasViewMode = ref<'currency'|'brutas'|'netas'|'rebajas'>('currency');

function applyRebajasFormatting(row: TableRow, value: number, monthIdx: number | null): string {
  const inRebajas = SECTIONS.find(s => s.id === 'rebajas')?.rows.includes(row as any);
  if (inRebajas && rebajasViewMode.value !== 'currency' && row.type === 'currency') {
    let denominatorKey: 'ventaBruta' | 'ventaNeta' | 'totalRebajas' = 'ventaBruta';
    if (rebajasViewMode.value === 'netas') denominatorKey = 'ventaNeta';
    if (rebajasViewMode.value === 'rebajas') denominatorKey = 'totalRebajas';

    const src = getSource(row.source);
    if (!src) return '—';
    const denData = src[denominatorKey] as { total: number; months: (number | null)[] };
    const denValue = monthIdx === null ? denData?.total : denData?.months[monthIdx];
    
    if (!denValue) return fmtPct(0);
    // Las rebajas son negativas en BD. Si el usuario selecciona '% s/ Rebajas', el denData es totalRebajas (negativo). 
    // Usar Math.abs(denValue) mantiene el signo aritmético correcto para la subpartida.
    const pct = value / Math.abs(denValue);
    return fmtPct(pct);
  }
  return fmt(value, row.type);
}

function getFmt(row: TableRow, monthIdx: number): string {
  const rawValue = getVal(row, monthIdx);
  if (rawValue === null || rawValue === undefined) return '—';
  return applyRebajasFormatting(row, rawValue, monthIdx);
}

function getFmtTotal(row: TableRow): string {
  const rawValue = getTotal(row);
  if (rawValue === null || rawValue === undefined) return '—';
  return applyRebajasFormatting(row, rawValue, null);
}
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

    <!-- ── Header ─────────────────────────────── -->
    <div class="px-4 py-3 bg-slate-800 flex items-center gap-3 flex-wrap">
      <i class="fa-solid fa-table-cells-large text-brand-400 text-sm"></i>
      <span class="text-sm font-bold text-white">Informe PVR</span>
      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-slate-300 border border-white/10">
        Moderno · Tradicional · Total
      </span>
      <span class="text-[10px] text-slate-400 font-mono ml-1">
        {{ visibleMonths.length }} mes{{ visibleMonths.length !== 1 ? 'es' : '' }} con datos
      </span>
      <!-- Controles expandir/colapsar todo -->
      <div class="ml-auto flex gap-2">
        <button
          type="button"
          @click="expandAll"
          class="text-[10px] text-slate-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
        >
          <i class="fa-solid fa-expand mr-1"></i>Expandir todo
        </button>
        <button
          type="button"
          @click="collapseAll"
          class="text-[10px] text-slate-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
        >
          <i class="fa-solid fa-compress mr-1"></i>Colapsar todo
        </button>
      </div>
    </div>

    <!-- ── Tabla ──────────────────────────────── -->
    <div ref="tableContainer" class="overflow-x-auto custom-scrollbar pb-2 relative z-0 w-full">
      <table class="w-full text-xs border-collapse min-w-full">

        <!-- THEAD -->
        <thead>
          <tr class="bg-slate-100 text-slate-600">
            <th class="sticky top-0 left-0 z-30 bg-slate-100 text-left px-3 py-2 font-semibold border-r border-b border-slate-200"
                style="min-width: 210px; width: 210px;">
              Concepto
            </th>
            <th class="sticky top-0 bg-slate-100 text-left px-3 py-2 font-semibold border-r border-b border-slate-200"
                style="left: 210px; z-index: 30; min-width: 90px; width: 90px;">
              Canal
            </th>
            
            <!-- Toggler header -->
            <th v-if="hiddenMonths.length > 0" class="sticky top-0 text-center px-1.5 py-2 font-semibold border-r border-b border-slate-200 bg-slate-100"
                style="left: 300px; z-index: 30; width: 40px; min-width: 40px;">
              <i class="fa-solid fa-ellipsis text-slate-400"></i>
            </th>

            <th
              v-for="i in displayedMonths"
              :key="i"
              class="sticky top-0 z-20 px-3 py-2 text-right font-semibold border-r border-b border-slate-200 tabular-nums bg-slate-100"
              style="min-width: 88px;"
            >
              {{ MONTH_LABELS[i] }}
            </th>
            <th class="sticky top-0 z-20 px-3 py-2 text-right font-bold bg-slate-200 border-b border-slate-300 tabular-nums"
                style="min-width: 100px;">
              Acumulado
            </th>
          </tr>
        </thead>

        <!-- TBODY — iteramos por secciones -->
        <tbody>
          <template v-for="section in SECTIONS" :key="section.id">

            <!-- Header de sección (colapsable) -->
            <tr
              class="cursor-pointer select-none transition-opacity"
              :class="section.headerBg"
              @click="toggleSection(section.id)"
            >
              <td
                :colspan="displayedMonths.length + (hiddenMonths.length > 0 ? 4 : 3)"
                class="sticky left-0 z-30 px-3 py-2.5 text-white font-bold text-[11px] uppercase tracking-widest border-b border-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                :class="section.headerBg"
              >
                <div class="flex items-center gap-2">
                  <i :class="section.icon" class="text-white/70 text-xs"></i>
                  {{ section.label }}

                  <!-- Tooltip informativo switch junto al título -->
                  <div v-if="section.id === 'rebajas'" class="relative group/switch-info flex items-center shrink-0 ml-1" @click.stop>
                    <button type="button" class="text-white/60 hover:text-white transition-colors mt-0.5">
                      <i class="fa-solid fa-circle-question text-[11px]"></i>
                    </button>
                    <div class="absolute top-full left-0 mt-2 w-64 bg-slate-800 text-white text-[11px] leading-relaxed p-3 rounded-lg shadow-xl opacity-0 invisible group-hover/switch-info:opacity-100 group-hover/switch-info:visible transition-all z-50">
                      <p class="font-bold mb-1 border-b border-white/10 pb-1 normal-case text-left">Opciones de vista:</p>
                      <ul class="space-y-1 text-slate-300 normal-case text-left tracking-normal font-normal">
                        <li><strong class="text-white">$$</strong>: Cantidades monetarias normales.</li>
                        <li><strong class="text-white">% s/ Brutas</strong>: % que representa sobre la Venta Bruta.</li>
                        <li><strong class="text-white">% s/ Netas</strong>: % que representa sobre la Venta Neta.</li>
                        <li><strong class="text-white">% s/ Rebajas</strong>: % de cada partida respecto al Total de Rebajas.</li>
                      </ul>
                      <div class="absolute bottom-full left-2 -mb-1 border-4 border-transparent border-b-slate-800"></div>
                    </div>
                  </div>

                  <!-- Contenedor derecho: Switch Rebajas + Caret -->
                  <div class="ml-auto flex items-center gap-3">
                    <div
                      v-if="section.id === 'rebajas'"
                      class="flex items-center gap-2"
                      @click.stop
                    >
                      <!-- Control segmentado (Switch) -->
                      <div class="flex items-center bg-white/10 rounded-md border border-white/20 p-0.5 shadow-inner">
                        <button
                          v-for="mode in [
                            { val: 'currency', label: '$$' },
                            { val: 'brutas', label: '% s/ Brutas' },
                            { val: 'netas', label: '% s/ Netas' },
                            { val: 'rebajas', label: '% s/ Rebajas' }
                          ]"
                          :key="mode.val"
                          type="button"
                          class="px-2.5 py-1 text-[10px] font-bold tracking-wide rounded transition-all duration-200"
                          :class="rebajasViewMode === mode.val ? 'bg-white text-red-800 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'"
                          @click="rebajasViewMode = mode.val as any"
                        >
                          {{ mode.label }}
                        </button>
                      </div>
                    </div>

                    <i
                      class="fa-solid mr-2 text-white/50 text-xs transition-transform duration-200"
                      :class="collapsedSections[section.id] ? 'fa-chevron-down' : 'fa-chevron-up'"
                    ></i>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Filas de la sección (se ocultan si colapsada) -->
            <template v-if="!collapsedSections[section.id]">
              <template v-for="(row, rowIdx) in section.rows" :key="`${section.id}-${rowIdx}`">
                <tr
                  class="border-b border-slate-100 transition-colors cursor-pointer group"
                  :class="[rowBg(row.style), rowHover(row.style)]"
                  @click="$emit('row-click', { 
                    label: row.label, 
                    key: row.key, 
                    type: section.id === 'rebajas' && rebajasViewMode !== 'currency' ? 'pct' : row.type,
                    sectionId: section.id,
                    rebajasMode: section.id === 'rebajas' ? rebajasViewMode : undefined 
                  })"
                >
                  <!-- Concepto (label) -->
                  <td
                    class="sticky left-0 z-10 px-3 py-1.5 border-r border-slate-200 whitespace-nowrap"
                    :class="[
                      rowBg(row.style),
                      labelBold(row.style) ? 'font-bold text-slate-800' : 'font-normal text-slate-600',
                      row.indent ? 'pl-7' : '',
                    ]"
                  >
                    <div class="flex items-center gap-1 relative">
                      <span v-if="row.indent" class="text-slate-300 mr-0.5">└</span>
                      <span class="group-hover:text-brand-600 transition-colors">{{ row.label }}</span>

                      <!-- Tooltip trigger -->
                      <button
                        v-if="row.tooltip"
                        type="button"
                        class="text-slate-300 hover:text-brand-400 transition-colors shrink-0 ml-0.5 relative z-50"
                        @mouseenter.stop="openTooltip(`${section.id}-${rowIdx}`, $event)"
                        @mouseleave.stop="activeTooltip = null"
                        @click.stop
                      >
                        <i class="fa-solid fa-circle-info text-[9px]"></i>
                      </button>

                      <!-- Tooltip (Position fixed to break out of all contexts) -->
                      <Teleport to="body">
                        <Transition name="tooltip">
                          <div
                            v-if="activeTooltip === `${section.id}-${rowIdx}` && tooltipPos[0] !== 0"
                            class="fixed z-[9999] bg-slate-800 text-white text-[11px] leading-relaxed px-3 py-2 rounded-lg shadow-xl pointer-events-none w-56 transform -translate-y-1/2 ml-2"
                            :style="{ top: tooltipPos[1] + 'px', left: tooltipPos[0] + 'px' }"
                          >
                            {{ row.tooltip }}
                            <div class="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></div>
                          </div>
                        </Transition>
                      </Teleport>
                    </div>
                  </td>

                  <!-- Canal -->
                  <td
                    class="sticky px-3 py-1.5 border-r border-slate-200 whitespace-nowrap text-[11px]"
                    :style="{ left: '210px', zIndex: 10 }"
                    :class="[
                      rowBg(row.style),
                      row.style === 'normal'
                        ? (row.source === 'moderno' ? 'text-blue-500 font-medium' : 'text-emerald-600 font-medium')
                        : 'font-bold text-slate-600',
                    ]"
                  >
                    {{ canalLabel(row.source) }}
                  </td>

                  <!-- Toggler column -->
                  <td v-if="hiddenMonths.length > 0" 
                      class="sticky px-1.5 py-1.5 border-r border-slate-200 text-center" 
                      :style="{ left: '300px', zIndex: 10 }" 
                      :class="rowBg(row.style)">
                    <button type="button" 
                            @click.stop="toggleRowExpand(`${section.id}-${rowIdx}`)" 
                            class="mx-auto flex w-6 h-5 items-center justify-center text-slate-500 hover:text-brand-600 bg-black/5 hover:bg-black/10 rounded transition-colors border border-black/5 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
                      <i class="fa-solid text-[10px]" :class="expandedRows.includes(`${section.id}-${rowIdx}`) ? 'fa-minus' : 'fa-plus'"></i>
                    </button>
                  </td>

                  <!-- Valores mensuales visibles -->
                  <td
                    v-for="i in displayedMonths"
                    :key="i"
                    class="px-2.5 py-1.5 text-right font-mono border-r border-slate-100 tabular-nums text-[11px]"
                    :class="[
                      row.style !== 'normal' ? 'font-semibold' : '',
                      row.type === 'price' || row.type === 'pct' || (rebajasViewMode !== 'currency' && section.id === 'rebajas')
                        ? 'text-slate-600'
                        : valColor(getVal(row, i), row.negativeIsNormal),
                    ]"
                  >
                    {{ getFmt(row, i) }}
                  </td>

                  <!-- Acumulado / Total anual -->
                  <td
                    class="px-2.5 py-1.5 text-right font-mono font-semibold tabular-nums border-l border-slate-200 text-[11px]"
                    :class="[
                      row.style === 'grand-total' ? 'bg-amber-100' :
                      row.style === 'subtotal'    ? 'bg-yellow-100' :
                      row.style === 'ratio'       ? 'bg-slate-100' : 'bg-slate-50',
                      row.type === 'price' || row.type === 'pct' || (rebajasViewMode !== 'currency' && section.id === 'rebajas')
                        ? 'text-slate-700'
                        : valColor(getTotal(row), row.negativeIsNormal),
                    ]"
                  >
                    {{ getFmtTotal(row) }}
                  </td>

                </tr>

                <!-- Fila expandida con los meses ocultos -->
                <tr v-if="expandedRows.includes(`${section.id}-${rowIdx}`) && hiddenMonths.length > 0" class="border-b border-slate-200 shadow-[inset_0_3px_6px_rgba(0,0,0,0.04)] bg-slate-50">
                  <td :colspan="displayedMonths.length + 4" class="pl-[315px] pr-4 py-3 relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[310px] bg-slate-200/40 border-r border-slate-200/60 pointer-events-none"></div>
                    <div class="flex flex-wrap gap-2.5 items-center relative z-10 w-full overflow-x-auto pb-1 custom-scrollbar">
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0 mr-1 flex items-center gap-1.5 whitespace-nowrap">
                        <i class="fa-solid fa-clock-rotate-left"></i> Ocultos:
                      </span>
                      <div v-for="hIdx in hiddenMonths" :key="hIdx" class="bg-white border border-slate-200/80 rounded px-2.5 py-1 shadow-sm flex flex-col items-end min-w-[72px] shrink-0">
                        <span class="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-none mb-1">{{ MONTH_LABELS[hIdx] }}</span>
                        <span class="text-[11px] font-mono whitespace-nowrap leading-none" :class="[
                           row.style !== 'normal' ? 'font-semibold' : '',
                           row.type === 'price' || row.type === 'pct' || (rebajasViewMode !== 'currency' && section.id === 'rebajas')
                             ? 'text-slate-600'
                             : valColor(getVal(row, hIdx), row.negativeIsNormal)
                        ]">
                          {{ getFmt(row, hIdx) }}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </template>

          </template>
        </tbody>
      </table>
    </div>

    <!-- ── Leyenda ─────────────────────────── -->
    <div class="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-5 flex-wrap text-[10px]">
      <span class="flex items-center gap-1.5 text-slate-500">
        <span class="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300 inline-block"></span>
        Subtotal de partida
      </span>
      <span class="flex items-center gap-1.5 text-slate-500">
        <span class="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300 inline-block"></span>
        Total general
      </span>
      <span class="flex items-center gap-1.5 text-slate-500">
        <span class="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
        Canal Moderno
      </span>
      <span class="flex items-center gap-1.5 text-slate-500">
        <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
        Canal Tradicional
      </span>
      <span class="flex items-center gap-1.5 text-red-400">
        <span class="font-mono font-bold text-red-500 text-[11px]">-$</span>
        Valor inesperadamente positivo (alerta)
      </span>
    </div>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar        { height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track  { background: #f1f5f9; }
.custom-scrollbar::-webkit-scrollbar-thumb  { background: #cbd5e1; border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

.tooltip-enter-active, .tooltip-leave-active { transition: opacity 0.12s ease; }
.tooltip-enter-from, .tooltip-leave-to       { opacity: 0; }
</style>