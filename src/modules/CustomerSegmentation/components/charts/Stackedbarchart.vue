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
const { isReady, setOption } = useEChart(containerRef)

const buildOption = () => {
  const segments = store.segments
  if (!segments.length) return {}

  const colors = getChartColors(store.currentGroupType)
  const unit = store.metricUnit

  // Series de clientes y volumen apiladas al 100%
  const clientSeries = segments.map((s, i) => ({
    value: parseFloat(s.clientPercent.toFixed(2)),
    itemStyle: { color: colors[i] ?? '#64748b' },
    segmentData: s
  }))

  const volumeSeries = segments.map((s, i) => ({
    value: parseFloat(s.volumePercent.toFixed(2)),
    itemStyle: { color: colors[i] ?? '#64748b' },
    segmentData: s
  }))

  // Generar series individuales por segmento (para colores por barra)
  const segmentClientSeries = segments.map((s, i) => ({
    name: s.id,
    type: 'bar' as const,
    stack: 'clientes',
    data: [
      { value: 0 }, // placeholder para columna volumen
      { value: parseFloat(s.clientPercent.toFixed(2)), segmentData: s }
    ],
    itemStyle: { color: colors[i] ?? '#64748b' },
    barMaxWidth: 120,
    label: {
      show: s.clientPercent > 5,
      position: 'inside' as const,
      formatter: (p: any) => `${s.id}\n${formatPercent(p.value)}`,
      color: '#fff',
      fontSize: 11,
      fontWeight: 600 as const
    }
  }))

  const segmentVolumeSeries = segments.map((s, i) => ({
    name: `${s.id}_v`,
    type: 'bar' as const,
    stack: 'volumen',
    data: [
      { value: parseFloat(s.volumePercent.toFixed(2)), segmentData: s },
      { value: 0 } // placeholder para columna clientes
    ],
    itemStyle: { color: colors[i] ?? '#64748b' },
    barMaxWidth: 120,
    label: {
      show: s.volumePercent > 5,
      position: 'inside' as const,
      formatter: (p: any) => `${s.id}\n${formatPercent(p.value)}`,
      color: '#fff',
      fontSize: 11,
      fontWeight: 600 as const
    }
  }))

  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...baseTooltipStyle,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const category = params[0]?.axisValue
        const header = category === '% Volumen' ? 'Concentración de Volumen' : 'Distribución de Clientes'
        const rows = params
          .filter(p => p.value > 0)
          .map(p => {
            const s = p.data?.segmentData
            if (!s) return ''
            return `<div style="display:flex;justify-content:space-between;gap:16px;margin:3px 0">
              <span style="color:${p.color};font-weight:600">${s.id}</span>
              <span style="font-weight:600;color:#f1f5f9">${formatPercent(p.value)}</span>
            </div>`
          }).join('')
        return `<div style="padding:4px 0">
          <div style="font-weight:700;margin-bottom:8px;font-size:13px;color:#f1f5f9">${header}</div>
          ${rows}
        </div>`
      }
    },
    grid: { ...baseGrid, bottom: 40, left: 90 },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: CHART_COLORS.base.text, fontSize: 11 },
      splitLine: { lineStyle: { color: CHART_COLORS.base.grid, type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: ['% Volumen', '% Clientes'],
      axisLabel: {
        color: CHART_COLORS.base.textDark,
        fontWeight: 600,
        fontSize: 13
      }
    },
    series: [...segmentVolumeSeries, ...segmentClientSeries]
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
  <div ref="containerRef" class="w-full h-72 md:h-96"></div>
</template>