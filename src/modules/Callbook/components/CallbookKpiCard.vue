<!-- src/modules/Callbook/components/CallbookKpiCard.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  title: string
  value: number | string
  icon: string
  tooltip: string
  loading?: boolean
  variant?: 'default' | 'danger' | 'success' | 'warning'
  showTrend?: boolean
  formatter?: (v: number) => string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  loading: false,
  showTrend: false,
})

// ── Fix: ref() normal en lugar de $ref ────────────────────────────────────
const showTooltip = ref(false)

const numericValue = computed(() =>
  typeof props.value === 'number' ? props.value : parseFloat(String(props.value))
)

const displayValue = computed(() => {
  if (props.loading) return '—'
  if (props.formatter && typeof props.value === 'number') return props.formatter(props.value)
  return typeof props.value === 'number'
    ? new Intl.NumberFormat('es-MX').format(props.value)
    : props.value
})

const variantClasses = computed(() => {
  if (props.variant === 'danger' && numericValue.value > 0)
    return {
      border: 'border-destructive/40',
      icon:   'bg-red-50 text-destructive',
      value:  'text-destructive',
    }
  if (props.variant === 'success' || (props.showTrend && numericValue.value > 0))
    return {
      border: 'border-emerald-200',
      icon:   'bg-emerald-50 text-emerald-600',
      value:  'text-emerald-600',
    }
  if (props.variant === 'warning' || (props.showTrend && numericValue.value < 0))
    return {
      border: 'border-rose-200',
      icon:   'bg-rose-50 text-rose-500',
      value:  'text-rose-500',
    }
  return {
    border: 'border-slate-200',
    icon:   'bg-brand-50 text-brand-600',
    value:  'text-slate-800',
  }
})

const trendIcon = computed(() => {
  if (!props.showTrend) return null
  if (numericValue.value > 0) return 'fa-solid fa-arrow-trend-up'
  if (numericValue.value < 0) return 'fa-solid fa-arrow-trend-down'
  return 'fa-solid fa-minus'
})
</script>

<template>
  <div
    class="relative bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-3 transition-all hover:shadow-md"
    :class="variantClasses.border"
  >
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div class="p-2 rounded-lg" :class="variantClasses.icon">
        <i :class="icon" class="text-base"></i>
      </div>

      <!-- Tooltip -->
      <div class="relative">
        <button
          @mouseenter="showTooltip = true"
          @mouseleave="showTooltip = false"
          class="text-slate-300 hover:text-slate-500 transition-colors focus:outline-none"
        >
          <i class="fa-solid fa-circle-info text-sm"></i>
        </button>
        <Transition name="fade">
          <div
            v-if="showTooltip"
            class="absolute right-0 top-6 z-20 w-56 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg leading-relaxed"
          >
            {{ tooltip }}
          </div>
        </Transition>
      </div>
    </div>

    <!-- Valor -->
    <div class="flex items-end gap-2">
      <div v-if="loading" class="h-8 w-24 bg-slate-100 rounded animate-pulse"></div>
      <template v-else>
        <span class="text-2xl font-bold tracking-tight" :class="variantClasses.value">
          {{ displayValue }}
        </span>
        <i v-if="trendIcon" :class="[trendIcon, variantClasses.value]" class="text-base mb-0.5"></i>
      </template>
    </div>

    <!-- Título -->
    <p class="text-xs font-medium text-slate-500 leading-tight">{{ title }}</p>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s, transform 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>