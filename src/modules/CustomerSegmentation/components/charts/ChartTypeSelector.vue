<script setup lang="ts">
import { computed } from 'vue'
import type { ChartType } from '../../types/segmentation.types'

interface Props {
  modelValue: ChartType
}

interface Emits {
  (e: 'update:modelValue', value: ChartType): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const chartOptions: Array<{
  value: ChartType
  label: string
  icon: string
  description: string
}> = [
  {
    value: 'master',
    label: 'Vista Maestra',
    icon: 'fa-chart-scatter',
    description: 'Scatter + Pareto híbrido'
  },
  {
    value: 'boxplot',
    label: 'Box Plot',
    icon: 'fa-chart-simple',
    description: 'Caja y bigotes'
  },
  {
    value: 'histogram',
    label: 'Histograma',
    icon: 'fa-chart-column',
    description: 'Distribución de clientes'
  },
  {
    value: 'stacked',
    label: 'Barras Apiladas',
    icon: 'fa-chart-bar',
    description: 'Comparativa acumulada'
  },
  {
    value: 'normal',
    label: 'Distribución Normal',
    icon: 'fa-wave-square',
    description: 'Campana de Gauss'
  },
  {
    value: 'pareto',
    label: 'Pareto',
    icon: 'fa-chart-line',
    description: 'Curva 80/20'
  }
]

const selectedValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const getButtonClasses = (value: ChartType) => {
  const isActive = selectedValue.value === value
  const isMaster = value === 'master'
  
  const base = 'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-sm'
  
  if (isActive) {
    if (isMaster) {
      return `${base} border-purple-500 bg-purple-50 shadow-sm`
    }
    return `${base} border-brand-500 bg-brand-50 shadow-sm`
  }
  
  return `${base} border-slate-200 bg-white hover:border-slate-300`
}

const getIconClasses = (value: ChartType) => {
  const isActive = selectedValue.value === value
  const isMaster = value === 'master'
  
  if (isActive) {
    if (isMaster) return 'text-purple-600'
    return 'text-brand-600'
  }
  
  return 'text-slate-400'
}

const getTextClasses = (value: ChartType) => {
  const isActive = selectedValue.value === value
  return isActive ? 'text-slate-800 font-semibold' : 'text-slate-600'
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <label class="block text-sm font-semibold text-slate-700">
        Tipo de Visualización
      </label>
      
      <!-- Badge indicando vista maestra -->
      <span
        v-if="selectedValue === 'master'"
        class="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full"
      >
        <i class="fa-solid fa-star"></i>
        Recomendada
      </span>
    </div>
    
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <button
        v-for="option in chartOptions"
        :key="option.value"
        type="button"
        :class="getButtonClasses(option.value)"
        @click="selectedValue = option.value"
      >
        <i
          class="fa-solid text-2xl transition-colors"
          :class="[option.icon, getIconClasses(option.value)]"
        ></i>
        
        <div class="text-center">
          <div class="text-xs font-medium" :class="getTextClasses(option.value)">
            {{ option.label }}
          </div>
          <div class="text-xs text-slate-500 mt-0.5">
            {{ option.description }}
          </div>
        </div>
      </button>
    </div>
  </div>
</template>