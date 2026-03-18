<!-- src/modules/Callbook/views/CallbookView.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useCallbookStore } from '../stores/callbookStore'

// ── Componentes panorama general ──────────────────────────────────────────
import CallbookOverviewKpis  from '../components/CallbookOverviewKpis.vue'
import CallbookOosRanking    from '../components/CallbookOosRanking.vue'
import CallbookOverviewTable from '../components/CallbookOverviewTable.vue'

// ── Componentes vista cliente específico ──────────────────────────────────
import CallbookFilterBar       from '../components/CallbookFilterBar.vue'
import CallbookKpiStrip        from '../components/CallbookKpiStrip.vue'
import CallbookTrendChart      from '../components/CallbookTrendChart.vue'
import CallbookWoWChart        from '../components/CallbookWoWChart.vue'
import CallbookWoWTable        from '../components/CallbookWoWTable.vue'
import CallbookOutOfStockTable from '../components/CallbookOutOfStockTable.vue'
import CallbookLogsTable       from '../components/CallbookLogsTable.vue'

const store = useCallbookStore()

function getCurrentWeek(): string {
  const now        = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const dayOfYear  = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
  )
  return String(Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7))
}

onMounted(() => {
  const semana = getCurrentWeek()
  store.setGlobalAnio(new Date().getFullYear().toString())
  store.setGlobalSemana(semana)
  store.fetchGlobalDashboard(semana)
})

onUnmounted(() => store.reset())
</script>

<template>
  <div class="flex flex-col gap-6 p-4 md:p-6 min-h-full">

    <!-- ── Encabezado ──────────────────────────────────────────────── -->
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm flex-shrink-0">
        <i class="fa-solid fa-book-open text-white text-sm"></i>
      </div>
      <div>
        <h1 class="text-lg font-bold text-slate-800 leading-tight">Callbook Analytics</h1>
        <p class="text-xs text-slate-400">Captura de existencias físicas en punto de venta</p>
      </div>
    </div>

    <!-- ── Filtros Globales (Top) ──────────────────────────────────────────────── -->
    <CallbookFilterBar />

    <!-- ════════════════════════════════════════════════════════════════
         MODO A — Panorama General (sin cliente seleccionado)
    ════════════════════════════════════════════════════════════════ -->
    <template v-if="!store.filters.clientId">

      <CallbookOverviewKpis />

      <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div class="xl:col-span-2">
          <CallbookOosRanking />
        </div>
        <div class="xl:col-span-3">
          <CallbookOverviewTable />
        </div>
      </div>

    </template>

    <!-- ════════════════════════════════════════════════════════════════
         MODO B — Vista Cliente Específico
    ════════════════════════════════════════════════════════════════ -->
    <template v-else>

      <div class="flex items-center gap-3">
        <button
          @click="store.setFilters({ clientId: '' })"
          class="h-8 px-3 rounded-lg border border-slate-200 text-slate-500 text-xs
                 hover:bg-slate-50 hover:text-slate-700 transition-colors flex items-center gap-1.5"
        >
          <i class="fa-solid fa-arrow-left text-[10px]"></i>
          Panorama general
        </button>
        <span class="text-xs text-slate-400">
          Consultando:
          <span class="font-mono font-semibold text-slate-600">
            {{ store.filters.clientId }}
          </span>
        </span>
      </div>

      <CallbookKpiStrip />

      <div class="flex flex-col gap-6">
        <CallbookTrendChart />
        <CallbookWoWChart />
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CallbookWoWTable />
        <CallbookOutOfStockTable />
      </div>

      <CallbookLogsTable />

      <!-- Error global -->
      <div
        v-if="store.error"
        class="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10
               border border-destructive/20 text-destructive text-sm"
      >
        <i class="fa-solid fa-circle-exclamation flex-shrink-0"></i>
        <span>{{ store.error }}</span>
        <button
          class="ml-auto text-xs underline hover:no-underline"
          @click="store.fetchAll()"
        >
          Reintentar
        </button>
      </div>

    </template>

  </div>
</template>