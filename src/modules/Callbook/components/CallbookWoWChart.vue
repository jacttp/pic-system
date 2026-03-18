<!-- src/modules/Callbook/components/CallbookWoWChart.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useCallbookStore } from '../stores/callbookStore'

echarts.use([BarChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer])

const store = useCallbookStore()

const TOP_N = 20

// ── Top N SKUs por variación absoluta ────────────────────────────────────
const chartData = computed(() => {
  const sorted = [...store.wowData]
    .sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation))
    .slice(0, TOP_N)

  return {
    skus:       sorted.map(r => r.sku),
    variations: sorted.map(r => r.variation),
  }
})

const isEmpty = computed(() => chartData.value.skus.length === 0)

// ── ECharts ───────────────────────────────────────────────────────────────
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

function buildOption(): echarts.EChartsOption {
  const { skus, variations } = chartData.value
  const chartHeight = Math.max(280, skus.length * 28)

  // Color por valor: verde positivo, rojo negativo
  const colors = variations.map(v =>
    v > 0 ? 'rgba(16,185,129,0.85)' : 'rgba(244,63,94,0.85)'
  )

  return {
    backgroundColor: 'transparent',
    grid: { top: 16, right: 80, bottom: 16, left: 16, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1e293b',
      borderColor: '#1e293b',
      textStyle: { color: '#f8fafc', fontSize: 12 },
      formatter: (params: echarts.TooltipComponentFormatterCallbackParams) => {
        const p = Array.isArray(params) ? params[0] : params
        const val = p.value as number
        const sign = val > 0 ? '+' : ''
        const color = val > 0 ? '#10b981' : '#f43f5e'
        return `<b>${p.name}</b><br/>Variación: <b style="color:${color}">${sign}${new Intl.NumberFormat('es-MX').format(val)}</b> pz`
      },
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 10,
        color: '#94a3b8',
        formatter: (v: number) => (v > 0 ? `+${v}` : String(v)),
      },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: skus,
      inverse: true,
      axisLabel: {
        fontSize: 11,
        color: '#475569',
        width: 120,
        overflow: 'truncate',
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: variations.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i], borderRadius: v > 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] },
          label: {
            position: v > 0 ? 'right' : 'left'
          }
        })),
        barMaxWidth: 20,
        label: {
          show: true,
          fontSize: 10,
          color: '#64748b',
          formatter: (p: { value: number }) => {
            const sign = p.value > 0 ? '+' : ''
            return `${sign}${new Intl.NumberFormat('es-MX').format(p.value)}`
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ xAxis: 0 }],
          lineStyle: { color: '#cbd5e1', width: 1.5, type: 'solid' },
          label: { show: false },
        },
      },
    ],
  }
}

function initChart() {
  if (!chartRef.value) return
  const h = Math.max(280, (chartData.value.skus.length || 10) * 28)
  chartRef.value.style.height = `${h}px`
  chart = echarts.init(chartRef.value, undefined, { renderer: 'canvas' })
  chart.setOption(buildOption())
}

let ro: ResizeObserver | null = null

onMounted(() => {
  initChart()
  ro = new ResizeObserver(() => chart?.resize())
  if (chartRef.value) ro.observe(chartRef.value)
})

onUnmounted(() => {
  ro?.disconnect()
  chart?.dispose()
})

watch(
  () => store.wowData,
  async () => {
    const { nextTick } = await import('vue')
    await nextTick()
    if (!chartRef.value) return
    if (!chart) { initChart(); return }
    // Recalcular altura dinámica
    const h = Math.max(280, (chartData.value.skus.length || 10) * 28)
    chartRef.value.style.height = `${h}px`
    chart.resize()
    chart.setOption(buildOption(), { notMerge: true })
  },
  { deep: true },
)
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
    <!-- Header ──────────────────────────────────── -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
        <i class="fa-solid fa-arrow-right-arrow-left text-brand-500"></i>
        Top Impactos Week-over-Week
      </h3>
      <div class="flex items-center gap-3 text-xs text-slate-400">
        <!-- Leyenda ─────────── -->
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm bg-emerald-400 inline-block"></span> Incremento
        </span>
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm bg-rose-400 inline-block"></span> Decremento
        </span>
        <span v-if="store.loadingWow" class="flex items-center gap-1.5">
          <i class="fa-solid fa-circle-notch fa-spin"></i> Cargando...
        </span>
        <span v-else-if="!isEmpty">
          Top {{ Math.min(TOP_N, chartData.skus.length) }} SKUs
        </span>
      </div>
    </div>

    <!-- Semanas comparadas ───────────────────────── -->
    <div v-if="store.filters.currentWeek && store.filters.previousWeek" class="flex items-center gap-2 text-xs">
      <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
        Sem {{ store.filters.previousWeek }}
      </span>
      <i class="fa-solid fa-arrow-right text-slate-300 text-[10px]"></i>
      <span class="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 font-medium">
        Sem {{ store.filters.currentWeek }}
      </span>
    </div>

    <!-- Chart / States ───────────────────────────── -->
    <div class="relative w-full">
      <!-- Skeleton ─────────────── -->
      <div v-if="store.loadingWow" class="flex flex-col gap-2 py-2">
        <div
          v-for="i in 8" :key="i"
          class="flex items-center gap-3"
        >
          <div class="w-28 h-3 bg-slate-100 rounded animate-pulse"></div>
          <div
            class="h-5 bg-slate-100 rounded animate-pulse"
            :style="{ width: `${20 + Math.random() * 50}%` }"
          ></div>
        </div>
      </div>

      <!-- Empty state ──────────── -->
      <div
        v-else-if="isEmpty"
        class="flex flex-col items-center justify-center py-16 gap-2 text-slate-300"
      >
        <i class="fa-solid fa-arrow-right-arrow-left text-4xl"></i>
        <p class="text-sm text-slate-400">Selecciona semana actual y anterior para comparar</p>
      </div>

      <!-- ECharts canvas ───────── -->
      <div
        ref="chartRef"
        class="w-full transition-all duration-300"
        :class="{ 'opacity-0 pointer-events-none absolute inset-0': store.loadingWow || isEmpty }"
        style="min-height: 280px;"
      ></div>
    </div>
  </div>
</template> 