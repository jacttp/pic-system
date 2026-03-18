<script setup lang="ts">
// src/modules/SellOut/components/SellOutTrendChart.vue
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Chart from 'chart.js/auto'
import { useSellOutStore } from '../stores/selloutStore'

const store = useSellOutStore()
const { trend, isLoadingDashboard } = storeToRefs(store)

// ─── Estado local ─────────────────────────────────────────────────────────────

type MetricKey = 'ventaMoney' | 'ventaKg' | 'inventarioKg'

const activeMetric = ref<MetricKey>('ventaMoney')

const metrics: { key: MetricKey; label: string; icon: string }[] = [
  { key: 'ventaMoney', label: 'Sell Out $',    icon: 'fa-solid fa-sack-dollar' },
  { key: 'ventaKg',    label: 'Sell Out KG',   icon: 'fa-solid fa-weight-hanging' },
  { key: 'inventarioKg', label: 'Inventario KG', icon: 'fa-solid fa-boxes-stacked' },
]

const COLORS: Record<MetricKey, { border: string; bg: string; pz: string }> = {
  ventaMoney:    { border: '#10b981', bg: 'rgba(16,185,129,0.12)',  pz: '#6366f1' },
  ventaKg:       { border: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  pz: '#f59e0b' },
  inventarioKg:  { border: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  pz: '#ec4899' },
}

// ─── Chart.js ────────────────────────────────────────────────────────────────

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const fmtValue = (v: number, metric: MetricKey) => {
  if (metric === 'ventaMoney') {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)
  }
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(v) + ' kg'
}

const chartData = computed(() => {
  const labels = trend.value.map(p => p.label)
  const values = trend.value.map(p => p[activeMetric.value])
  const pzValues = trend.value.map(p => p.pzPromedio)
  const color = COLORS[activeMetric.value]

  return {
    labels,
    datasets: [
      {
        label: metrics.find(m => m.key === activeMetric.value)?.label ?? '',
        data: values,
        type: 'bar' as const,
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 2,
        borderRadius: 6,
        yAxisID: 'y',
        order: 2,
      },
      {
        label: 'PZ Promedio',
        data: pzValues,
        type: 'line' as const,
        borderColor: color.pz,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: color.pz,
        tension: 0.35,
        yAxisID: 'y2',
        order: 1,
      },
    ],
  }
})

function buildChart() {
  if (!canvasRef.value) return
  if (chartInstance) chartInstance.destroy()

  chartInstance = new Chart(canvasRef.value, {
    type: 'bar',
    data: chartData.value,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const v = ctx.parsed.y
              if (ctx.datasetIndex === 0) return ` ${fmtValue(v, activeMetric.value)}`
              return ` PZ: ${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(v)}`
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: '#94a3b8' },
        },
        y: {
          position: 'left',
          grid: { color: '#e2e8f0' },
          ticks: {
            font: { size: 11 },
            color: '#94a3b8',
            callback: (v) => fmtValue(Number(v), activeMetric.value),
          },
        },
        y2: {
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: {
            font: { size: 11 },
            color: '#94a3b8',
            callback: (v) => `${v} PZ`,
          },
        },
      },
    },
  })
}

function updateChart() {
  if (!chartInstance) { buildChart(); return }
  chartInstance.data = chartData.value
  chartInstance.update('active')
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => { if (trend.value.length) buildChart() })
onUnmounted(() => { chartInstance?.destroy() })

watch(trend, () => updateChart(), { deep: true })
watch(activeMetric, () => updateChart())
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
          <i class="fa-solid fa-chart-column text-xs text-emerald-600" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-slate-700">Tendencia semanal</h3>
          <p class="text-[10px] text-slate-400">Barras = métrica · Línea = PZ promedio callbook</p>
        </div>
      </div>

      <!-- Toggle de métrica -->
      <div class="flex bg-slate-100 p-1 rounded-lg gap-1">
        <button
          v-for="m in metrics"
          :key="m.key"
          @click="activeMetric = m.key"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          :class="activeMetric === m.key
            ? 'bg-white text-slate-700 shadow-sm'
            : 'text-slate-400 hover:text-slate-600'"
        >
          <i :class="[m.icon, 'text-[10px]']" />
          <span class="hidden sm:inline">{{ m.label }}</span>
        </button>
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="isLoadingDashboard" class="h-64 bg-slate-50 rounded-lg animate-pulse" />

    <!-- Gráfica -->
    <div v-else-if="trend.length" class="h-64 relative">
      <canvas ref="canvasRef" />
    </div>

    <!-- Empty -->
    <div
      v-else
      class="h-64 flex items-center justify-center text-slate-400 text-sm gap-2 border border-dashed border-slate-200 rounded-lg"
    >
      <i class="fa-solid fa-chart-column" />
      <span>Sin datos para el período seleccionado</span>
    </div>

  </div>
</template>