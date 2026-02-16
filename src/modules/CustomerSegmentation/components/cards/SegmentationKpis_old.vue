<script setup lang="ts">
import { computed } from 'vue'
import { useSegmentationStore } from '../../stores/segmentationStore'
import { useFormatters } from '../../composables/useFormatters'
import KPICard from './KpiCard.vue'

const store = useSegmentationStore()
const { formatCompact, formatPercent, formatGini } = useFormatters()

const totalClientsFormatted = computed(() => {
  if (!store.hasData) return '-'
  return formatCompact(store.totalClients)
})

const totalVolumeFormatted = computed(() => {
  if (!store.hasData) return '-'
  const value = formatCompact(store.totalVolume)
  return `${value} ${store.metricUnit}`
})

const avgTicketFormatted = computed(() => {
  if (!store.hasData) return '-'
  const avg = store.totalVolume / store.totalClients
  return `${formatCompact(avg)} ${store.metricUnit}`
})

const paretoFormatted = computed(() => {
  if (!store.hasData || !store.pareto) return '-'
  return `${formatPercent(store.pareto.topClientsPercent, 1)} / ${formatPercent(store.pareto.topVolumePercent, 1)}`
})

const giniFormatted = computed(() => {
  if (!store.hasData || !store.pareto) return '-'
  return formatGini(store.pareto.giniIndex)
})

const concentrationLevel = computed(() => {
  if (!store.hasData || !store.pareto) return { label: '-', color: 'text-slate-600' }
  
  const gini = store.pareto.giniIndex
  
  if (gini < 0.3) return { label: 'Baja desigualdad', color: 'text-green-600' }
  if (gini < 0.5) return { label: 'Desigualdad moderada', color: 'text-yellow-600' }
  if (gini < 0.7) return { label: 'Alta desigualdad', color: 'text-orange-600' }
  return { label: 'Muy alta desigualdad', color: 'text-red-600' }
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center gap-3 mb-4">
      <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
        <i class="fa-solid fa-chart-line text-blue-600"></i>
      </div>
      <div>
        <h3 class="font-bold text-slate-800">Indicadores Principales</h3>
        <p class="text-xs text-slate-500">Resumen ejecutivo de la segmentación</p>
      </div>
    </div>
    
    <!-- KPI Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <!-- Total Clientes -->
      <KPICard
        title="Total Clientes"
        :value="totalClientsFormatted"
        subtitle="segmentados"
        icon="fa-users"
        icon-color="text-blue-600"
        :loading="store.isLoading"
      />
      
      <!-- Volumen Total -->
      <KPICard
        :title="`Volumen Total`"
        :value="totalVolumeFormatted"
        :subtitle="store.metricLabel"
        icon="fa-chart-bar"
        icon-color="text-green-600"
        :loading="store.isLoading"
      />
      
      <!-- Ticket Promedio -->
      <KPICard
        title="Ticket Promedio"
        :value="avgTicketFormatted"
        subtitle="por cliente"
        icon="fa-calculator"
        icon-color="text-purple-600"
        :loading="store.isLoading"
      />
      
      <!-- Índice Pareto -->
      <KPICard
        title="Índice Pareto"
        :value="paretoFormatted"
        subtitle="clientes / volumen"
        icon="fa-chart-pie"
        icon-color="text-orange-600"
        :loading="store.isLoading"
      />
      
      <!-- Índice Gini -->
      <KPICard
        title="Índice Gini"
        :value="giniFormatted"
        :subtitle="concentrationLevel.label"
        icon="fa-balance-scale"
        :icon-color="concentrationLevel.color"
        :loading="store.isLoading"
      />
    </div>
    
    <!-- Explicación de Pareto -->
    <div 
      v-if="store.hasData && store.pareto"
      class="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg"
    >
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <i class="fa-solid fa-lightbulb text-orange-600"></i>
        </div>
        <div class="flex-1">
          <h4 class="font-bold text-orange-900 mb-1">Análisis de Concentración</h4>
          <p class="text-sm text-orange-800">
            El <strong>{{ formatPercent(store.pareto.topClientsPercent, 1) }}</strong> 
            de tus clientes 
            (<strong>{{ formatCompact(store.pareto.topClientsCount) }}</strong> clientes)
            generan el <strong>{{ formatPercent(store.pareto.topVolumePercent, 1) }}</strong> 
            del volumen total.
            El índice Gini de <strong>{{ giniFormatted }}</strong> indica
            <span :class="concentrationLevel.color" class="font-semibold lowercase">
              {{ concentrationLevel.label }}
            </span>
            en la distribución de ventas.
          </p>
        </div>
      </div>
    </div>
    
    <!-- Estado Vacío -->
    <div 
      v-if="!store.hasData && !store.isLoading"
      class="mt-4 p-8 text-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl"
    >
      <i class="fa-solid fa-chart-simple text-4xl text-slate-300 mb-3"></i>
      <p class="text-slate-600 font-medium">No hay datos de segmentación</p>
      <p class="text-sm text-slate-500 mt-1">
        Aplica filtros y ejecuta el análisis para ver los indicadores
      </p>
    </div>
  </div>
</template>