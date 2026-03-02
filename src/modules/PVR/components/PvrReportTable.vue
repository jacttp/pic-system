<!-- src/modules/PVR/components/PvrReportTable.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PvrCanalData } from '../types/pvrTypes';
import {
  fmtCurrency,
  fmtKg,
  fmtPrice,
  fmtPct,
  colorClass,
  MONTH_LABELS,
} from '../utils/pvrFormatters';

// ─────────────────────────────────────────────         
// PROPS
// ─────────────────────────────────────────────

interface Props {
  data:         PvrCanalData;
  compareData?: PvrCanalData; // canal del año anterior para YoY
  canalLabel:   string;
  showYoy?:     boolean;      // toggle desde la vista padre
}

const props = defineProps<Props>();

// ─────────────────────────────────────────────
// DEFINICIÓN DE FILAS
// tooltip: descripción breve de la fórmula.
// ─────────────────────────────────────────────

type RowType = 'kg' | 'currency' | 'price' | 'pct';

interface TableRow {
  label:              string;
  key:                keyof PvrCanalData | '_spacer';
  type:               RowType;
  isSectionHeader?:   boolean;
  isSubRow?:          boolean;
  bold?:              boolean;
  negativeIsNormal?:  boolean;
  spacer?:            boolean;
  tooltip?:           string;
  isCollapsibleParent?: boolean;
  isCollapsibleChild?: boolean;
  isPromoWarning?: boolean;
}

