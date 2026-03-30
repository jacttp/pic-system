<script setup lang="ts">
// src/modules/CPFR/components/CpfrFiltersPanel.vue
// Panel superior estático (compacto) para Filtros y Criterio Global
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import CpfrCriteriaPanel from './CpfrCriteriaPanel.vue'

const store = useCpfrStore()

const emit = defineEmits<{
    (e: 'upload-oc'): void
}>()

// ── Search Store ─────────────────────────────────────────────────────────────
const searchText = ref(store.filters.nombre_tienda || store.filters.id_cliente || '')
const searchType = ref<'nombre'|'id'>(store.filters.id_cliente ? 'id' : 'nombre')

function handleSearch() {
    const val = searchText.value.trim()
    if (!val) {
        store.setFilter('nombre_tienda', undefined)
        store.setFilter('id_cliente', undefined)
    } else if (searchType.value === 'id') {
        store.setFilter('id_cliente', val)
        store.setFilter('nombre_tienda', undefined)
    } else {
        store.setFilter('nombre_tienda', val)
        store.setFilter('id_cliente', undefined)
    }
    store.loadDashboard()
}

watch(searchType, () => {
    if (searchText.value.trim() !== '') handleSearch()
})

// Sincronizar búsqueda si se limpia local o globalmente
watch(() => [store.filters.nombre_tienda, store.filters.id_cliente], ([nt, id]) => {
    if (!nt && !id) searchText.value = ''
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null
function onInputSearch() {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        handleSearch()
    }, 400)
}

// ── Day Tags ─────────────────────────────────────────────────────────────────
const dTags = [
    { num: 1, label: 'L' },
    { num: 2, label: 'M' },
    { num: 3, label: 'X' },
    { num: 4, label: 'J' },
    { num: 5, label: 'V' },
    { num: 6, label: 'S' },
    { num: 7, label: 'D' },
]

function toggleDay(num: number) {
    if (store.filters.dia === num) {
        store.setFilter('dia', undefined)
    } else {
        store.setFilter('dia', num)
    }
    store.loadDashboard()
}

// ── Jefatura ─────────────────────────────────────────────────────────────────
function onChangeJefatura(e: Event) {
    const val = (e.target as HTMLSelectElement).value
    store.setFilter('jefatura', val || undefined)
    store.loadDashboard()
}

// ── Criteria Popover ─────────────────────────────────────────────────────────
const showCriteria = ref(false)

function closeCriteria() {
    showCriteria.value = false
}

onMounted(() => {
    document.addEventListener('click', closeCriteria)
})
onBeforeUnmount(() => {
    document.removeEventListener('click', closeCriteria)
})

function toggleCriteria() {
    showCriteria.value = !showCriteria.value
}

// ── Global Actions ───────────────────────────────────────────────────────────
function clearAll() {
    store.clearFilters()
    searchText.value = ''
    store.loadDashboard()
}
</script>

