<script setup lang="ts">
// src/modules/SellOut/components/SellOutCoverageChart.vue
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Chart from 'chart.js/auto'
import { useSellOutStore } from '../stores/selloutStore'

const store = useSellOutStore()
const { kpis, isLoadingDashboard } = storeToRefs(store)

// ─── Chart: Doughnut de cobertura ────────────────────────────────────────────

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const coverageData = computed(() => {
  if (!kpis.value) return null
  const { coberturaPct, tiendasActivas, quiebres } = kpis.value
  const conPz = Math.round(tiendasActivas * (coberturaPct / 100))
  const sinPz = quiebres

  return {
    labels: ['Con PZ > 0', 'Quiebres (PZ = 0)'],
    datasets: [{
      data: [conPz, sinPz],
      backgroundColor: ['#10b981', '#f43f5e'],
      borderColor: ['#ffffff', '#ffffff'],
      borderWidth: 3,
      hoverOffset: 6,
    }],
  }
})

const centerText = computed(() => {
  if (!kpis.value) return ''
  return kpis.value.coberturaPct.toFixed(1) + '%'
})

const coverageStatus = computed(() => {
  if (!kpis.value) return { label: '', color: '' }
  const pct = kpis.value.coberturaPct
  if (pct >= 80) return { label: 'Cobertura óptima', color: 'text-emerald-600' }
  if (pct >= 60) return { label: 'Cobertura media', color: 'text-amber-600' }
  return { label: 'Cobertura baja', color: 'text-rose-600' }
})

function buildChart() {
  if (!canvasRef.value || !coverageData.value) return
  if (chartInstance) chartInstance.destroy()

  chartInstance = new Chart(canvasRef.value, {
    type: 'doughnut',
    data: coverageData.value,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 }, padding: 16 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed} tiendas`,
          },
        },
      },
    },
  })
}

function updateChart() {
  if (!chartInstance || !coverageData.value) { buildChart(); return }
  chartInstance.data = coverageData.value
  chartInstance.update('active')
}

onMounted(() => { if (kpis.value) buildChart() })
onUnmounted(() => { chartInstance?.destroy() })
watch(kpis, () => updateChart(), { deep: true })
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">

    <!-- Header -->
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
        <i class="fa-solid fa-store text-xs text-sky-600" />
      </div>
      <div>
        <h3 class="text-sm font-semibold text-slate-700">Cobertura de tiendas</h3>
        <p class="text-[10px] text-slate-400">PZ en callbook vs quiebres</p>
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="isLoadingDashboard" class="h-52 bg-slate-50 rounded-lg animate-pulse" />

    <!-- Doughnut + texto central -->
    <div v-else-if="kpis" class="relative h-52">
      <canvas ref="canvasRef" />

      <!-- Texto central flotante -->
      <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style="padding-bottom: 32px">
        <span class="text-2xl font-bold text-slate-800 tabular-nums">{{ centerText }}</span>
        <span class="text-[11px] font-medium" :class="coverageStatus.color">
          {{ coverageStatus.label }}
        </span>
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else
      class="h-52 flex items-center justify-center text-slate-400 text-sm gap-2 border border-dashed border-slate-200 rounded-lg"
    >
      <i class="fa-solid fa-store" />
      <span>Sin datos de cobertura</span>
    </div>

    <!-- Stats row -->
    <div v-if="kpis && !isLoadingDashboard" class="grid grid-cols-3 divide-x divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
      <div class="px-3 py-2 text-center">
        <p class="text-xs font-bold text-slate-700 tabular-nums">
          {{ new Intl.NumberFormat('es-MX').format(kpis.tiendasActivas) }}
        </p>
        <p class="text-[10px] text-slate-400">Total tiendas</p>
      </div>
      <div class="px-3 py-2 text-center">
        <p class="text-xs font-bold text-emerald-600 tabular-nums">
          {{ new Intl.NumberFormat('es-MX').format(Math.round(kpis.tiendasActivas * kpis.coberturaPct / 100)) }}
        </p>
        <p class="text-[10px] text-slate-400">Con PZ</p>
      </div>
      <div class="px-3 py-2 text-center">
        <p class="text-xs font-bold tabular-nums" :class="kpis.quiebres > 0 ? 'text-rose-600' : 'text-slate-400'">
          {{ new Intl.NumberFormat('es-MX').format(kpis.quiebres) }}
        </p>
        <p class="text-[10px] text-slate-400">Quiebres</p>
      </div>
    </div>

  </div>
</template>