const SECTIONS: TableRow[] = [
  // ── Volumen KG ───────────────────────────────
  {
    label: 'Metas KG', key: 'metasKg', type: 'kg', bold: true,
    tooltip: 'Objetivo de volumen de ventas en kilogramos definido para el período.',
  },
  {
    label: 'Venta KG', key: 'ventaKg', type: 'kg', bold: true,
    tooltip: 'Volumen real vendido en kilogramos (transacción tipo Venta).',
  },
  {
    label: 'Degustación KG', key: 'degustacionKg', type: 'kg', isSubRow: true,
    tooltip: 'Kilogramos destinados a degustación y muestras en punto de venta.',
  },
  { label: '', key: '_spacer', type: 'kg', spacer: true },

  // ── Precio / Facturación ────────────────────
  {
    label: 'Facturación', key: 'facturacion', type: 'currency', bold: true,
    tooltip: 'Monto total facturado antes de aplicar cualquier descuento o devolución.',
  },
  {
    label: 'Índice Precio Bruto x KG', key: 'indicePrecioBruto', type: 'price',
    tooltip: 'Facturación ÷ Venta KG. Precio promedio por kilogramo sin descontar rebajas.',
  },
  { label: '', key: '_spacer', type: 'kg', spacer: true },

  // ── Venta Bruta ─────────────────────────────
  {
    label: 'Venta Bruta $$', key: 'ventaBruta', type: 'currency', isSectionHeader: true, bold: true,
    tooltip: 'Facturación + Devoluciones. Base de cálculo antes de rebajas.',
  },
  { label: '', key: '_spacer', type: 'kg', spacer: true },

  // ── Rebajas ─────────────────────────────────
  {
    label: 'Total (-) Rebajas y Descuentos $$', key: 'totalRebajas', type: 'currency', isSectionHeader: true, bold: true, negativeIsNormal: true, isCollapsibleParent: true,
    tooltip: 'Suma de todas las partidas de rebaja. En negativo = situación esperada.',
  },
  {
    label: '(-) Devoluciones', key: 'devoluciones', type: 'currency', isSubRow: true, negativeIsNormal: true, isCollapsibleChild: true,
    tooltip: 'Notas de crédito por devolución de producto.',
  },
  {
    label: '(-) Diferencia en Precios', key: 'diferenciaPrecios', type: 'currency', isSubRow: true, negativeIsNormal: true, isCollapsibleChild: true,
    tooltip: 'Ajuste por diferencia entre precio lista y precio pactado (nota: "Difenrecia en precios" en BD).',
  },
  {
    label: '(-) Promociones', key: 'promociones', type: 'currency', isSubRow: true, negativeIsNormal: true, isCollapsibleChild: true, isPromoWarning: true,
    tooltip: 'Suma de Promociones Moderno + Promociones Tradicional. (Límite: 8% s/ Venta Bruta)',
  },
  {
    label: '(-) Degustación $$', key: 'degustacionDol', type: 'currency', isSubRow: true, negativeIsNormal: true, isCollapsibleChild: true,
    tooltip: 'Costo monetario de actividades de degustación en punto de venta.',
  },
  {
    label: '(-) Cargos', key: 'cargos', type: 'currency', isSubRow: true, negativeIsNormal: true, isCollapsibleChild: true,
    tooltip: 'Cargos administrativos aplicados por el cliente (penalizaciones, logística, etc.).',
  },
  {
    label: '(-) Planes Lealtad', key: 'planesLealtad', type: 'currency', isSubRow: true, negativeIsNormal: true, isCollapsibleChild: true,
    tooltip: 'Descuentos aplicados por programas de lealtad y fidelización.',
  },
  {
    label: '(-) Rapel y Acuerdos Cadenas', key: 'rapelYAcuerdos', type: 'currency', isSubRow: true, negativeIsNormal: true, isCollapsibleChild: true,
    tooltip: 'Descuento Rapel + Acuerdos Cadenas + Acuerdos Tradicional.',
  },
  { label: '', key: '_spacer', type: 'kg', spacer: true },

  // ── Venta Neta ──────────────────────────────
  {
    label: 'Venta Neta $$', key: 'ventaNeta', type: 'currency', isSectionHeader: true, bold: true,
    tooltip: 'Venta Bruta + Total Rebajas (las rebajas son negativas, por eso se suman).',
  },
  { label: '', key: '_spacer', type: 'kg', spacer: true },

  // ── Ratios ──────────────────────────────────
  {
    label: 'Precio $$ x KG Neto', key: 'precioKgNeto', type: 'price',
    tooltip: 'Venta Neta ÷ Venta KG. Precio real por kilo después de descontar todas las rebajas.',
  },
  {
    label: 'Inversión por KG', key: 'inversionKg', type: 'price', negativeIsNormal: true,
    tooltip: 'Total Rebajas ÷ Venta KG. Cuánto se invierte en descuentos por cada kilo vendido.',
  },
  {
    label: '% Rebajas vs Brutas', key: 'pctRebajasBrutas', type: 'pct', negativeIsNormal: true,
    tooltip: 'Total Rebajas ÷ Venta Bruta. Proporción del descuento respecto al precio bruto.',
  },
  {
    label: '% Rebajas vs Netas', key: 'pctRebajasNetas', type: 'pct', negativeIsNormal: true,
    tooltip: 'Total Rebajas ÷ Venta Neta. Proporción del descuento respecto al ingreso neto.',
  },
  {
    label: '% Cumplimiento Metas KG', key: 'pctCumplimientoKg', type: 'pct',
    tooltip: 'Venta KG ÷ Metas KG. Porcentaje de cumplimiento del objetivo de volumen.',
  },
  { label: '', key: '_spacer', type: 'kg', spacer: true },

  // ── Subproductos ────────────────────────────
  {
    label: 'Subproductos', key: 'subproductos', type: 'currency',
    tooltip: 'Ingresos por venta de subproductos derivados del proceso productivo.',
  },
];

// ─────────────────────────────────────────────
// TOOLTIP STATE
// ─────────────────────────────────────────────

const activeTooltip = ref<number | null>(null);

function showTooltip(idx: number): void  { activeTooltip.value = idx; }
function hideTooltip(): void             { activeTooltip.value = null; }

const isRebajasCollapsed = ref(true);

function toggleRebajas(): void {
  isRebajasCollapsed.value = !isRebajasCollapsed.value;
}

