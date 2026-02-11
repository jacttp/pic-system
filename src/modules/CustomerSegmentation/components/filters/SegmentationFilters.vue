<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useSegmentationStore } from '../../stores/segmentationStore'
import { useFilterOptions } from '../../composables/useFilterOptions'
import GroupTypeSelector from './GroupTypeSelector.vue'
import MetricSelector from './MetricSelector.vue'
import PeriodSelector from './PeriodSelector.vue'
import MultiSelectDropdown from './MultiSelectDropDown.vue'
import type { GroupType, MetricType, SegmentationFilters } from '../../types/segmentation.types'

const store = useSegmentationStore()
const filterOptions = useFilterOptions()

const isCollapsed = ref(false)

// Estado local de filtros
const localGroupType = ref<GroupType>('quintiles')
const localMetric = ref<MetricType>('VENTA_KG')
const localYears = ref<string[]>([])
const localMonthStart = ref(1)
const localMonthEnd = ref(12)
const localCanal = ref<string[]>([])
const localGerencia = ref<string[]>([])
const localJefatura = ref<string[]>([])
const localRuta = ref<string[]>([])
const localMarca = ref<string[]>([])
const localGrupo = ref<string[]>([])

// Cargar opciones estáticas al montar
onMounted(async () => {
  await filterOptions.loadStaticOptions()
  
  // Establecer años por defecto (último disponible)
  if (filterOptions.staticOptions.anios.length > 0) {
    localYears.value = [filterOptions.staticOptions.anios[0]]
  }
})

// Watchers para filtros en cascada
watch(localGerencia, async (newGerencias) => {
  await filterOptions.loadJefaturas(newGerencias)
  localJefatura.value = [] // Reset dependientes
  localRuta.value = []
})

watch(localJefatura, async (newJefaturas) => {
  await filterOptions.loadRutas(newJefaturas)
  localRuta.value = [] // Reset dependiente
})

watch(localMarca, async (newMarcas) => {
  await filterOptions.loadGrupos(newMarcas)
  localGrupo.value = [] // Reset dependiente
})

const buildFilters = (): SegmentationFilters => {
  return {
    canal: localCanal.value,
    gerencia: localGerencia.value,
    jefatura: localJefatura.value,
    ruta: localRuta.value,
    marca: localMarca.value,
    grupo: localGrupo.value,
    categoria: [],
    period: {
      type: 'annual',
      years: localYears.value,
      monthStart: localMonthStart.value,
      monthEnd: localMonthEnd.value
    },
    metric: localMetric.value
  }
}

const applyFilters = async () => {
  const filters = buildFilters()
  await store.analyze(localGroupType.value, filters)
}

const resetFilters = () => {
  localGroupType.value = 'quintiles'
  localMetric.value = 'VENTA_KG'
  localYears.value = filterOptions.staticOptions.anios.length > 0 
    ? [filterOptions.staticOptions.anios[0]] 
    : []
  localMonthStart.value = 1
  localMonthEnd.value = 12
  localCanal.value = []
  localGerencia.value = []
  localJefatura.value = []
  localRuta.value = []
  localMarca.value = []
  localGrupo.value = []
  
  filterOptions.resetDependentOptions()
}