<template>
  <div class="bg-white border-b border-slate-200 shadow-sm shrink-0 px-5 py-3 relative z-40 select-none">
    <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
      
      <!-- Fila Principal (Izquierda) -->
      
      <!-- Días (Tags) -->
      <div class="flex flex-col gap-1.5 shrink-0">
          <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1"><i class="fa-regular fa-calendar-check mr-0.5"></i> Día Envío</span>
          <div class="flex gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
             <button v-for="d in dTags" :key="d.num"
               class="w-[28px] h-[26px] rounded font-bold text-[11px] transition-all"
               :class="store.filters.dia === d.num ? 'bg-brand-600 text-white shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-700'"
               @click="toggleDay(d.num)"
               :title="`Seleccionar día ${d.num}`"
             >{{ d.label }}</button>
          </div>
      </div>

      <!-- Buscador (Input) -->
      <div class="flex flex-col gap-1.5 flex-1 min-w-[200px] max-w-[280px]">
          <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center justify-between">
              <span><i class="fa-solid fa-store mr-0.5"></i> Tienda</span>
              <!-- Toggle badge hidden label -->
              <span class="text-[8px] font-medium text-slate-300 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">Clic para alternar</span>
          </span>
          <div class="relative group/search">
             <input type="text" :placeholder="searchType === 'nombre' ? 'Ej. Cumbres...' : 'Ej. 742...'" 
               class="w-full text-xs font-semibold border border-slate-200 rounded-lg pl-8 pr-12 h-[34px] bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium" 
               v-model="searchText" @input="onInputSearch" />
             <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
             
             <!-- Modo Toggle Embedded -->
             <button @click="searchType = searchType === 'nombre' ? 'id' : 'nombre'" 
               class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-wider px-1.5 py-1 rounded bg-white border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50 transition-colors shadow-sm select-none"
               title="Alternar entre buscar por Nombre o por ID de Cliente">
                 {{ searchType === 'nombre' ? 'NOM' : 'ID' }}
             </button>
          </div>
      </div>

      <!-- Select Jefatura -->
      <div class="flex flex-col gap-1.5 shrink-0 w-[140px]">
          <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1"><i class="fa-solid fa-user-tie mr-0.5"></i> Jefatura</span>
          <div class="relative">
              <select class="w-full text-xs font-semibold border border-slate-200 rounded-lg pl-3 pr-6 h-[34px] bg-slate-50 focus:bg-white appearance-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none cursor-pointer group hover:border-slate-300 transition-all truncate" 
                :value="store.filters.jefatura ?? ''" @change="onChangeJefatura">
                  <option value="">Todas</option>
                  <option v-for="j in store.jefaturaOptions" :key="j" :value="j">{{ j }}</option>
              </select>
              <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none group-hover:text-brand-500"></i>
          </div>
      </div>

      <div class="w-px h-8 bg-slate-200 hidden md:block self-end mb-1"></div>

      <!-- Semanas Sellout & Criterio Global -->
      <div class="flex gap-4 items-end shrink-0">
          <!-- Semanas Histórico -->
          <div class="flex flex-col gap-1.5 w-[75px]">
             <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1" title="Semanas usadas para calcular el Sellout Promedio">Semanas</span>
             <input type="number" min="1" max="24" 
               class="w-full text-xs font-bold border border-slate-200 rounded-lg text-center h-[34px] bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none" 
               v-model.number="store.filters.semanas_sellout" @change="store.loadDashboard()" placeholder="Auto" />
          </div>

          <!-- Criterio Global Popover -->
          <div class="relative flex flex-col gap-1.5">
              <span class="text-[9px] font-bold text-brand-400 uppercase tracking-widest pl-1"><i class="fa-solid fa-sliders mr-0.5"></i> Criterio</span>
              <button @click.stop="toggleCriteria" 
                class="h-[34px] border border-brand-200 bg-brand-50 rounded-lg px-3 flex items-center justify-between min-w-[80px] text-brand-700 hover:bg-brand-100 transition-colors shadow-sm">
                  <span class="font-black text-xs mr-2">{{ store.criterio_global.toFixed(1) }}</span>
                  <i class="fa-solid fa-chevron-down text-[9px] opacity-70"></i>
              </button>
              
              <!-- Popover Content -->
              <div v-if="showCriteria" class="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 shadow-xl rounded-xl p-4 w-[280px] cursor-default" @click.stop>
                  <div class="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                     <h4 class="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5"><i class="fa-solid fa-gear text-brand-500"></i> Configuración Global</h4>
                     <button @click.stop="closeCriteria" class="text-slate-300 hover:text-rose-500 p-1"><i class="fa-solid fa-times text-[12px]"></i></button>
                  </div>
                  <CpfrCriteriaPanel />
              </div>
          </div>
      </div>

      <!-- Actions (Right side) -->
      <div class="flex flex-1 items-end justify-end gap-3 shrink-0">
          <button @click="clearAll" class="text-xs font-bold text-slate-500 hover:text-brand-600 px-3 h-[34px] rounded-lg bg-slate-50 hover:bg-brand-50 transition-colors border border-slate-200 hover:border-brand-200 flex items-center gap-2 shadow-sm" title="Limpiar todos los filtros">
             <i class="fa-solid fa-rotate-left"></i> <span class="hidden sm:inline">Limpiar</span>
          </button>
          
          <button @click="emit('upload-oc')" class="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 h-[34px] rounded-lg shadow-sm shadow-brand-500/30 transition-all flex items-center gap-2 hover:-translate-y-px active:translate-y-0">
             <i class="fa-solid fa-file-arrow-up"></i> <span class="hidden sm:inline">Subir OC</span>
          </button>
      </div>

    </div>
  </div>
</template>