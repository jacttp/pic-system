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
  if (!segments.length) return {}

  const colors = getChartColors(store.currentGroupType)
  const unit = store.metricUnit

  const clientBars = segments.map((s, i) => ({
    value: s.clientCount,
    itemStyle: { color: colors[i] ?? '#64748b', borderRadius: [4, 4, 0, 0] },
    name: s.id,
    segmentData: s
  }))

  const volumeBars = segments.map((s, i) => ({
    value: parseFloat(s.volumePercent.toFixed(2)),
    itemStyle: {
      color: colors[i] ?? '#64748b',
      opacity: 0.5,
      borderRadius: [4, 4, 0, 0]
    },
    name: s.id,
    segmentData: s
  }))

  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...baseTooltipStyle,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const s = params[0]?.data?.segmentData
        if (!s) return ''
        return `
          <div style="min-width:200px;padding:4px 0">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#f1f5f9">${s.id} — ${s.label}</div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:5px 14px;font-size:12px">
              <span style="color:#94a3b8">Clientes</span>
              <span style="font-weight:600">${formatNumber(s.clientCount, 0)} (${formatPercent(s.clientPercent)})</span>
              <span style="color:#94a3b8">Volumen</span>
              <span style="font-weight:600">${formatNumber(s.volume, 0)} ${unit}</span>
              <span style="color:#94a3b8">% Volumen</span>
              <span style="font-weight:600">${formatPercent(s.volumePercent)}</span>
              <span style="color:#94a3b8">Ticket Prom.</span>
              <span style="font-weight:600">${formatNumber(s.avgTicket, 0)} ${unit}</span>
            </div>
          </div>`
      }
    },
    legend: {
      bottom: 0,
      data: ['Clientes', '% Volumen'],
      textStyle: { color: CHART_COLORS.base.text, fontSize: 11 }
    },
    grid: { ...baseGrid, bottom: 70 },
    xAxis: {
      type: 'category',
      data: segments.map(s => s.id),
      axisLabel: { color: CHART_COLORS.base.textDark, fontWeight: 600, fontSize: 12 },
      axisTick: { alignWithLabel: true }
    },
    yAxis: [
      {
        type: 'value',
        name: 'N° Clientes',
        nameTextStyle: { color: CHART_COLORS.base.text, fontSize: 11 },
        axisLabel: { color: CHART_COLORS.base.text, fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.base.grid, type: 'dashed' } }
      },
      {
        type: 'value',
        name: '% Volumen',
        nameTextStyle: { color: CHART_COLORS.base.text, fontSize: 11 },
        axisLabel: { formatter: '{value}%', color: CHART_COLORS.base.text, fontSize: 11 },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'Clientes',
        type: 'bar',
        yAxisIndex: 0,
        data: clientBars,
        label: {
          show: true,
          position: 'top',
          formatter: (p: any) => formatNumber(p.value, 0),
          color: CHART_COLORS.base.textDark,
          fontSize: 11,
          fontWeight: 600
        },
        barMaxWidth: 80
      },
      {
        name: '% Volumen',
        type: 'line',
        yAxisIndex: 1,
        data: volumeBars,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#7c3aed', width: 2.5 },
        itemStyle: { color: '#7c3aed', borderColor: '#fff', borderWidth: 2 }
      }
    ]
  }
}

watch(isReady, (ready) => {
  if (ready) {
    on('click', (params: any) => {
      if (params.data?.name) emit('segment-click', params.data.name)
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