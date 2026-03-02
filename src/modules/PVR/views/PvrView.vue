<!-- src/modules/PVR/views/PvrView.vue -->
<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { usePvrStore } from '../stores/pvrStore';
import type { PvrActiveFilters, PvrCanal, PvrCanalData } from '../types/pvrTypes';
import PvrFilterBar from '../components/PvrFilterBar.vue';
import PvrReportTable from '../components/PvrReportTable.vue';
import { usePvrExport } from '../composables/userPrvExport';
import { fmtCurrency, fmtKg, fmtPct } from '../utils/pvrFormatters';

const store        = usePvrStore();
const { exportToExcel } = usePvrExport();

// ─────────────────────────────────────────────
// YoY: segundo set de datos para comparar
// ─────────────────────────────────────────────

/** Toggle visible del panel YoY */
const showYoy      = ref(false);

/**
 * Datos del año de comparación.
 * El store siempre tiene el período actual en `reportData`.
 * Para YoY pedimos el año anterior con sus propios filtros.
 */
const compareData  = ref<Record<PvrCanal, PvrCanalData> | null>(null);
const isLoadingYoy = ref(false);

/**
 * Devuelve los datos del canal activo del período de comparación.
 */
const currentCompareCanal = computed<PvrCanalData | null>(() => {
  if (!compareData.value || !showYoy.value) return null;
  return compareData.value[store.activeCanal] ?? null;
});

/**
 * Año de comparación = año seleccionado - 1.
 * Si hay múltiples años en el filtro, tomamos el menor - 1.
 */
const compareYear = computed<string | null>(() => {
  const años = store.activeFilters.años;
  if (!años.length) return null;
  const minYear = Math.min(...años.map(Number));
  return String(minYear - 1);
});

async function loadCompareData(): Promise<void> {
  if (!compareYear.value) return;
  isLoadingYoy.value = true;
  try {
    const { pvrApi } = await import('../services/pvrApi');
    const response = await pvrApi.getReport({
      ...store.activeFilters,
      años: [compareYear.value],
    });
    if (response.success) {
      compareData.value = response.data;
    }
  } catch (e) {
    console.error('[PvrView] Error cargando datos YoY:', e);
    compareData.value = null;
  } finally {
    isLoadingYoy.value = false;
  }
}

async function toggleYoy(): Promise<void> {
  showYoy.value = !showYoy.value;
  if (showYoy.value && !compareData.value) {
    await loadCompareData();
  }
}

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

const isExporting = ref(false);

function handleExport(): void {
  if (!store.reportData) return;
  isExporting.value = true;
  try {
    // Calcular meses visibles (índices 0-based con datos)
    const ventaKg = store.currentCanalData?.ventaKg.months ?? [];
    const activeMonthIndices = ventaKg
      .map((v, i) => ({ i, hasData: v !== null && v !== 0 }))
      .filter((x) => x.hasData)
      .map((x) => x.i);

    // Sufijo del archivo: años seleccionados + canal
    const suffix = [
      store.activeFilters.años.join('-'),
      store.activeCanal !== 'Total' ? store.activeCanal : '',
    ].filter(Boolean).join('_');

    exportToExcel(store.reportData, activeMonthIndices, suffix);
  } finally {
    // Pequeño delay para que el spinner sea perceptible
    setTimeout(() => { isExporting.value = false; }, 600);
  }
}

// ─────────────────────────────────────────────
// KPI CARDS
// ─────────────────────────────────────────────

