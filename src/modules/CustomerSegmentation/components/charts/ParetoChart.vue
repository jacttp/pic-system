<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSegmentationStore } from '../../stores/segmentationStore'
import { useEChart, CHART_COLORS, baseTooltipStyle, baseGrid } from '../../composables/useEChart'
import { useFormatters } from '../../composables/useFormatters'
import { useSegmentColors } from '../../composables/useSegmentColors'

const store = useSegmentationStore()
const { formatNumber, formatPercent } = useFormatters()
const { getChartColors } = useSegmentColors()

const containerRef = ref<HTMLDivElement | null>(null)
const { isReady, setOption, on } = useEChart(containerRef)

interface Emits {
  (e: 'segment-click', segmentId: string): void
}
const emit = defineEmits<Emits>()

const buildOption = () => {
  const segments = store.segments
  const pareto = store.pareto
  if (!segments.length) return {}

  const colors = getChartColors(store.currentGroupType)
  const unit = store.metricUnit

  const labels = segments.map(s => s.id)
  const volumePercents = segments.map(s => parseFloat(s.volumePercent.toFixed(2)))
  const accumPercents = segments.map(s => parseFloat(s.volumePercentAccum.toFixed(2)))

  // Línea de referencia 80%
  const pareto80 = pareto?.cutoffValue ?? 80

  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...baseTooltipStyle,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const idx = params[0]?.dataIndex
        const s = segments[idx]
        if (!s) return ''
        return `
          <div style="min-width:200px;padding:4px 0">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#f1f5f9">${s.id} — ${s.label}</div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px">
              <span style="color:#94a3b8">Volumen</span>
              <span style="font-weight:600">${formatNumber(s.volume, 0)} ${unit}</span>
              <span style="color:#94a3b8">% del total</span>
              <span style="font-weight:600">${formatPercent(s.volumePercent)}</span>
              <span style="color:#10b981">% Acumulado</span>
              <span style="font-weight:600;color:#10b981">${formatPercent(s.volumePercentAccum)}</span>
              <span style="color:#94a3b8">Clientes</span>
              <span style="font-weight:600">${formatNumber(s.clientCount, 0)}</span>
            </div>
          </div>`
      }
    },
    legend: {
      bottom: 0,
      data: ['% Volumen', '% Vol. Acumulado'],
      textStyle: { color: CHART_COLORS.base.text, fontSize: 11 }
    },
    grid: { ...baseGrid, bottom: 70 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: CHART_COLORS.base.textDark, fontWeight: 600, fontSize: 12 },
      axisTick: { alignWithLabel: true }
    },
    yAxis: [
      {
        type: 'value',
        name: '% Volumen',
        nameTextStyle: { color: CHART_COLORS.base.text, fontSize: 11 },
        axisLabel: { formatter: '{value}%', color: CHART_COLORS.base.text, fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.base.grid, type: 'dashed' } },
        max: 100
      },
      {
        type: 'value',
        name: '% Acumulado',
        nameTextStyle: { color: CHART_COLORS.base.text, fontSize: 11 },
        axisLabel: { formatter: '{value}%', color: CHART_COLORS.base.text, fontSize: 11 },
        splitLine: { show: false },
        max: 100
      }
    ],
    series: [
      {
        name: '% Volumen',
        type: 'bar',
        yAxisIndex: 0,
        data: volumePercents.map((v, i) => ({
          value: v,
          itemStyle: {
            color: colors[i] ?? '#64748b',
            borderRadius: [4, 4, 0, 0]
          }
        })),
        barMaxWidth: 80,
        label: {
          show: true,
          position: 'top' as const,
          formatter: (p: any) => `${formatPercent(p.value)}`,
          color: CHART_COLORS.base.textDark,
          fontSize: 11,
          fontWeight: 600
        }
      },
      {
        name: '% Vol. Acumulado',
        type: 'line',
        yAxisIndex: 1,
        data: accumPercents,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#10b981', width: 3 },
        itemStyle: { color: '#10b981', borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true,
          position: 'top' as const,
          formatter: (p: any) => `${formatPercent(p.value)}`,
          color: '#10b981',
          fontSize: 10,
          fontWeight: 600
        },
        markLine: {
          silent: true,
          data: [
            {
              yAxis: 80,
              lineStyle: { color: '#f59e0b', type: 'dashed', width: 2 },
              label: {
                show: true,
                formatter: 'Pareto 80%',
                color: '#f59e0b',
                fontWeight: 600,
                fontSize: 11
              }
            }
          ]
        }
      }
    ]
  }
}

watch(isReady, (ready) => {
  if (ready) {
    on('click', (params: any) => {
      const s = store.segments[params.dataIndex]
      if (s) emit('segment-click', s.id)
    })
    if (store.hasData) setOption(buildOption(), true)
  }
})

watch(() => store.segments, () => {
  if (isReady.value && store.hasData) setOption(buildOption(), true)
}, { deep: true })
</script>

<template>
  <div ref="containerRef" class="w-full h-96 md:h-[420px]"></div>
</template>