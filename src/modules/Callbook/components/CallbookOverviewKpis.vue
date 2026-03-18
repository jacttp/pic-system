<!-- src/modules/Callbook/components/CallbookOverviewKpis.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useCallbookStore } from '../stores/callbookStore'
import CallbookKpiCard from './CallbookKpiCard.vue'

const store = useCallbookStore()

const kpis = computed(() => [
  {
    title:   'Piezas Totales en Tiendas',
    value:   store.matricesTotalPZ,
    icon:    'fa-solid fa-boxes-stacked',
    tooltip: 'Suma de piezas capturadas físicamente en todas las tiendas para la semana seleccionada (endpoint: matrices-overview).',
    loading: store.loadingMatrices,
    variant: 'default' as const,
  },
  {
    title:   'Tiendas con Captura',
    value:   store.matricesTotalTiendas,
    icon:    'fa-solid fa-store',
    tooltip: 'Número de tiendas únicas (Matrices) que registraron al menos una captura en la semana seleccionada.',
    loading: store.loadingMatrices,
    variant: 'default' as const,
  },
  {
    title:   'SKUs Auditados',
    value:   store.matricesTotalSKUs,
    icon:    'fa-solid fa-barcode',
    tooltip: 'Total de SKUs capturados en campo considerando todas las tiendas del período seleccionado.',
    loading: store.loadingMatrices,
    variant: 'default' as const,
  },
  {
    title:   'SKUs en Quiebre',
    value:   store.overviewTotalQuiebres,
    icon:    'fa-solid fa-triangle-exclamation',
    tooltip: 'Total de SKUs con 0 piezas detectados en todas las tiendas para la semana activa (endpoint: global-out-of-stock).',
    loading: store.loadingOosGlobal,
    variant: 'danger' as const,
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