const kpis = computed(() => {
  const d = store.currentCanalData;
  if (!d) return [];

  let pctPromociones = 0;
  if (d.ventaBruta.total && d.promociones.total !== null) {
      pctPromociones = Math.abs(d.promociones.total) / d.ventaBruta.total;
  }
  const promoSuperaLimite = pctPromociones > 0.08;

  return [
    { label: 'Venta Neta $$',       value: fmtCurrency(d.ventaNeta.total),         icon: 'fa-solid fa-sack-dollar',    color: 'text-brand-600',  bg: 'bg-brand-50' },
    { label: 'Inversión por KG',    value: fmtCurrency(d.inversionKg.total),        icon: 'fa-solid fa-chart-line',     color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { 
      label: '% Promociones',       
      value: fmtPct(pctPromociones),                 
      icon: promoSuperaLimite ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-tags', 
      color: promoSuperaLimite ? 'text-rose-600' : 'text-emerald-600', 
      bg: promoSuperaLimite ? 'bg-rose-100' : 'bg-emerald-50',
      cardClass: promoSuperaLimite ? 'bg-rose-50/50 border-rose-200 ring-1 ring-rose-100' : 'bg-white border-slate-200'
    },
    { label: 'Venta KG',            value: fmtKg(d.ventaKg.total),                 icon: 'fa-solid fa-weight-hanging', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: '% Cumpl. Metas KG',   value: fmtPct(d.pctCumplimientoKg.total),      icon: 'fa-solid fa-bullseye',       color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: '% Rebajas vs Brutas', value: fmtPct(d.pctRebajasBrutas.total),       icon: 'fa-solid fa-percent',        color: 'text-amber-600',  bg: 'bg-amber-50' },
  ];
});

// ─────────────────────────────────────────────
// CANAL TABS
// ─────────────────────────────────────────────

const canalTabs = computed<Array<{ value: PvrCanal; label: string }>>(() =>
  store.availableCanales.map((c) => ({ value: c, label: c }))
);

// ─────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────

async function handleApply(filters: PvrActiveFilters): Promise<void> {
  // Resetear datos YoY al cambiar filtros — se recalcularán si YoY está activo
  compareData.value = null;
  await store.applyFilters(filters);
  if (showYoy.value) await loadCompareData();
}

function handleReset(): void {
  compareData.value = null;
  showYoy.value = false;
  store.resetFilters();
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
  <div class="p-4 lg:p-6 max-w-screen-2xl mx-auto space-y-4">

    <!-- ── Header ───────────────────────────── -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 lg:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <i class="fa-solid fa-chart-waterfall text-sm"></i>
          </div>
          Informe PVR
        </h1>
        <p class="text-sm text-slate-500 max-w-2xl">
          Análisis de Precio de Venta Real — Facturación, Rebajas y Venta Neta
        </p>
      </div>

      <!-- Acciones del header -->
      <div class="flex items-center gap-2 flex-wrap self-start md:self-auto">

        <!-- YoY toggle -->
        <button
          type="button"
          @click="toggleYoy"
          :disabled="isLoadingYoy || !store.reportData"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40"
          :class="showYoy
            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
            : 'bg-white text-slate-600 border-slate-300 hover:border-violet-400 hover:text-violet-600'"
        >
          <i
            class="fa-solid text-xs"
            :class="isLoadingYoy ? 'fa-circle-notch fa-spin' : 'fa-arrow-right-arrow-left'"
          ></i>
          YoY
          <span v-if="compareYear && showYoy" class="opacity-75">(vs {{ compareYear }})</span>
        </button>

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

    <!-- ── Filtros ───────────────────────────── -->
    <PvrFilterBar
      :filter-options="store.filterOptions"
      v-model="store.activeFilters"
      :is-loading="store.isLoading"
      @apply="handleApply(store.activeFilters)"
      @reset="handleReset"
    />

    <!-- ── Error ─────────────────────────────── -->
    <div
      v-if="store.error"
      class="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
    >
      <i class="fa-solid fa-circle-exclamation shrink-0"></i>
      {{ store.error }}
    </div>

    <!-- ── Loading skeleton ─────────────────── -->
    <template v-if="store.isLoading && !store.reportData">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div v-for="i in 6" :key="i" class="bg-white rounded-xl border border-slate-200 p-4 h-20 animate-pulse">
          <div class="h-3 bg-slate-100 rounded w-2/3 mb-3"></div>
          <div class="h-5 bg-slate-100 rounded w-1/2"></div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 h-64 animate-pulse"></div>
    </template>

    <!-- ── Contenido ─────────────────────────── -->
    <template v-else-if="store.reportData">

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          v-for="kpi in kpis"
          :key="kpi.label"
          class="rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow"
          :class="kpi.cardClass || 'bg-white border-slate-200'"
        >
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="kpi.bg">
              <i :class="[kpi.icon, 'text-xs', kpi.color]"></i>
            </div>
            <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">
              {{ kpi.label }}
            </span>
          </div>
          <p class="text-base font-bold text-slate-800 font-mono tabular-nums truncate">{{ kpi.value }}</p>
        </div>
      </div>

      <!-- Canal Tabs -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            v-for="tab in canalTabs"
            :key="tab.value"
            type="button"
            @click="store.setActiveCanal(tab.value)"
            class="px-4 py-1.5 rounded-md text-xs font-semibold transition-all"
            :class="store.activeCanal === tab.value
              ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-700'"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Indicador YoY año comparado -->
        <div
          v-if="showYoy && compareYear"
          class="text-[11px] text-violet-600 font-medium flex items-center gap-1.5 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-100"
        >
          <i class="fa-solid fa-arrow-right-arrow-left text-[10px]"></i>
          Comparando {{ store.activeFilters.años.join(', ') }} vs {{ compareYear }}
          <span v-if="isLoadingYoy" class="ml-1">
            <i class="fa-solid fa-circle-notch fa-spin text-[10px]"></i>
          </span>
        </div>
      </div>

      <!-- Tabla -->
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
          v-if="store.currentCanalData"
          :data="store.currentCanalData"
          :compare-data="currentCompareCanal ?? undefined"
          :canal-label="store.activeCanal"
          :show-yoy="showYoy && !!currentCompareCanal"
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

  </div>
</template>