<script setup lang="ts">
import { computed } from 'vue'
import type { SegmentationMode } from '../../types/segmentation.types'

interface Props {
  modelValue: SegmentationMode
}
interface Emits {
  (e: 'update:modelValue', value: SegmentationMode): void
}

const props = defineProps<Props>()
const emit  = defineEmits<Emits>()

const selected = computed({
  get:  () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const options: Array<{
  value:       SegmentationMode
  label:       string
  description: string
  icon:        string
  exampleLabel: string
  exampleDesc:  string
}> = [
  {
    value:        'by_volume',
    label:        'Por volumen',
    description:  'Cada segmento representa la misma fracción del volumen total del período.',
    icon:         'fa-chart-column',
    exampleLabel: 'Ej. deciles',
    exampleDesc:  'D1 = clientes que generan el primer 10% del negocio'
  },
  {
    value:        'by_clients',
    label:        'Por clientes',
    description:  'Cada segmento contiene el mismo número de clientes (cuantiles clásicos).',
    icon:         'fa-users',
    exampleLabel: 'Ej. deciles',
    exampleDesc:  'D1 = el 10% de clientes con mayor volumen individual'
  }
]

const cardClasses = (value: SegmentationMode) => {
  const isActive = selected.value === value
  const base = 'flex-1 min-w-0 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-1'
  return isActive
    ? `${base} border-brand-500 bg-brand-50 shadow-sm`
    : `${base} border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50`
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <label class="block text-sm font-semibold text-slate-700">
        Criterio de segmentación
      </label>
      <!-- Tooltip explicativo -->
      <div class="relative group">
        <i class="fa-solid fa-circle-info text-slate-400 text-xs cursor-help" aria-hidden="true"></i>
        <div
          class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg
                 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-20"
          role="tooltip"
        >
          <p class="font-semibold mb-1">¿Cuál elegir?</p>
          <p class="text-slate-300 leading-relaxed">
            Usa <strong class="text-white">Por volumen</strong> para estrategia comercial: identifica qué clientes generan cada fracción de tu negocio.<br><br>
            Usa <strong class="text-white">Por clientes</strong> para análisis estadístico: distribuciones y comparativas poblacionales.
          </p>
        </div>
      </div>
    </div>

    <div class="flex gap-2 flex-col sm:flex-row">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        :class="cardClasses(opt.value)"
        :aria-pressed="selected === opt.value"
        @click="selected = opt.value"
      >
        <!-- Header de la tarjeta -->
        <div class="flex items-center gap-2 mb-1.5">
          <div
            class="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
            :class="selected === opt.value ? 'bg-brand-100' : 'bg-slate-100'"
          >
            <i
              class="fa-solid text-xs"
              :class="[opt.icon, selected === opt.value ? 'text-brand-600' : 'text-slate-500']"
              aria-hidden="true"
            ></i>
          </div>
          <span
            class="text-sm font-semibold transition-colors"
            :class="selected === opt.value ? 'text-brand-700' : 'text-slate-700'"
          >
            {{ opt.label }}
          </span>
          <!-- Indicador activo -->
          <div
            class="ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
            :class="selected === opt.value
              ? 'border-brand-500 bg-brand-500'
              : 'border-slate-300 bg-white'"
          >
            <div
              v-if="selected === opt.value"
              class="w-1.5 h-1.5 rounded-full bg-white"
            ></div>
          </div>
        </div>

        <!-- Descripción -->
        <p class="text-xs text-slate-500 leading-relaxed mb-1.5">
          {{ opt.description }}
        </p>

        <!-- Ejemplo visual -->
        <div
          class="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] transition-colors"
          :class="selected === opt.value
            ? 'bg-brand-100/60 text-brand-700'
            : 'bg-slate-100 text-slate-500'"
        >
          <i class="fa-solid fa-circle-info text-[9px]" aria-hidden="true"></i>
          <span class="font-medium">{{ opt.exampleLabel }}:</span>
          <span>{{ opt.exampleDesc }}</span>
        </div>
      </button>
    </div>
  </div>
</template>