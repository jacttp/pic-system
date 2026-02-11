<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSegmentationStore } from '../../stores/segmentationStore'
import { useEChart, CHART_COLORS, baseTooltipStyle, baseGrid } from '../../composables/useEChart'
import { useFormatters } from '../../composables/useFormatters'
import { useSegmentColors } from '../../composables/useSegmentColors'

const store = useSegmentationStore()
const { formatNumber } = useFormatters()
const { getChartColors } = useSegmentColors()

const containerRef = ref<HTMLDivElement | null>(null)
const { isReady, setOption } = useEChart(containerRef)

const buildOption = () => {
  const segments = store.segments
  const stats = store.statistics
  if (!segments.length || !stats) return {}

  const colors = getChartColors(store.currentGroupType)
  const unit = store.metricUnit

  // Construir datos de box plot por segmento
  // ECharts boxplot necesita: [min, Q1, mediana, Q3, max]
  const boxData = segments.map(s => {
    const min = s.range.min
    const max = s.range.max
    const q1 = min + (max - min) * 0.25
    const median = min + (max - min) * 0.5
    const q3 = min + (max - min) * 0.75
    return [min, q1, median, q3, max]
  })

  // Outliers globales del análisis estadístico
  const outlierData = stats.outliers.map(o => [
    // Posición en X = índice del segmento más cercano
    segments.findIndex(s => o.value >= s.range.min && o.value <= s.range.max),
    o.value
  ]).filter(d => d[0] >= 0)

  const labels = segments.map(s => s.id)

  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...baseTooltipStyle,
      trigger: 'item',
      formatter: (params: any) => {
        if (params.seriesType === 'scatter') {
          const outlier = stats.outliers[params.dataIndex]
          return outlier
            ? `<div style="padding:4px 0">
                <div style="font-weight:700;color:#fbbf24;margin-bottom:6px">Valor Atípico</div>
                <div style="color:#f1f5f9">${outlier.clientName}</div>
                <div style="color:#94a3b8;font-size:11px">${formatNumber(outlier.value, 0)} ${unit}</div>
              </div>`
            : ''
        }
        const idx = params.dataIndex
        const seg = segments[idx]
        const d = params.data
        return `
          <div style="min-width:180px;padding:4px 0">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#f1f5f9">${seg?.id ?? ''} — ${seg?.label ?? ''}</div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px">
              <span style="color:#94a3b8">Máx</span><span style="font-weight:600">${formatNumber(d[4], 0)} ${unit}</span>
              <span style="color:#94a3b8">Q3</span><span style="font-weight:600">${formatNumber(d[3], 0)} ${unit}</span>
              <span style="color:#94a3b8">Mediana</span><span style="font-weight:600">${formatNumber(d[2], 0)} ${unit}</span>
              <span style="color:#94a3b8">Q1</span><span style="font-weight:600">${formatNumber(d[1], 0)} ${unit}</span>
              <span style="color:#94a3b8">Mín</span><span style="font-weight:600">${formatNumber(d[0], 0)} ${unit}</span>
            </div>
          </div>`
      }
    },
    grid: baseGrid,
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: CHART_COLORS.base.text, fontWeight: 600 },
      axisTick: { alignWithLabel: true }
    },
    yAxis: {
      type: 'value',
      name: unit,
      nameTextStyle: { color: CHART_COLORS.base.text, fontSize: 12 },
      axisLabel: {
        formatter: (v: number) => formatNumber(v, 0),
        color: CHART_COLORS.base.text,
        fontSize: 11
      },
      splitLine: { lineStyle: { color: CHART_COLORS.base.grid, type: 'dashed' } }
    },
    series: [
      {
        name: 'Distribución',
        type: 'boxplot',
        data: boxData,
        itemStyle: {
          color: (params: any) => colors[params.dataIndex] ?? '#64748b',
          borderColor: (params: any) => colors[params.dataIndex] ?? '#64748b',
          borderWidth: 2
        },
        boxWidth: ['30%', '60%']
      },
      {
        name: 'Outliers',
        type: 'scatter',
        data: outlierData,
        symbolSize: 8,
        itemStyle: { color: '#fbbf24', borderColor: '#f59e0b', borderWidth: 1 },
        tooltip: { show: true }
      }
    ]
  }
}

watch(isReady, (ready) => {
  if (ready && store.hasData) setOption(buildOption(), true)
})

watch(() => store.segments, () => {
  if (isReady.value && store.hasData) setOption(buildOption(), true)
}, { deep: true })
</script>

<template>
  <div ref="containerRef" class="w-full h-96 md:h-[420px]"></div>
</template>