function checkPromoLimit(promo: number | null | undefined, bruta: number | null | undefined): boolean {
  if (!promo || !bruta) return false;
  return Math.abs(promo) / bruta > 0.08;
}

// ─────────────────────────────────────────────
// FORMATEADOR
// ─────────────────────────────────────────────

function format(value: number | null, type: RowType): string {
  switch (type) {
    case 'kg':       return fmtKg(value);
    case 'price':    return fmtPrice(value);
    case 'pct':      return fmtPct(value);
    case 'currency':
    default:         return fmtCurrency(value);
  }
}

// ─────────────────────────────────────────────
// ACCESO A DATOS
// ─────────────────────────────────────────────

function getMonths(source: PvrCanalData, key: keyof PvrCanalData): (number | null)[] {
  const indicator = source[key];
  if (!indicator || typeof indicator !== 'object' || !('months' in indicator)) return Array(12).fill(null);
  return (indicator as { months: (number | null)[] }).months;
}

function getTotal(source: PvrCanalData, key: keyof PvrCanalData): number | null {
  const indicator = source[key];
  if (!indicator || typeof indicator !== 'object' || !('total' in indicator)) return null;
  return (indicator as { total: number | null }).total;
}

// ─────────────────────────────────────────────
// YoY: variación porcentual vs periodo anterior
// ─────────────────────────────────────────────

/**
 * Calcula Δ% = (actual - anterior) / |anterior|
 * Devuelve null si no hay dato de comparación o el denominador es 0.
 */
function yoyDelta(current: number | null, prev: number | null): number | null {
  if (current === null || prev === null || prev === 0) return null;
  return (current - prev) / Math.abs(prev);
}

function yoyTotal(key: keyof PvrCanalData, negativeIsNormal = false): number | null {
  if (!props.compareData || !props.showYoy) return null;
  const curr = getTotal(props.data, key);
  const prev = getTotal(props.compareData, key);
  const delta = yoyDelta(curr, prev);
  // Para rebajas (negativeIsNormal) invertimos el signo visual:
  // Si las rebajas bajan (mejoran), queremos mostrar verde
  return negativeIsNormal && delta !== null ? -delta : delta;
}

