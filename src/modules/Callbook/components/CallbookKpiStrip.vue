<!-- src/modules/Callbook/components/CallbookKpiStrip.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useCallbookStore } from '../stores/callbookStore'
import CallbookKpiCard from './CallbookKpiCard.vue'

const store = useCallbookStore()

const kpis = computed(() => [
  {
    title:   'Captura Total Semanal',
    value:   store.totalWeeklyPieces,
    icon:    'fa-solid fa-boxes-stacked',
    tooltip: 'Sumatoria de piezas registradas físicamente en campo para la semana seleccionada (endpoint: getWeeklySummary).',
    loading: store.loadingSummary,
    variant: 'default' as const,
  },
  {
    title:   'Alertas Críticas (Agotados)',
    value:   store.outOfStockCount,
    icon:    'fa-solid fa-triangle-exclamation',
    tooltip: 'Número de registros con 0 piezas detectados en la semana actual. Un valor mayor a 0 requiere acción inmediata (endpoint: getOutOfStock).',
    loading: store.loadingOutOfStock,
    variant: 'danger' as const,
  },
  {
    title:   'Variación Neta WoW',
    value:   store.netWoWVariation,
    icon:    'fa-solid fa-arrow-right-arrow-left',
    tooltip: 'Diferencia total de piezas entre la semana actual y la semana anterior (Σ variation, endpoint: getWoWVariation). Verde = más inventario, Rojo = menos.',
    loading: store.loadingWow,
    variant: 'default' as const,
    showTrend: true,
    formatter: (v: number) => (v > 0 ? `+${new Intl.NumberFormat('es-MX').format(v)}` : new Intl.NumberFormat('es-MX').format(v)),
  },
  {
    title:   'Registros Auditados',
    value:   store.filteredCount,
    icon:    'fa-solid fa-clipboard-list',
    tooltip: 'Total de capturas procesadas en el período filtrado. Mide la cobertura del equipo en campo (endpoint: getFilteredRawData).',
    loading: store.loadingFiltered,
    variant: 'default' as const,
  },
])
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    <CallbookKpiCard
      v-for="kpi in kpis"
      :key="kpi.title"
      v-bind="kpi"
    />
  </div>
</template>