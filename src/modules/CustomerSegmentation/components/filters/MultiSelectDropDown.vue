<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  modelValue: string[]
  options: string[]
  label: string
  placeholder?: string
  icon?: string
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Seleccionar...',
  icon: 'fa-filter',
  disabled: false
})

const emit = defineEmits<Emits>()

const isOpen = ref(false)
const searchQuery = ref('')

const selectedValues = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  
  const query = searchQuery.value.toLowerCase()
  return props.options.filter(option => 
    option.toLowerCase().includes(query)
  )
})

const displayText = computed(() => {
  const count = selectedValues.value.length
  
  if (count === 0) return 'Todos'
  if (count === 1) return selectedValues.value[0]
  return `${count} seleccionados`
})

const toggleOption = (option: string) => {
  const current = [...selectedValues.value]
  const index = current.indexOf(option)
  
  if (index > -1) {
    current.splice(index, 1)
  } else {
    current.push(option)
  }
  
  selectedValues.value = current
}

const toggleAll = () => {
  if (selectedValues.value.length === props.options.length) {
    selectedValues.value = []
  } else {
    selectedValues.value = [...props.options]
  }
}

const isSelected = (option: string) => {
  return selectedValues.value.includes(option)
}

const clear = () => {
  selectedValues.value = []
  searchQuery.value = ''
}
</script>

<template>
  <div class="relative">
    <label class="block text-sm font-medium text-slate-700 mb-2">
      {{ label }}
    </label>
    
    <!-- Trigger Button -->
    <button
      type="button"
      @click="isOpen = !isOpen"
      :disabled="disabled"
      class="w-full px-3 py-2.5 text-left bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <i class="fa-solid text-slate-400" :class="icon"></i>
          <span class="truncate text-slate-700">{{ displayText }}</span>
        </div>
        
        <div class="flex items-center gap-2 ml-2">
          <span
            v-if="selectedValues.length > 0"
            class="bg-brand-100 text-brand-700 text-xs font-semibold px-2 py-0.5 rounded-full"
          >
            {{ selectedValues.length }}
          </span>
          
          <i
            class="fa-solid fa-chevron-down text-slate-400 text-xs transition-transform"
            :class="{ 'rotate-180': isOpen }"
          ></i>
        </div>
      </div>
    </button>
    
    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-hidden"
    >
      <!-- Search Bar -->
      <div class="p-3 border-b border-slate-200">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Buscar..."
          class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          @click.stop
        />
      </div>
      
      <!-- Actions -->
      <div class="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <button
          type="button"
          @click="toggleAll"
          class="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          {{ selectedValues.length === options.length ? 'Deseleccionar' : 'Seleccionar' }} todos
        </button>
        
        <button
          v-if="selectedValues.length > 0"
          type="button"
          @click="clear"
          class="text-xs font-medium text-slate-600 hover:text-slate-700"
        >
          <i class="fa-solid fa-xmark mr-1"></i>
          Limpiar
        </button>
      </div>
      
      <!-- Options List -->
      <div class="max-h-60 overflow-y-auto">
        <label
          v-for="option in filteredOptions"
          :key="option"
          class="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
          @click.stop
        >
          <input
            type="checkbox"
            :checked="isSelected(option)"
            @change="toggleOption(option)"
            class="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-2 focus:ring-brand-500"
          />
          <span class="text-sm text-slate-700">{{ option }}</span>
        </label>
        
        <div
          v-if="filteredOptions.length === 0"
          class="px-3 py-6 text-center text-sm text-slate-500"
        >
          <i class="fa-solid fa-search mb-2 text-2xl text-slate-300"></i>
          <p>No se encontraron resultados</p>
        </div>
      </div>
    </div>
    
    <!-- Backdrop -->
    <div
      v-if="isOpen"
      @click="isOpen = false"
      class="fixed inset-0 z-40"
    ></div>
  </div>
</template>