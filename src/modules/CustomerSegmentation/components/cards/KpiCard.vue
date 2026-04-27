<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCounterAnimation } from '../../composables/useCounterAnimation'

interface Trend {
  value: number
  label: string
  isPositive: boolean
}

interface Props {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  iconBg?: string   // clase bg completa, ej: 'bg-blue-100'
  iconColor?: string // clase text completa, ej: 'text-blue-600'
  trend?: Trend
  loading?: boolean
  /** Si el valor es numérico se puede animar el contador */
  animate?: boolean
  /** Retraso de entrada en ms para efecto stagger */
  delay?: number
}

const props = withDefaults(defineProps<Props>(), {
  iconBg: 'bg-brand-100',
  iconColor: 'text-brand-600',
  loading: false,
  animate: false,
  delay: 0
})

// ── Contador animado ──────────────────────────────────────────
const numericValue = computed(() =>
  typeof props.value === 'number' ? props.value : parseFloat(String(props.value).replace(/[^0-9.-]/g, ''))
)

const { displayed } = useCounterAnimation(
  () => (props.animate && !isNaN(numericValue.value) ? numericValue.value : 0)
)

const displayValue = computed(() => {
  if (!props.animate || isNaN(numericValue.value)) return props.value
  // Re-aplicar prefijos/sufijos del string original
  const original = String(props.value)
  const numStr = String(displayed.value)
  const prefix = original.match(/^[^0-9]*/)?.[0] ?? ''
  const suffix = original.match(/[^0-9.]+$/)?.[0] ?? ''
  return `${prefix}${numStr}${suffix}`
})

// ── Animación de entrada ──────────────────────────────────────
const visible = ref(false)

onMounted(() => {
  setTimeout(() => { visible.value = true }, props.delay)
})

// ── Trend helpers ──────────────────────────────────────────────
const trendClasses = computed(() =>
  props.trend?.isPositive
    ? 'text-green-700 bg-green-50 border-green-200'
    : 'text-red-700 bg-red-50 border-red-200'
)

const trendIcon = computed(() =>
  props.trend?.isPositive ? 'fa-trending-up' : 'fa-trending-down'
)
</script>

<template>
  <div
    class="bg-white rounded-xl border border-slate-200 p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
    :class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'"
    :style="{ transitionDelay: `${delay}ms` }"
    role="region"
    :aria-label="title"
  >
    <!-- Header: título + icono -->
    <div class="flex items-start justify-between mb-3">
      <p class="text-sm font-medium text-slate-500 leading-snug">{{ title }}</p>
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2"
        :class="iconBg"
        aria-hidden="true"
      >
        <i class="fa-solid text-lg" :class="[icon, iconColor]"></i>
      </div>
    </div>

    <!-- Skeleton de carga -->
    <div v-if="loading" class="space-y-2" aria-busy="true" aria-label="Cargando...">
      <div class="h-8 bg-slate-200 rounded-lg animate-pulse"></div>
      <div class="h-4 bg-slate-100 rounded w-2/3 animate-pulse"></div>
    </div>

    <!-- Valor + subtítulo -->
    <div v-else>
      <p
        class="text-2xl md:text-3xl font-bold text-slate-800 mb-1 tabular-nums"
        :aria-label="`${title}: ${value}`"
      >
        {{ displayValue }}
      </p>
      <p v-if="subtitle" class="text-xs md:text-sm text-slate-500 leading-snug">
        {{ subtitle }}
      </p>
    </div>

    <!-- Trend -->
    <div
      v-if="trend && !loading"
      class="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2"
    >
      <span
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
        :class="trendClasses"
      >
        <i class="fa-solid text-[10px]" :class="trendIcon" aria-hidden="true"></i>
        {{ Math.abs(trend.value) }}%
      </span>
      <span class="text-xs text-slate-500">{{ trend.label }}</span>
    </div>
  </div>
</template>