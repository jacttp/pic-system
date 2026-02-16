<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useSegmentationStore } from '../../stores/segmentationStore'
import { useFormatters } from '../../composables/useFormatters'
import KPICard from './KpiCard.vue'

const store = useSegmentationStore()
const { formatCompact, formatPercent, formatGini } = useFormatters()

// Key para forzar re-mount de las cards al cambiar datos (re-dispara animaciones)
const animKey = ref(0)
watch(() => store.data, () => { animKey.value++ })

// ── Valores formateados ───────────────────────────────────────
const totalClients = computed(() =>
  store.hasData ? store.totalClients : 0
)

const totalVolumeLabel = computed(() => {
  if (!store.hasData) return '-'
  return `${formatCompact(store.totalVolume)} ${store.metricUnit}`
})

const avgTicket = computed(() =>
  store.hasData && store.totalClients > 0
    ? Math.round(store.totalVolume / store.totalClients)
    : 0
)

const avgTicketLabel = computed(() =>
  store.hasData ? `${formatCompact(avgTicket.value)} ${store.metricUnit}` : '-'
)

const paretoLabel = computed(() => {
  if (!store.hasData || !store.pareto) return '-'
  return `${formatPercent(store.pareto.topClientsPercent, 1)} / ${formatPercent(store.pareto.topVolumePercent, 1)}`
})

const giniLabel = computed(() =>
  store.hasData && store.pareto ? formatGini(store.pareto.giniIndex) : '-'
)

const giniLevel = computed(() => {
  if (!store.hasData || !store.pareto) return { label: '-', iconColor: 'text-slate-400', iconBg: 'bg-slate-100' }
  const g = store.pareto.giniIndex
  if (g < 0.3) return { label: 'Baja concentración', iconColor: 'text-green-600', iconBg: 'bg-green-100' }
  if (g < 0.5) return { label: 'Concentración moderada', iconColor: 'text-yellow-600', iconBg: 'bg-yellow-100' }
  if (g < 0.7) return { label: 'Alta concentración', iconColor: 'text-orange-600', iconBg: 'bg-orange-100' }
  return { label: 'Concentración muy alta', iconColor: 'text-red-600', iconBg: 'bg-red-100' }
})

// Configuración de las 5 tarjetas con stagger (delay incremental)
const cards = computed(() => [
  {
    title: 'Total Clientes',
    value: store.hasData ? formatCompact(totalClients.value) : '-',
    subtitle: 'clientes segmentados',
    icon: 'fa-users',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    delay: 0
  },
  {
    title: 'Volumen Total',
    value: totalVolumeLabel.value,
    subtitle: store.metricLabel,
    icon: 'fa-weight-hanging',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    delay: 80
  },
  {
    title: 'Ticket Promedio',
    value: avgTicketLabel.value,
    subtitle: 'promedio por cliente',
    icon: 'fa-calculator',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    delay: 160
  },
  {
    title: 'Índice Pareto',
    value: paretoLabel.value,
    subtitle: '% clientes / % volumen',
    icon: 'fa-chart-pie',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    delay: 240
  },
  {
    title: 'Índice Gini',
    value: giniLabel.value,
    subtitle: giniLevel.value.label,
    icon: 'fa-scale-balanced',
    iconBg: giniLevel.value.iconBg,
    iconColor: giniLevel.value.iconColor,
    delay: 320
  }
])
</script>

<template>
  <section aria-label="Indicadores de segmentación">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-4">
      <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center" aria-hidden="true">
        <i class="fa-solid fa-chart-line text-blue-600"></i>
      </div>
      <div>
        <h3 class="font-bold text-slate-800">Indicadores Principales</h3>
        <p class="text-xs text-slate-500">Resumen ejecutivo de la segmentación</p>
      </div>
    </div>

    <!-- Grid de tarjetas con stagger -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      <KPICard
        v-for="(card, i) in cards"
        :key="`${animKey}-${i}`"
        v-bind="card"
        :loading="store.isLoading"
      />
    </div>

    <!-- Análisis de concentración (Pareto insight) -->
    <Transition name="fade-up">
      <div
        v-if="store.hasData && store.pareto"
        class="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl"
        role="note"
        aria-label="Análisis de concentración"
      >
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <i class="fa-solid fa-lightbulb text-orange-600"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-orange-900 mb-1 text-sm">Análisis de Concentración</h4>
            <p class="text-xs md:text-sm text-orange-800 leading-relaxed">
              El
              <strong>{{ formatPercent(store.pareto.topClientsPercent, 1) }}</strong>
              de tus clientes
              (<strong>{{ formatCompact(store.pareto.topClientsCount) }}</strong>)
              generan el
              <strong>{{ formatPercent(store.pareto.topVolumePercent, 1) }}</strong>
              del volumen total. El índice Gini de
              <strong>{{ giniLabel }}</strong>
              indica
              <span :class="giniLevel.iconColor" class="font-semibold">
                {{ giniLevel.label.toLowerCase() }}
              </span>
              en la distribución de ventas.
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Estado vacío -->
    <Transition name="fade">
      <div
        v-if="!store.hasData && !store.isLoading"
        class="mt-4 p-8 text-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl"
        role="status"
      >
        <i class="fa-solid fa-chart-simple text-4xl text-slate-300 mb-3 block" aria-hidden="true"></i>
        <p class="text-slate-600 font-medium">Sin indicadores disponibles</p>
        <p class="text-sm text-slate-500 mt-1">Aplica filtros y ejecuta el análisis</p>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

.fade-up-enter-active { transition: all 0.35s ease; }
.fade-up-enter-from { opacity: 0; transform: translateY(8px); }
</style>