function fmtYoy(v: number | null): string {
  if (v === null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(1)}%`;
}

function yoyClass(v: number | null): string {
  if (v === null) return 'text-slate-300';
  if (v > 0.02)  return 'text-emerald-600 font-semibold';
  if (v < -0.02) return 'text-red-500 font-semibold';
  return 'text-slate-500';
}

// ─────────────────────────────────────────────
// MESES VISIBLES
// ─────────────────────────────────────────────

const visibleMonths = computed<number[]>(() => {
  const ventaKg = getMonths(props.data, 'ventaKg');
  const active = ventaKg
    .map((v, i) => ({ i, hasData: v !== null && v !== 0 }))
    .filter((x) => x.hasData)
    .map((x) => x.i);
  return active.length > 0 ? active : MONTH_LABELS.map((_, i) => i);
});

// Número de columnas totales (para colspan en spacers)
const totalCols = computed(() =>
  1 + visibleMonths.value.length + 1 + (props.showYoy ? 1 : 0)
);
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

    <!-- ── Header ─────────────────────────── -->
    <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-wrap">
      <i class="fa-solid fa-table-cells-large text-brand-500 text-sm"></i>
      <span class="text-sm font-semibold text-slate-700">Informe PVR</span>
      <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-100">
        {{ canalLabel }}
      </span>
      <span
        v-if="showYoy && compareData"
        class="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100"
      >
        <i class="fa-solid fa-arrow-right-arrow-left mr-1 text-[10px]"></i>YoY activo
      </span>
    </div>

    <!-- ── Tabla ──────────────────────────── -->
    <div class="overflow-x-auto custom-scrollbar">
      <table class="w-full text-xs border-collapse min-w-[900px]">

        <!-- THEAD -->
        <thead>
          <tr class="bg-slate-800 text-white">
            <!-- Indicador -->
            <th class="sticky left-0 z-10 bg-slate-800 text-left px-4 py-2.5 font-semibold w-60 min-w-60 border-r border-slate-700">
              Indicador
            </th>
            <!-- Meses -->
            <th
              v-for="i in visibleMonths"
              :key="i"
              class="px-3 py-2.5 text-right font-semibold min-w-[90px] border-r border-slate-700"
            >
              {{ MONTH_LABELS[i] }}
            </th>
            <!-- Total -->
            <th class="px-3 py-2.5 text-right font-semibold min-w-[100px] bg-slate-700 border-r border-slate-600">
              Total
            </th>
            <!-- YoY -->
            <th
              v-if="showYoy && compareData"
              class="px-3 py-2.5 text-right font-semibold min-w-[80px] bg-violet-900 text-violet-200"
            >
              Δ YoY
            </th>
          </tr>
        </thead>

        <!-- TBODY -->
        <tbody>
          <template v-for="(row, rowIdx) in SECTIONS" :key="rowIdx">
            <template v-if="!(row.isCollapsibleChild && isRebajasCollapsed)">
              <!-- Spacer -->
              <tr v-if="row.spacer" class="h-1 bg-slate-100">
                <td :colspan="totalCols" class="p-0"></td>
              </tr>

              <!-- Data row -->
              <tr
                v-else
                class="border-b border-slate-100 transition-colors"
                :class="row.isSectionHeader ? 'bg-slate-50 hover:bg-slate-100' : 'bg-white hover:bg-brand-50/30'"
              >
                <!-- ── Label con tooltip ─────── -->
                <td
                  class="sticky left-0 z-10 px-4 py-2 border-r border-slate-200 whitespace-nowrap"
                  :class="[
                    row.isSectionHeader ? 'bg-slate-50 text-slate-800' : 'bg-white text-slate-600',
                    row.isSubRow ? 'pl-7 text-slate-500' : '',
                    row.bold ? 'font-semibold' : '',
                    row.isCollapsibleParent ? 'cursor-pointer hover:bg-slate-200 transition-colors select-none' : ''
                  ]"
                  @click="row.isCollapsibleParent ? toggleRebajas() : undefined"
                >
                  <div class="flex items-center gap-1.5 relative">
                    <span v-if="row.isSubRow" class="text-slate-300">└</span>
                    
                    <button v-if="row.isCollapsibleParent" type="button" class="w-4 h-4 rounded text-slate-500 bg-white shadow-sm border border-slate-200 hover:text-slate-700 hover:border-slate-300 flex items-center justify-center transition-all mr-1">
                       <i class="fa-solid text-[10px]" :class="isRebajasCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
                    </button>

                    <span>{{ row.label }}</span>

                  <!-- Icono de tooltip -->
                  <button
                    v-if="row.tooltip"
                    type="button"
                    class="text-slate-300 hover:text-brand-400 transition-colors shrink-0"
                    @mouseenter="showTooltip(rowIdx)"
                    @mouseleave="hideTooltip()"
                    @focus="showTooltip(rowIdx)"
                    @blur="hideTooltip()"
                    aria-label="Ver fórmula"
                  >
                    <i class="fa-solid fa-circle-info text-[10px]"></i>
                  </button>

                  <!-- Tooltip flotante -->
                  <Transition name="tooltip-fade">
                    <div
                      v-if="activeTooltip === rowIdx && row.tooltip"
                      class="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 w-64 bg-slate-800 text-white text-[11px] leading-relaxed px-3 py-2 rounded-lg shadow-xl pointer-events-none"
                    >
                      <div class="font-semibold text-slate-200 mb-0.5">{{ row.label }}</div>
                      {{ row.tooltip }}
                      <!-- Flecha -->
                      <div class="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></div>
                    </div>
                  </Transition>
                </div>
              </td>

              <!-- ── Valores mensuales ─────── -->
              <td
                v-for="i in visibleMonths"
                :key="i"
                class="px-3 py-2 text-right font-mono border-r border-slate-100 tabular-nums"
                :class="[
                  row.isSectionHeader ? 'font-semibold' : '',
                  row.type === 'price'
                    ? 'text-slate-700'
                    : colorClass(getMonths(data, row.key as keyof PvrCanalData)[i] ?? null, !row.negativeIsNormal),
                  row.isPromoWarning && checkPromoLimit(getMonths(data, row.key as keyof PvrCanalData)[i] ?? null, getMonths(data, 'ventaBruta')[i] ?? null) ? 'text-rose-600 bg-rose-50/50 font-bold' : ''
                ]"
              >
                 <div class="flex items-center justify-end gap-1">
                   <span v-if="row.isPromoWarning && checkPromoLimit(getMonths(data, row.key as keyof PvrCanalData)[i] ?? null, getMonths(data, 'ventaBruta')[i] ?? null)" class="text-rose-500" title="Supera 8% de Venta Bruta">
                     <i class="fa-solid fa-triangle-exclamation text-[10px]"></i>
                   </span>
                   <span>{{ format(getMonths(data, row.key as keyof PvrCanalData)[i] ?? null, row.type) }}</span>
                 </div>
              </td>

              <!-- ── Total ────────────────── -->
              <td
                class="px-3 py-2 text-right font-mono font-semibold tabular-nums border-l border-slate-200"
                :class="[
                  row.isSectionHeader ? 'bg-slate-100' : 'bg-slate-50',
                  row.type === 'price'
                    ? 'text-slate-700'
                    : colorClass(getTotal(data, row.key as keyof PvrCanalData), !row.negativeIsNormal),
                  row.isPromoWarning && checkPromoLimit(getTotal(data, row.key as keyof PvrCanalData), getTotal(data, 'ventaBruta')) ? 'text-rose-600 bg-rose-100/50 font-bold' : ''
                ]"
              >
                 <div class="flex items-center justify-end gap-1">
                   <span v-if="row.isPromoWarning && checkPromoLimit(getTotal(data, row.key as keyof PvrCanalData), getTotal(data, 'ventaBruta'))" class="text-rose-500" title="Supera 8% de Venta Bruta">
                     <i class="fa-solid fa-triangle-exclamation text-[10px]"></i>
                   </span>
                   <span>{{ format(getTotal(data, row.key as keyof PvrCanalData), row.type) }}</span>
                 </div>
              </td>

              <!-- ── YoY ──────────────────── -->
              <td
                v-if="showYoy && compareData"
                class="px-3 py-2 text-right font-mono tabular-nums bg-violet-50/40 border-l border-violet-100"
                :class="yoyClass(yoyTotal(row.key as keyof PvrCanalData, row.negativeIsNormal || false))"
              >
                {{ fmtYoy(yoyTotal(row.key as keyof PvrCanalData, row.negativeIsNormal || false)) }}
              </td>

            </tr>
            </template>
          </template>
        </tbody>

      </table>
    </div>

    <!-- ── Footer ─────────────────────────── -->
    <div class="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
      <span class="text-[10px] text-slate-400">
        <i class="fa-solid fa-circle-info mr-1"></i>
        Cifras en MXN · Rebajas en negativo = situación esperada ·
        <i class="fa-solid fa-circle-info text-brand-300 mx-0.5"></i> = ver fórmula
      </span>
      <span class="text-[10px] text-slate-400 font-mono">
        {{ visibleMonths.length }} mes{{ visibleMonths.length !== 1 ? 'es' : '' }} con datos
      </span>
    </div>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

.tooltip-fade-enter-active,
.tooltip-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.tooltip-fade-enter-from,
.tooltip-fade-leave-to    { opacity: 0; transform: translateX(-4px) translateY(-50%); }
</style>