<script setup lang="ts">
import { computed } from 'vue'
import { useSegmentationStore } from '../../stores/segmentationStore'
import ChartTypeSelector from './ChartTypeSelector.vue'
import MasterChart from './MasterChart.vue'
import BoxPlotChart from './BoxPlotChart.vue'
import HistogramChart from './HistogramChart.vue'
import StackedBarChart from './StackedBarChart.vue'
import NormalDistributionChart from './NormalDistributionChart.vue'
import ParetoChart from './ParetoChart.vue'
import type { ChartType } from '../../types/segmentation.types'

interface Emits {
  (e: 'segment-click', segmentId: string): void
}
const emit = defineEmits<Emits>()

const store = useSegmentationStore()

const selectedChartType = computed({
  get: () => store.selectedChartType,
  set: (value: ChartType) => store.setChartType(value)
})

const META: Record<ChartType, { title: string; description: string }> = {
  master: {
    title: 'Vista Maestra — Scatter + Curva de Lorenz',
    description: 'Concentración de ventas vs distribución de clientes. Las burbujas representan el ticket promedio de cada segmento.'
  },
  boxplot: {
    title: 'Diagrama de Caja y Bigotes',
    description: 'Distribución estadística del volumen por segmento. Los puntos amarillos son valores atípicos (outliers).'
  },
  histogram: {
    title: 'Histograma de Distribución',
    description: 'Cantidad de clientes por segmento vs su participación en el volumen total.'
  },
  stacked: {
    title: 'Barras Apiladas 100%',
    description: 'Comparativa de la participación de cada segmento en clientes y volumen.'
  },
  normal: {
    title: 'Distribución Normal — Campana de Gauss',
    description: 'Curva teórica vs distribución real de clientes. Las líneas indican media y desviaciones estándar.'
  },
  pareto: {
    title: 'Curva de Pareto 80/20',
    description: 'Participación individual y acumulada de cada segmento en el volumen total.'
  }
}

const chartTitle = computed(() => META[selectedChartType.value].title)
const chartDescription = computed(() => META[selectedChartType.value].description)
</script>

<template>
  <div class="space-y-4">
    <ChartTypeSelector v-model="selectedChartType" />

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <!-- Header -->
      <div class="p-4 border-b border-slate-200 bg-slate-50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <i class="fa-solid fa-chart-line text-purple-600"></i>
            </div>
            <div>
              <h3 class="font-bold text-slate-800">{{ chartTitle }}</h3>
              <p class="text-xs text-slate-500 max-w-2xl">{{ chartDescription }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div
        v-if="store.isLoading"
        class="h-96 flex items-center justify-center bg-slate-50"
      >
        <div class="text-center">
          <i class="fa-solid fa-circle-notch fa-spin text-4xl text-brand-500 mb-4"></i>
          <p class="text-slate-600 font-medium">Generando visualización...</p>
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="!store.hasData"
        class="h-96 flex items-center justify-center bg-slate-50"
      >
        <div class="text-center max-w-sm px-6">
          <i class="fa-solid fa-chart-simple text-6xl text-slate-300 mb-4"></i>
          <h3 class="text-lg font-bold text-slate-700 mb-2">Sin datos para visualizar</h3>
          <p class="text-sm text-slate-500">
            Configura los filtros y ejecuta el análisis para ver los gráficos interactivos.
          </p>
        </div>
      </div>

      <!-- Charts -->
      <div v-else class="p-4">
        <Transition name="fade" mode="out-in">
          <MasterChart
            v-if="selectedChartType === 'master'"
            @segment-click="emit('segment-click', $event)"
          />
          <BoxPlotChart
            v-else-if="selectedChartType === 'boxplot'"
          />
          <HistogramChart
            v-else-if="selectedChartType === 'histogram'"
            @segment-click="emit('segment-click', $event)"
          />
          <StackedBarChart
            v-else-if="selectedChartType === 'stacked'"
          />
          <NormalDistributionChart
            v-else-if="selectedChartType === 'normal'"
          />
          <ParetoChart
            v-else-if="selectedChartType === 'pareto'"
            @segment-click="emit('segment-click', $event)"
          />
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>