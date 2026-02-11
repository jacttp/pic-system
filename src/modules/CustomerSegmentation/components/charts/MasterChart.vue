<script setup lang="ts">
import { ref, watch, computed } from 'vue'
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

const colors = computed(() => getChartColors(store.currentGroupType))

const buildOption = () => {
  const segments = store.segments
  if (!segments.length) return {}

  // Curva de Lorenz: [%clientes acum, %volumen acum]
  const lorenzCurve: [number, number][] = [[0, 0]]
  segments.forEach(s => lorenzCurve.push([s.clientPercentAccum, s.volumePercentAccum]))

  // Normalizar tamaño burbuja por ticket promedio
  const maxTicket = Math.max(...segments.map(s => s.avgTicket))

  const scatterData = segments.map((s, i) => ({
    value: [s.clientPercentAccum, s.volumePercentAccum],
    name: s.id,
    segmentData: s,
    itemStyle: { color: colors.value[i] ?? '#64748b' },
    symbolSize: Math.max(24, Math.min(72, (s.avgTicket / maxTicket) * 72))
  }))

  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...baseTooltipStyle,
      trigger: 'item',
      formatter: (params: any) => {
        if (!params.data?.segmentData) return ''
        const s = params.data.segmentData
        return `
          <div style="min-width:220px;padding:4px 0">
            <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#f1f5f9">${s.id} — ${s.label}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 14px;font-size:12px">
              <span style="color:#94a3b8">Clientes</span>
              <span style="font-weight:600">${formatNumber(s.clientCount, 0)} (${formatPercent(s.clientPercent)})</span>
              <span style="color:#94a3b8">% Vol. Acum.</span>
              <span style="font-weight:600">${formatPercent(s.volumePercentAccum)}</span>
              <span style="color:#94a3b8">Volumen</span>
              <span style="font-weight:600">${formatNumber(s.volume, 0)} ${s.range.unit}</span>
              <span style="color:#94a3b8">Ticket Prom.</span>
              <span style="font-weight:600">${formatNumber(s.avgTicket, 0)} ${s.range.unit}</span>
            </div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #334155;font-size:11px;color:#94a3b8">
              Clic para ver clientes del segmento
            </div>
          </div>`
      }
    },
    legend: {
      bottom: 0,
      data: ['Igualdad Perfecta', 'Concentración Real'],
      textStyle: { color: CHART_COLORS.base.text, fontSize: 11 }
    },
    grid: { ...baseGrid, bottom: 70 },
    xAxis: {
      type: 'value',
      name: '% Clientes Acumulado',
      nameLocation: 'middle',
      nameGap: 38,
      min: 0, max: 100,
      axisLabel: { formatter: '{value}%', color: CHART_COLORS.base.text, fontSize: 11 },
      splitLine: { lineStyle: { color: CHART_COLORS.base.grid, type: 'dashed' } },
      nameTextStyle: { color: CHART_COLORS.base.text, fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      name: '% Volumen Acumulado',
      nameLocation: 'middle',
      nameGap: 58,
      min: 0, max: 100,
      axisLabel: { formatter: '{value}%', color: CHART_COLORS.base.text, fontSize: 11 },
      splitLine: { lineStyle: { color: CHART_COLORS.base.grid, type: 'dashed' } },
      nameTextStyle: { color: CHART_COLORS.base.text, fontSize: 12 }
    },
    series: [
      {
        name: 'Concentración Real',
        type: 'line',
        data: lorenzCurve,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#7c3aed', width: 3 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(124,58,237,0.22)' },
              { offset: 1, color: 'rgba(124,58,237,0.04)' }
            ]
          }
        },
        z: 2
      },
      {
        name: 'Igualdad Perfecta',
        type: 'line',
        data: [[0, 0], [100, 100]],
        symbol: 'none',
        lineStyle: { color: '#94a3b8', width: 2, type: 'dashed' },
        z: 1
      },
      {
        name: 'Segmentos',
        type: 'scatter',
        data: scatterData,
        z: 3,
        emphasis: {
          scale: 1.25,
          itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.35)' }
        },
        label: {
          show: true,
          formatter: (p: any) => p.data.name,
          position: 'inside',
          color: '#fff',
          fontWeight: 700,
          fontSize: 11
        }
      }
    ]
  }
}

watch(isReady, (ready) => {
  if (ready) {
    on('click', (params: any) => {
      if (params.seriesName === 'Segmentos' && params.data?.name) {
        emit('segment-click', params.data.name)
      }
    })
    if (store.hasData) setOption(buildOption(), true)
  }
})

watch(() => store.segments, () => {
  if (isReady.value && store.hasData) setOption(buildOption(), true)
}, { deep: true })
</script>

<template>
  <div ref="containerRef" class="w-full h-96 md:h-[480px]"></div>
</template>