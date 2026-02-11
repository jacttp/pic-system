<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSegmentationStore } from '../../stores/segmentationStore'
import { useEChart, CHART_COLORS, baseTooltipStyle, baseGrid } from '../../composables/useEChart'
import { useFormatters } from '../../composables/useFormatters'

const store = useSegmentationStore()
const { formatNumber, formatPercent } = useFormatters()

const containerRef = ref<HTMLDivElement | null>(null)
const { isReady, setOption } = useEChart(containerRef)

// Función densidad de probabilidad Normal
const normalPDF = (x: number, mean: number, std: number) => {
  const exponent = -0.5 * Math.pow((x - mean) / std, 2)
  return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(exponent)
}

const buildOption = () => {
  const segments = store.segments
  const stats = store.statistics
  if (!segments.length || !stats) return {}

  const { mean, stdDev, min, max } = stats
  const unit = store.metricUnit

  // Generar curva normal teórica
  const steps = 80
  const range = max - min
  const xMin = Math.max(0, min - range * 0.1)
  const xMax = max + range * 0.1
  const step = (xMax - xMin) / steps

  const normalCurve: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * step
    const y = normalPDF(x, mean, stdDev)
    normalCurve.push([x, y])
  }

  // Histograma real (distribución de clientes por segmento)
  // Normalizado a densidad para que sea comparable con la curva
  const histData = segments.map(s => {
    const binWidth = s.range.max - s.range.min
    const density = binWidth > 0 ? (s.clientPercent / 100) / binWidth : 0
    return {
      value: [s.range.min + (s.range.max - s.range.min) / 2, density],
      segmentData: s,
      barWidth: binWidth
    }
  })

  // Líneas verticales: media, media ± 1σ, media ± 2σ
  const markLines = [
    { xAxis: mean, name: 'Media', lineStyle: { color: '#7c3aed', type: 'solid', width: 2 } },
    { xAxis: mean - stdDev, name: '-1σ', lineStyle: { color: '#94a3b8', type: 'dashed' } },
    { xAxis: mean + stdDev, name: '+1σ', lineStyle: { color: '#94a3b8', type: 'dashed' } },
    { xAxis: mean - 2 * stdDev, name: '-2σ', lineStyle: { color: '#cbd5e1', type: 'dashed' } },
    { xAxis: mean + 2 * stdDev, name: '+2σ', lineStyle: { color: '#cbd5e1', type: 'dashed' } }
  ]

  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...baseTooltipStyle,
      trigger: 'item',
      formatter: (params: any) => {
        if (params.seriesName === 'Distribución Real') {
          const s = params.data?.segmentData
          if (!s) return ''
          return `
            <div style="padding:4px 0">
              <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#f1f5f9">${s.id} — ${s.label}</div>
              <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px">
                <span style="color:#94a3b8">Rango</span>
                <span style="font-weight:600">${formatNumber(s.range.min, 0)} - ${formatNumber(s.range.max, 0)} ${unit}</span>
                <span style="color:#94a3b8">Clientes</span>
                <span style="font-weight:600">${formatNumber(s.clientCount, 0)} (${formatPercent(s.clientPercent)})</span>
                <span style="color:#94a3b8">Ticket Prom.</span>
                <span style="font-weight:600">${formatNumber(s.avgTicket, 0)} ${unit}</span>
              </div>
            </div>`
        }
        return ''
      }
    },
    legend: {
      bottom: 0,
      data: ['Curva Normal Teórica', 'Distribución Real'],
      textStyle: { color: CHART_COLORS.base.text, fontSize: 11 }
    },
    grid: { ...baseGrid, bottom: 70 },
    xAxis: {
      type: 'value',
      name: unit,
      nameLocation: 'middle',
      nameGap: 35,
      axisLabel: { formatter: (v: number) => formatNumber(v, 0), color: CHART_COLORS.base.text, fontSize: 10 },
      splitLine: { lineStyle: { color: CHART_COLORS.base.grid, type: 'dashed' } },
      nameTextStyle: { color: CHART_COLORS.base.text, fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      name: 'Densidad',
      nameTextStyle: { color: CHART_COLORS.base.text, fontSize: 11 },
      axisLabel: { color: CHART_COLORS.base.text, fontSize: 10 },
      splitLine: { lineStyle: { color: CHART_COLORS.base.grid, type: 'dashed' } }
    },
    series: [
      {
        name: 'Curva Normal Teórica',
        type: 'line',
        data: normalCurve,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#7c3aed', width: 3 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(124,58,237,0.18)' },
              { offset: 1, color: 'rgba(124,58,237,0.02)' }
            ]
          }
        },
        markLine: {
          silent: false,
          data: markLines.map(m => ({
            xAxis: m.xAxis,
            name: m.name,
            lineStyle: m.lineStyle,
            label: { show: true, formatter: m.name, color: CHART_COLORS.base.text, fontSize: 10 }
          }))
        }
      },
      {
        name: 'Distribución Real',
        type: 'bar',
        data: histData,
        itemStyle: { color: 'rgba(14,165,233,0.5)', borderColor: '#0ea5e9', borderWidth: 1.5 },
        barGap: '0%',
        barCategoryGap: '0%'
      }
    ]
  }
}

watch(isReady, (ready) => {
  if (ready && store.hasData) setOption(buildOption(), true)
})

watch([() => store.segments, () => store.statistics], () => {
  if (isReady.value && store.hasData) setOption(buildOption(), true)
}, { deep: true })
</script>

<template>
  <div ref="containerRef" class="w-full h-96 md:h-[420px]"></div>
</template>