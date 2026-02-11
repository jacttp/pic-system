<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PeriodType } from '../../types/segmentation.types'

interface Props {
  years: string[]
  monthStart: number
  monthEnd: number
  availableYears: string[]
}

interface Emits {
  (e: 'update:years', value: string[]): void
  (e: 'update:monthStart', value: number): void
  (e: 'update:monthEnd', value: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const periodType = ref<PeriodType>('annual')

const meses = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
]

const selectedYears = computed({
  get: () => props.years,
  set: (value) => emit('update:years', value)
})

const selectedMonthStart = computed({
  get: () => props.monthStart,
  set: (value) => emit('update:monthStart', value)
})

const selectedMonthEnd = computed({
  get: () => props.monthEnd,
  set: (value) => emit('update:monthEnd', value)
})

// Auto-ajustar meses cuando cambia tipo de período
watch(periodType, (newType) => {
  if (newType === 'annual') {
    selectedMonthStart.value = 1
    selectedMonthEnd.value = 12
  }
})

// Asegurar que mes final >= mes inicial
watch(selectedMonthStart, (newStart) => {
  if (newStart > selectedMonthEnd.value) {
    selectedMonthEnd.value = newStart
  }
})

const toggleYear = (year: string) => {
  const current = [...selectedYears.value]
  const index = current.indexOf(year)
  
  if (index > -1) {
    current.splice(index, 1)
  } else {
    current.push(year)
  }
  
  selectedYears.value = current.sort().reverse()
}

const isYearSelected = (year: string) => {
  return selectedYears.value.includes(year)
}
</script>

<template>
  <div class="space-y-4">
    <label class="block text-sm font-semibold text-slate-700">
      Período de Análisis
    </label>
    
    <!-- Tipo de Período -->
    <div class="flex gap-2">
      <button
        type="button"
        @click="periodType = 'annual'"
        :class="[
          'flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all',
          periodType === 'annual'
            ? 'bg-brand-600 text-white shadow-sm'
            : 'bg-white text-slate-700 border border-slate-200 hover:border-brand-300'
        ]"
      >
        <i class="fa-solid fa-calendar-alt mr-2"></i>
        Anual
      </button>
      
      <button
        type="button"
        @click="periodType = 'monthly'"
        :class="[
          'flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all',
          periodType === 'monthly'
            ? 'bg-brand-600 text-white shadow-sm'
            : 'bg-white text-slate-700 border border-slate-200 hover:border-brand-300'
        ]"
      >
        <i class="fa-solid fa-calendar-days mr-2"></i>
        Mensual
      </button>
    </div>
    
    <!-- Selección de Años -->
    <div>
      <label class="block text-xs font-medium text-slate-600 mb-2">
        Año(s)
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="year in availableYears"
          :key="year"
          type="button"
          @click="toggleYear(year)"
          :class="[
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            isYearSelected(year)
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          ]"
        >
          {{ year }}
        </button>
      </div>
    </div>
    
    <!-- Rango de Meses (solo si es mensual) -->
    <div v-if="periodType === 'monthly'" class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-xs font-medium text-slate-600 mb-2">
          Mes Inicial
        </label>
        <select
          v-model.number="selectedMonthStart"
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        >
          <option
            v-for="mes in meses"
            :key="mes.value"
            :value="mes.value"
          >
            {{ mes.label }}
          </option>
        </select>
      </div>
      
      <div>
        <label class="block text-xs font-medium text-slate-600 mb-2">
          Mes Final
        </label>
        <select
          v-model.number="selectedMonthEnd"
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        >
          <option
            v-for="mes in meses"
            :key="mes.value"
            :value="mes.value"
            :disabled="mes.value < selectedMonthStart"
          >
            {{ mes.label }}
          </option>
        </select>
      </div>
    </div>
    
    <!-- Resumen del Período Seleccionado -->
    <div class="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200">
      <i class="fa-solid fa-calendar-check mr-1.5 text-brand-600"></i>
      <strong>Período:</strong>
      <span v-if="selectedYears.length === 0" class="text-orange-600 ml-1">
        Selecciona al menos un año
      </span>
      <span v-else>
        {{ selectedYears.join(', ') }}
        <span v-if="periodType === 'monthly'">
          ({{ meses[selectedMonthStart - 1].label }} - {{ meses[selectedMonthEnd - 1].label }})
        </span>
        <span v-else>
          (Año completo)
        </span>
      </span>
    </div>
  </div>
</template>