<!-- src/modules/PVR/views/PvrView.vue -->
<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { usePvrStore } from '../stores/pvrStore';
import type { PvrActiveFilters } from '../types/pvrTypes';
import PvrFilterBar from '../components/PvrFilterBar.vue';
import PvrReportTable from '../components/PvrReportTable.vue';
import PvrIndicatorModal from '../components/PvrIndicatorModal.vue';
import { usePvrExport } from '../composables/userPrvExport';
import { fmtCurrency, fmtKg, fmtPct, fmtPrice } from '../utils/pvrFormatters';
import CacheProgress from '@/modules/Shared/components/CacheProgress.vue';

const store = usePvrStore();
const { exportToExcel } = usePvrExport();

// ─────────────────────────────────────────────
// DATOS POR CANAL
// ─────────────────────────────────────────────

const modernoData     = computed(() => store.reportData?.['Moderno']     ?? null);
const tradicionalData = computed(() => store.reportData?.['Tradicional'] ?? null);
const totalData       = computed(() => store.reportData?.['Total']       ?? null);

// ─────────────────────────────────────────────
// KPI CARDS — desde el Total combinado
// ─────────────────────────────────────────────

const kpis = computed(() => {
  const d = totalData.value;
  if (!d) return [];
  return [
    {
      label: 'Venta Neta $$',
      value: fmtCurrency(d.ventaNeta.total),
      icon:  'fa-solid fa-sack-dollar',
      color: 'text-brand-600',
      bg:    'bg-brand-50',
      border:'border-brand-100',
      note:  'Suma directa de BD',
    },
    {
      label: 'Venta Bruta $$',
      value: fmtCurrency(d.ventaBruta.total),
      icon:  'fa-solid fa-file-invoice-dollar',
      color: 'text-blue-600',
      bg:    'bg-blue-50',
      border:'border-blue-100',
      note:  'Neta + Rebajas',
    },
    {
      label: 'Venta KG',
      value: fmtKg(d.ventaKg.total),
      icon:  'fa-solid fa-weight-hanging',
      color: 'text-emerald-600',
      bg:    'bg-emerald-50',
      border:'border-emerald-100',
      note:  'Volumen físico',
    },
    {
      label: 'Total Rebajas $$',
      value: fmtCurrency(d.totalRebajas.total),
      icon:  'fa-solid fa-tags',
      color: 'text-red-500',
      bg:    'bg-red-50',
      border:'border-red-100',
      note:  'A+B+C+D+E+F+G',
    },
    {
      label: '% Rebajas vs Brutas',
      value: fmtPct(d.pctRebajasBrutas.total),
      icon:  'fa-solid fa-percent',
      color: 'text-amber-600',
      bg:    'bg-amber-50',
      border:'border-amber-100',
      note:  'Objetivo < 8%',
    },
    {
      label: '% Rebajas vs Netas',
      value: fmtPct(d.pctRebajasNetas.total),
      icon:  'fa-solid fa-percent',
      color: 'text-orange-600',
      bg:    'bg-orange-50',
      border:'border-orange-100',
      note:  'Contra Venta Neta',
    },
    {
      label: 'Inversión por KG',
      value: fmtPrice(d.inversionKg.total),
      icon:  'fa-solid fa-chart-line',
      color: 'text-indigo-600',
      bg:    'bg-indigo-50',
      border:'border-indigo-100',
      note:  'Costo de descuento x kg',
    },
  ];
});

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

const isExporting = ref(false);

function handleExport(): void {
  if (!store.reportData) return;
  isExporting.value = true;
  try {
    const ventaKg = totalData.value?.ventaKg.months ?? [];
    const activeMonthIndices = ventaKg
      .map((v, i) => ({ i, hasData: v !== null && v !== 0 }))
      .filter((x) => x.hasData)
      .map((x) => x.i);
    const suffix = store.activeFilters.años.join('-');
    exportToExcel(store.reportData, activeMonthIndices, suffix);
  } finally {
    setTimeout(() => { isExporting.value = false; }, 600);
  }
}

