<!-- src/modules/Cannibalization/components/charts/SelloutChart.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import BaseChart from '@/modules/Shared/components/charts/BaseChart.vue'
import type { ChartData, ChartOptions } from 'chart.js'
import type { SelloutSkuItem, SelloutMode } from '../../types/cannibalizationTypes'

const props = defineProps<{
  items: SelloutSkuItem[]
  mode: SelloutMode
}>()

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// Agrega todos los ítems en un único vector sumado
function sumVector(items: SelloutSkuItem[], key: keyof SelloutSkuItem): number[] {
  return items.reduce((acc, item) => {
    const vec = item[key] as number[] | undefined
    if (!vec) return acc
    return acc.map((v, i) => v + (vec[i] ?? 0))
  }, new Array(12).fill(0))
}

const chartData = computed<ChartData<'bar' | 'line'>>(() => {
  const sellout = sumVector(props.items, 'selloutVector')

  if (props.mode === 'sell') {
    const venta = sumVector(props.items, 'ventaVector')
    return {
      labels: MONTHS,
      datasets: [
        { type: 'bar',  label: 'Sellout',       data: sellout, backgroundColor: 'rgba(124,58,237,0.7)' },
        { type: 'line', label: 'Venta Interna', data: venta,   borderColor: '#10b981', tension: 0.3, fill: false, pointRadius: 3 },
      ],
    }
  }

  if (props.mode === 'yoy') {
    const prev = sumVector(props.items, 'prevSelloutVector')
    return {
      labels: MONTHS,
      datasets: [
        { type: 'bar', label: `Sellout Actual`, data: sellout, backgroundColor: 'rgba(124,58,237,0.7)' },
        { type: 'bar', label: `Sellout Anterior`, data: prev,  backgroundColor: 'rgba(148,163,184,0.5)' },
      ],
    }
  }

  // mode === 'sku' — barras por nombre (top 10 por total)
  const top10 = [...props.items]
    .sort((a, b) => b.selloutVector.reduce((s, v) => s + v, 0) - a.selloutVector.reduce((s, v) => s + v, 0))
    .slice(0, 10)

  return {
    labels: MONTHS,
    datasets: top10.map((item, i) => ({
      type: 'line' as const,
      label: item.name,
      data: item.selloutVector,
      borderColor: `hsl(${260 + i * 18}, 60%, 55%)`,
      tension: 0.3,
      fill: false,
      pointRadius: 2,
    })),
  }
})

const chartOptions = computed<ChartOptions>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
  scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } },
}))
</script>

<template>
  <div class="h-full w-full flex flex-col min-h-0">
    <div class="flex-1 min-h-0 relative">
      <BaseChart :type="mode === 'sku' ? 'line' : 'bar'" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>