const hasFiltersApplied = () => {
  return (
    localCanal.value.length > 0 ||
    localGerencia.value.length > 0 ||
    localJefatura.value.length > 0 ||
    localRuta.value.length > 0 ||
    localMarca.value.length > 0 ||
    localGrupo.value.length > 0
  )
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-slate-200">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
          <i class="fa-solid fa-sliders text-brand-600"></i>
        </div>
        <div>
          <h3 class="font-bold text-slate-800">Configuración de Segmentación</h3>
          <p class="text-xs text-slate-500">Ajusta los parámetros de análisis</p>
        </div>
      </div>
      
      <button
        type="button"
        @click="isCollapsed = !isCollapsed"
        class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <i
          class="fa-solid fa-chevron-up text-slate-400 transition-transform"
          :class="{ 'rotate-180': isCollapsed }"
        ></i>
      </button>
    </div>
    
    <!-- Filters Content -->
    <div v-if="!isCollapsed" class="p-6 space-y-6">
      
      <!-- Tipo de Agrupación -->
      <GroupTypeSelector v-model="localGroupType" />
      
      <!-- Métrica -->
      <MetricSelector v-model="localMetric" />
      
      <div class="border-t border-slate-200"></div>
      
      <!-- Período -->
      <PeriodSelector
        :years="localYears"
        :month-start="localMonthStart"
        :month-end="localMonthEnd"
        :available-years="filterOptions.staticOptions.anios"
        @update:years="localYears = $event"
        @update:month-start="localMonthStart = $event"
        @update:month-end="localMonthEnd = $event"
      />
      
      <div class="border-t border-slate-200"></div>
      
      <!-- Filtros Organizacionales -->
      <div>
        <h4 class="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <i class="fa-solid fa-building text-slate-400"></i>
          Estructura Organizacional
        </h4>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MultiSelectDropdown
            v-model="localCanal"
            :options="filterOptions.staticOptions.canales"
            label="Canal"
            icon="fa-store"
            placeholder="Todos los canales"
          />
          
          <MultiSelectDropdown
            v-model="localGerencia"
            :options="filterOptions.staticOptions.gerencias"
            label="Gerencia"
            icon="fa-users-gear"
            placeholder="Todas las gerencias"
          />
          
          <MultiSelectDropdown
            v-model="localJefatura"
            :options="filterOptions.dependentOptions.jefaturas"
            label="Jefatura"
            icon="fa-user-tie"
            placeholder="Todas las jefaturas"
            :disabled="localGerencia.length === 0"
          />
          
          <MultiSelectDropdown
            v-model="localRuta"
            :options="filterOptions.dependentOptions.rutas"
            label="Ruta"
            icon="fa-route"
            placeholder="Todas las rutas"
            :disabled="localJefatura.length === 0"
          />
        </div>
      </div>
      
      <div class="border-t border-slate-200"></div>
      
      <!-- Filtros de Producto -->
      <div>
        <h4 class="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <i class="fa-solid fa-box text-slate-400"></i>
          Productos
        </h4>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MultiSelectDropdown
            v-model="localMarca"
            :options="filterOptions.staticOptions.marcas"
            label="Marca"
            icon="fa-tag"
            placeholder="Todas las marcas"
          />
          
          <MultiSelectDropdown
            v-model="localGrupo"
            :options="filterOptions.dependentOptions.grupos"
            label="Grupo"
            icon="fa-layer-group"
            placeholder="Todos los grupos"
            :disabled="localMarca.length === 0"
          />
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex items-center gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          @click="applyFilters"
          :disabled="store.isLoading || localYears.length === 0"
          class="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <i v-if="store.isLoading" class="fa-solid fa-circle-notch fa-spin"></i>
          <i v-else class="fa-solid fa-play"></i>
          <span>{{ store.isLoading ? 'Analizando...' : 'Analizar Segmentación' }}</span>
        </button>
        
        <button
          type="button"
          @click="resetFilters"
          :disabled="store.isLoading"
          class="px-4 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i class="fa-solid fa-rotate-left"></i>
        </button>
      </div>
      
      <!-- Warning si no hay años seleccionados -->
      <div
        v-if="localYears.length === 0"
        class="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg"
      >
        <i class="fa-solid fa-exclamation-triangle text-orange-600 mt-0.5"></i>
        <div class="flex-1 text-sm text-orange-700">
          <strong>Selecciona al menos un año</strong> para poder analizar la segmentación.
        </div>
      </div>
      
      <!-- Resumen de filtros aplicados -->
      <div
        v-if="hasFiltersApplied()"
        class="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
      >
        <i class="fa-solid fa-info-circle text-blue-600 mt-0.5"></i>
        <div class="flex-1 text-sm text-blue-700">
          <strong>Filtros activos:</strong>
          <span class="ml-2">
            {{ [
              localCanal.length > 0 ? `${localCanal.length} canal(es)` : '',
              localGerencia.length > 0 ? `${localGerencia.length} gerencia(s)` : '',
              localMarca.length > 0 ? `${localMarca.length} marca(s)` : ''
            ].filter(Boolean).join(', ') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>