// ─────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────

async function handleApply(filters: PvrActiveFilters): Promise<void> {
  await store.applyFilters(filters);
}

function handleReset(): void {
  store.resetFilters();
}

// ─────────────────────────────────────────────
// MODAL DE CHART
// ─────────────────────────────────────────────

const showChartModal = ref(false);
const chartTitle = ref('');
const chartType = ref<'kg' | 'currency' | 'price' | 'pct'>('currency');
const chartData = ref<{ moderno: (number | null)[]; tradicional: (number | null)[]; total: (number | null)[]; }>({ moderno: [], tradicional: [], total: [] });
const visibleMonths = ref<number[]>([]);

function handleRowClick(payload: { label: string; key: keyof import('../types/pvrTypes').PvrCanalData; type: 'kg' | 'currency' | 'price' | 'pct'; sectionId?: string; rebajasMode?: string }) {
  if (!store.reportData || !payload.key) return;
  
  // Limpia prefijos como "(A) ", "└ ", "(-) " de forma segura sin comerse letras
  chartTitle.value = payload.label
    .replace(/^[\s└\-]+/, '') // Quita espacios, └ o guiones iniciales
    .replace(/^\([A-G]\)\s*/, '') // Quita (A), (B), etc...
    .trim();
    
  const isRebajasPct = payload.sectionId === 'rebajas' && payload.rebajasMode && payload.rebajasMode !== 'currency';
  chartType.value = isRebajasPct ? 'pct' : payload.type;

  if (isRebajasPct) {
    const subtitle = payload.rebajasMode === 'brutas' ? 's/ Brutas' : 
                     payload.rebajasMode === 'netas' ? 's/ Netas' : 's/ Rebajas';
    chartTitle.value += ` (% ${subtitle})`;
  }
  
  const getMonths = (canal: 'Moderno' | 'Tradicional' | 'Total') => {
    const data = store.reportData![canal]?.[payload.key];
    let months = data && typeof data === 'object' && 'months' in data ? [...(data.months as (number | null)[])] : [];
    
    if (isRebajasPct) {
       let denKey: 'ventaBruta' | 'ventaNeta' | 'totalRebajas' = 'ventaBruta';
       if (payload.rebajasMode === 'netas') denKey = 'ventaNeta';
       else if (payload.rebajasMode === 'rebajas') denKey = 'totalRebajas';
       
       const denData = store.reportData![canal]?.[denKey];
       const denMonths = denData && typeof denData === 'object' && 'months' in denData ? (denData.months as (number | null)[]) : [];
       
       months = months.map((val, i) => {
         if (val === null || val === undefined) return null;
         const denVal = denMonths[i];
         if (!denVal) return 0;
         return val / Math.abs(denVal);
       });
    }
    return months;
  };

  chartData.value = {
    moderno: getMonths('Moderno'),
    tradicional: getMonths('Tradicional'),
    total: getMonths('Total'),
  };

  const ventaKg = store.reportData['Total']?.ventaKg.months ?? [];
  visibleMonths.value = ventaKg
    .map((v, i) => ({ i, hasData: v !== null && v !== 0 }))
    .filter((x) => x.hasData)
    .map((x) => x.i);

  if (visibleMonths.value.length === 0) {
    visibleMonths.value = [0,1,2,3,4,5,6,7,8,9,10,11];
  }

  showChartModal.value = true;
}

// ─────────────────────────────────────────────
// LIFECYCLE
// ─────────────────────────────────────────────

onMounted(async () => {
  await store.fetchFilters();
  await store.fetchReport();
});
</script>

