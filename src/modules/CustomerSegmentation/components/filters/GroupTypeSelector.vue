<script setup lang="ts">
import { computed } from 'vue'
import type { GroupType } from '../../types/segmentation.types'

interface Props {
  modelValue: GroupType
}

interface Emits {
  (e: 'update:modelValue', value: GroupType): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const options: Array<{ value: GroupType; label: string; count: number }> = [
  { value: 'quartiles', label: 'Cuartiles', count: 4 },
  { value: 'quintiles', label: 'Quintiles', count: 5 },
  { value: 'deciles', label: 'Deciles', count: 10 },
  { value: 'percentiles', label: 'Percentiles', count: 100 }
]

const selectedValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const getButtonClasses = (value: GroupType) => {
  const isActive = selectedValue.value === value
  
  const base = 'px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1'
  
  if (isActive) {
    return `${base} bg-brand-600 text-white shadow-sm`
  }
  
  return `${base} bg-white text-slate-700 border border-slate-200 hover:border-brand-300 hover:bg-brand-50`
}
</script>

<template>
  <div class="space-y-2">
    <label class="block text-sm font-semibold text-slate-700">
      Tipo de Agrupación
    </label>
    
    <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :class="getButtonClasses(option.value)"
        @click="selectedValue = option.value"
      >
        <span class="block">{{ option.label }}</span>
        <span class="text-xs opacity-75">({{ option.count }} grupos)</span>
      </button>
    </div>
  </div>
</template>