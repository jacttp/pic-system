<script setup lang="ts">
import { computed } from 'vue'
import type { MetricType } from '../../types/segmentation.types'

interface Props {
  modelValue: MetricType
}

interface Emits {
  (e: 'update:modelValue', value: MetricType): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const options: Array<{ value: MetricType; label: string; icon: string; description: string }> = [
  {
    value: 'VENTA_KG',
    label: 'Volumen (KG)',
    icon: 'fa-weight-hanging',
    description: 'Segmentar por kilogramos vendidos'
  },
  {
    value: 'VENTA_$$',
    label: 'Ventas ($$)',
    icon: 'fa-dollar-sign',
    description: 'Segmentar por pesos facturados'
  }
]

const getOptionClasses = (value: MetricType) => {
  const isActive = selectedValue.value === value
  
  const base = 'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-sm'
  
  if (isActive) {
    return `${base} border-brand-500 bg-brand-50 shadow-sm`
  }
  
  return `${base} border-slate-200 bg-white hover:border-brand-300`
}

const getIconClasses = (value: MetricType) => {
  const isActive = selectedValue.value === value
  return isActive ? 'text-brand-600' : 'text-slate-400'
}
</script>

<template>
  <div class="space-y-2">
    <label class="block text-sm font-semibold text-slate-700">
      Métrica de Segmentación
    </label>
    
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label
        v-for="option in options"
        :key="option.value"
        :class="getOptionClasses(option.value)"
      >
        <input
          type="radio"
          :value="option.value"
          v-model="selectedValue"
          class="sr-only"
        />
        
        <i
          class="fa-solid text-xl w-5"
          :class="[option.icon, getIconClasses(option.value)]"
        ></i>
        
        <div class="flex-1">
          <div class="font-semibold text-sm text-slate-800">
            {{ option.label }}
          </div>
          <div class="text-xs text-slate-500 mt-0.5">
            {{ option.description }}
          </div>
        </div>
      </label>
    </div>
    
    <p class="text-xs text-slate-500 mt-2">
      <i class="fa-solid fa-info-circle mr-1"></i>
      Las metas y estrategias están orientadas a <strong>volumen (KG)</strong>
    </p>
  </div>
</template>