<template>
  <div class="p-4 lg:p-6 w-full max-w-[1920px] mx-auto space-y-4">

    <!-- ── Header ────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <i class="fa-solid fa-chart-waterfall text-brand-500"></i>
          Informe PVR
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">
          Precio de Venta Real — Facturación, Rebajas y Venta Neta por Canal
        </p>
      </div>

      <div class="flex items-center gap-4 flex-wrap self-start sm:self-auto">
        <CacheProgress />
        
        <div class="flex items-center gap-2">
          <!-- Export Excel -->
          <button
          type="button"
          @click="handleExport"
          :disabled="isExporting || !store.reportData"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-40"
        >
          <i class="fa-solid text-xs" :class="isExporting ? 'fa-circle-notch fa-spin' : 'fa-file-excel'"></i>
          {{ isExporting ? 'Exportando...' : 'Excel' }}
        </button>

        <!-- Refresh -->
        <button
          type="button"
          @click="store.fetchReport()"
          :disabled="store.isLoading"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40"
        >
          <i class="fa-solid fa-rotate-right text-xs" :class="{ 'fa-spin': store.isLoading }"></i>
          Actualizar
        </button>
      </div>
    </div>
  </div>

    <!-- ── Filtros (colapsables) ─────────────── -->
    <PvrFilterBar
      :filter-options="store.filterOptions"
      v-model="store.activeFilters"
      :is-loading="store.isLoading"
      @apply="handleApply(store.activeFilters)"
      @reset="handleReset"
    />

    <!-- ── Error ──────────────────────────────── -->
    <div
      v-if="store.error"
      class="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
    >
      <i class="fa-solid fa-circle-exclamation shrink-0"></i>
      {{ store.error }}
    </div>

    <!-- ── Loading skeleton ──────────────────── -->
    <template v-if="store.isLoading && !store.reportData">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div v-for="i in 6" :key="i" class="bg-white rounded-xl border border-slate-200 p-4 h-24 animate-pulse">
          <div class="h-3 bg-slate-100 rounded w-2/3 mb-3"></div>
          <div class="h-5 bg-slate-100 rounded w-1/2 mb-2"></div>
          <div class="h-2 bg-slate-100 rounded w-3/4"></div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 h-96 animate-pulse"></div>
    </template>

    <!-- ── Contenido ──────────────────────────── -->
    <template v-else-if="store.reportData">

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
        <div
          v-for="kpi in kpis"
          :key="kpi.label"
          class="bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          :class="kpi.border"
        >
          <!-- Icono de fondo decorativo -->
          <div class="absolute -right-2 -bottom-2 opacity-5">
            <i :class="[kpi.icon, 'text-5xl', kpi.color]"></i>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="kpi.bg">
              <i :class="[kpi.icon, 'text-xs', kpi.color]"></i>
            </div>
            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
              {{ kpi.label }}
            </span>
          </div>
          <p class="text-sm font-bold text-slate-800 font-mono tabular-nums truncate">{{ kpi.value }}</p>
          <p class="text-[10px] text-slate-400 mt-0.5">{{ kpi.note }}</p>
        </div>
      </div>

      <!-- Tabla principal -->
      <div class="relative">
        <!-- Overlay de recarga -->
        <div
          v-if="store.isLoading"
          class="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-20 rounded-xl flex items-center justify-center"
        >
          <div class="flex flex-col items-center gap-2">
            <i class="fa-solid fa-circle-notch fa-spin text-brand-500 text-2xl"></i>
            <span class="text-xs text-slate-500 font-medium">Actualizando informe...</span>
          </div>
        </div>

        <PvrReportTable
          :moderno="modernoData"
          :tradicional="tradicionalData"
          :total="totalData"
          @row-click="handleRowClick"
        />
      </div>

    </template>

    <!-- ── Empty state ────────────────────────── -->
    <div
      v-else-if="!store.isLoading"
      class="flex flex-col items-center justify-center py-20 text-slate-400"
    >
      <i class="fa-solid fa-chart-waterfall text-5xl mb-4 text-slate-200"></i>
      <p class="font-medium">Sin datos para los filtros seleccionados</p>
      <p class="text-sm mt-1">Ajusta el año o los filtros y presiona Aplicar</p>
    </div>

    <!-- ── Modal Evolución ────────────────────── -->
    <PvrIndicatorModal
      v-model:show="showChartModal"
      :title="chartTitle"
      :type="chartType"
      :monthsObjArray="chartData"
      :visibleMonths="visibleMonths"
    />
  </div>
</template>