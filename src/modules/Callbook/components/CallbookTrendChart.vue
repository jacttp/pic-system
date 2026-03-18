<!-- src/modules/Callbook/components/CallbookTrendChart.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts/core'
import {
  LineChart,
  BarChart,
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkPointComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useCallbookStore } from '../stores/callbookStore'

echarts.use([
  LineChart, BarChart,
  GridComponent, TooltipComponent, LegendComponent, MarkPointComponent,
  CanvasRenderer,
])

const store = useCallbookStore()

// ── Datos agrupados por semana (Σ pieces) ─────────────────────────────────
const chartData = computed(() => {
  const grouped = new Map<string, number>()
  for (const r of store.summaryData) {
    grouped.set(r.week, (grouped.get(r.week) ?? 0) + r.pieces)
  }
  // Ordenar por semana numérica
  const sorted = [...grouped.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))
  return {
    weeks:  sorted.map(([w]) => `Sem ${w}`),
    pieces: sorted.map(([, p]) => p),
  }
})

const isEmpty = computed(() => chartData.value.weeks.length === 0)

// ── ECharts ───────────────────────────────────────────────────────────────
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

function buildOption(): echarts.EChartsOption {
  const { weeks, pieces } = chartData.value
  const max = Math.max(...pieces, 1)

  return {
    backgroundColor: 'transparent',
    grid: { top: 24, right: 24, bottom: 40, left: 56, containLabel: false },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#1e293b',
      textStyle: { color: '#f8fafc', fontSize: 12 },
      formatter: (params: echarts.TooltipComponentFormatterCallbackParams) => {
        const p = Array.isArray(params) ? params[0] : params
        return `<b>${p.name}</b><br/>Piezas: <b>${new Intl.NumberFormat('es-MX').format(p.value as number)}</b>`
      },
    },
    xAxis: {
      type: 'category',
      data: weeks,
      axisLabel: { fontSize: 11, color: '#94a3b8', rotate: weeks.length > 20 ? 45 : 0 },
      axisLine:  { lineStyle: { color: '#e2e8f0' } },
      axisTick:  { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 11,
        color: '#94a3b8',
        formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
      },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    },
    series: [
      {
        name: 'Piezas Capturadas',
        type: 'line',
        smooth: true,
        data: pieces,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#0284c7', width: 2.5 },
        itemStyle: { color: '#0284c7', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0,   color: 'rgba(2, 132, 199, 0.18)' },
            { offset: 1,   color: 'rgba(2, 132, 199, 0)' },
          ]),
        },
        markPoint: {
          symbol: 'pin',
          symbolSize: 36,
          data: [
            { type: 'max', name: 'Máx', itemStyle: { color: '#0284c7' } },
            { type: 'min', name: 'Mín', itemStyle: { color: '#94a3b8' } },
          ],
          label: {
            fontSize: 10,
            formatter: (p: { value: number }) =>
              p.value >= 1000 ? `${(p.value / 1000).toFixed(1)}k` : String(p.value),
          },
        },
      },
    ],
  }
}

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value, undefined, { renderer: 'canvas' })
  chart.setOption(buildOption())
}

// ResizeObserver para que el gráfico responda al contenedor
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
  () => store.summaryData,
  () => {
    if (!chart) { initChart(); return }
    chart.setOption(buildOption(), { notMerge: false })
  },
  { deep: true },
)
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
    <!-- Header ──────────────────────────────────── -->
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
        <i class="fa-solid fa-chart-line text-brand-500"></i>
        Tendencia de Captura Física Semanal
      </h3>
      <span v-if="store.loadingSummary" class="text-xs text-slate-400 flex items-center gap-1.5">
        <i class="fa-solid fa-circle-notch fa-spin"></i> Cargando...
      </span>
      <span v-else-if="!isEmpty" class="text-xs text-slate-400">
        {{ chartData.weeks.length }} semanas
      </span>
    </div>

    <!-- Chart / States ───────────────────────────── -->
    <div class="relative min-h-[360px]">
      <!-- Skeleton ─────────────── -->
      <div
        v-if="store.loadingSummary"
        class="absolute inset-0 flex flex-col justify-end gap-2 px-2 pb-4"
      >
        <div class="flex items-end gap-1.5 h-full">
          <div
            v-for="i in 12" :key="i"
            class="flex-1 bg-slate-100 rounded-t animate-pulse"
            :style="{ height: `${30 + Math.random() * 60}%` }"
          ></div>
        </div>
      </div>

      <!-- Empty state ──────────── -->
      <div
        v-else-if="isEmpty"
        class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300"
      >
        <i class="fa-solid fa-chart-line text-4xl"></i>
        <p class="text-sm text-slate-400">Selecciona un cliente y período para ver la tendencia</p>
      </div>

      <!-- ECharts canvas ───────── -->
      <div
        ref="chartRef"
        class="w-full h-[360px]"
        :class="{ 'opacity-0': store.loadingSummary || isEmpty }"
      ></div>
    </div>
  </div>
</template>