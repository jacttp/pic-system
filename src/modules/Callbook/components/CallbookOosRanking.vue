// src/modules/Callbook/components/CallbookOosRanking.vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useCallbookStore } from '../stores/callbookStore'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const store = useCallbookStore()

const TOP_N = 15

const chartData = computed(() => {
  return [...store.outOfStockGlobal]
    .sort((a, b) => b.TiendasEnQuiebre - a.TiendasEnQuiebre)
    .slice(0, TOP_N)
})

const isEmpty = computed(() => chartData.value.length === 0)

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

function buildOption(): echarts.EChartsOption {
  const skus    = chartData.value.map(r => r.SKUREAL)
  const valores = chartData.value.map(r => r.TiendasEnQuiebre)
  const maxVal  = Math.max(...valores, 1)

  return {
    backgroundColor: 'transparent',
    grid: { top: 8, right: 48, bottom: 8, left: 16, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1e293b',
      borderColor: '#1e293b',
      textStyle: { color: '#f8fafc', fontSize: 12 },
      formatter: (params: echarts.TooltipComponentFormatterCallbackParams) => {
        const p = Array.isArray(params) ? params[0] : params
        return `<b>${p.name}</b><br/>Tiendas en quiebre: <b style="color:#f43f5e">${p.value}</b>`
      },
    },
    xAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#94a3b8' },
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
        width: 130,
        overflow: 'truncate',
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: valores.map((v) => ({
          value: v,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0,   color: 'rgba(244,63,94,0.9)' },
              { offset: 1,   color: 'rgba(251,113,133,0.7)' },
            ]),
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barMaxWidth: 18,
        label: {
          show: true,
          position: 'right',
          fontSize: 10,
          color: '#64748b',
          formatter: (p: { value: number }) => String(p.value),
        },
      },
    ],
  }
}

function initChart() {
  if (!chartRef.value) return
  const h = Math.max(280, chartData.value.length * 30)
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
  () => store.outOfStockGlobal,
  async () => {
    await nextTick()
    if (!chartRef.value) return
    if (!chart) { initChart(); return }
    
    const h = Math.max(280, chartData.value.length * 30)
    chartRef.value.style.height = `${h}px`
    chart.resize()
    chart.setOption(buildOption(), { notMerge: true })
  },
  { deep: true },
)
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 h-full">

    <!-- Header -->
    <div class="flex items-center justify-between shrink-0">
      <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
        <i class="fa-solid fa-ranking-star text-rose-500"></i>
        Ranking de Quiebres por SKU
      </h3>
      <span v-if="store.loadingOosGlobal" class="text-xs text-slate-400 flex items-center gap-1.5">
        <i class="fa-solid fa-circle-notch fa-spin"></i> Cargando...
      </span>
      <span v-else-if="!isEmpty" class="text-xs text-slate-400">
        Top {{ Math.min(TOP_N, chartData.length) }} SKUs
      </span>
    </div>

    <!-- Semana activa -->
    <div v-if="store.globalFilters.semana" class="flex items-center gap-1.5 text-xs shrink-0">
      <span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-medium">
        <i class="fa-solid fa-triangle-exclamation text-[10px] mr-1"></i>
        Sem {{ store.globalFilters.semana }} · {{ store.globalFilters.anio }}
      </span>
    </div>

    <!-- Skeleton -->
    <div v-if="store.loadingOosGlobal" class="flex flex-col gap-2 py-2 flex-1">
      <div v-for="i in 8" :key="i" class="flex items-center gap-3">
        <div class="w-32 h-3 bg-slate-100 rounded animate-pulse"></div>
        <div
          class="h-4 bg-rose-50 rounded animate-pulse"
          :style="{ width: `${20 + Math.random() * 50}%` }"
        ></div>
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="isEmpty"
      class="flex flex-col items-center justify-center py-12 gap-2 text-slate-300 flex-1"
    >
      <i class="fa-solid fa-circle-check text-4xl text-emerald-300"></i>
      <p class="text-sm text-slate-400">Sin quiebres detectados</p>
    </div>

    <!-- Chart -->
    <div
      v-else
      class="flex-1 overflow-y-auto custom-scrollbar relative min-h-0"
    >
      <div
        ref="chartRef"
        class="w-full h-full"
        :class="{ 'opacity-0 pointer-events-none': store.loadingOosGlobal }"
        style="min-height: 280px;"
      ></div>
    </div>

  </div>
</template>