<script setup lang="ts">
// src/modules/CPFR/views/CPFRView.vue
import { ref, onMounted, watch } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import CpfrFiltersPanel    from '../components/CpfrFiltersPanel.vue'
import CpfrCriteriaPanel   from '../components/CpfrCriteriaPanel.vue'
import CpfrOrderTable      from '../components/CpfrOrderTable.vue'
import CpfrExportPanel     from '../components/CpfrExportPanel.vue'
import CpfrStoreConfigModal from '../components/CpfrStoreConfigModal.vue'
import CpfrInfoModal        from '../components/CpfrInfoModal.vue'
import CpfrChainConfigModal from '../components/CpfrChainConfigModal.vue'

const store = useCpfrStore()

// ── Panel state ───────────────────────────────────────────────────────────────
const showExportPanel  = ref(false)
const showInfoModal    = ref(false)
const showChainConfig  = ref(false)
const configStore      = ref<{ id: string; nombre: string } | null>(null)

// ── Search Store Logic (Migrada de Panel) ───────────────────────────────────
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

function onChangeJefatura(e: Event) {
    const val = (e.target as HTMLSelectElement).value
    store.setFilter('jefatura', val || undefined)
    store.loadDashboard()
}


onMounted(() => store.init())

function onOpenConfig(id_cliente: string, nombre_tienda: string) {
    configStore.value = { id: id_cliente, nombre: nombre_tienda }
}

function confirmRecalculate() {
    if (confirm('Atención: Recalcular la matemática sobrescribirá todos los cambios manuales que hayas guardado hoy en el borrador.\n\n¿Estás seguro de que deseas forzar un recálculo desde cero con el inventario más reciente?')) {
        store.recalculate()
    }
}
</script>

<template>
  <main class="flex flex-col h-full min-h-0 bg-slate-50">

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <header class="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between flex-wrap gap-3 shrink-0">

      <!-- Título -->
      <div>
        <h1 class="text-base font-bold text-slate-800 flex items-center gap-2">
          <i class="fa-solid fa-truck-ramp-box text-brand-500"></i>
          CPFR — Propuesta de Pedido Sugerido
          <button 
            @click="showInfoModal = true"
            class="w-5 h-5 rounded-full border border-slate-200 text-slate-400 hover:text-brand-500 hover:border-brand-200 hover:bg-brand-50 transition-all flex items-center justify-center text-[10px] ml-1"
            title="Ver guía del algoritmo y simbología"
          >
            <i class="fa-solid fa-question"></i>
          </button>

          <!-- Switch de Vista -->
          <div class="flex items-center gap-1 ml-4 bg-slate-100/50 border border-slate-200 p-0.5 rounded-lg">
            <button 
              @click="store.setViewMode('table')"
              class="w-6 h-6 flex items-center justify-center rounded-md transition-all"
              :class="store.viewMode === 'table' ? 'bg-white text-brand-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'"
              title="Vista de Tabla"
            >
              <i class="fa-solid fa-table-list text-[11px]"></i>
            </button>
            <button 
              @click="store.setViewMode('cards')"
              class="w-6 h-6 flex items-center justify-center rounded-md transition-all"
              :class="store.viewMode === 'cards' ? 'bg-white text-brand-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'"
              title="Vista de Tarjetas"
            >
              <i class="fa-solid fa-table-cells-large text-[11px]"></i>
            </button>
          </div>
        </h1>
        <p class="text-[11px] text-slate-400 mt-0.5">
          Motor de reabastecimiento basado en inventario y sellout semanal · Soriana
          <span v-if="store.currentWeek" class="ml-2 text-slate-300">
            · Año {{ store.currentWeek.anio }} · Sem. {{ store.currentWeek.semana_ic }}
          </span>
        </p>
      </div>

      <!-- KPIs del contexto -->
      <div v-if="store.context" class="flex items-center gap-5 flex-wrap">
        <div class="text-center">
          <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Tiendas</p>
          <p class="text-xl font-bold text-slate-700">{{ store.context.total_tiendas }}</p>
        </div>
        <div class="w-px h-8 bg-slate-200"></div>
        <div class="text-center">
          <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">SKUs</p>
          <p class="text-xl font-bold text-slate-700">{{ store.context.total_skus.toLocaleString('es-MX') }}</p>
        </div>
        <div class="w-px h-8 bg-slate-200"></div>
        <div class="text-center">
          <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Criterio Global</p>
          <p class="text-xl font-bold text-brand-600">{{ store.context.criterio_global }} sem.</p>
        </div>
      </div>

    </header>

    <!-- ── Barra de Filtros (Estática) ──────────────────────────────────────────────── -->
    <CpfrFiltersPanel 
      @open-export="showExportPanel = true" 
      @open-chain-config="showChainConfig = true"
    />

    <!-- ── Barra de acciones (Secundaria) ──────────────────────────────────────────────── -->
    <nav class="bg-white border-b border-slate-200 px-5 flex items-center gap-6 py-3 shrink-0 flex-wrap relative z-30">

      <!-- Grupo Buscador OC -->
      <div class="flex flex-col gap-1.5 shrink-0">
          <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              <i class="fa-solid fa-hashtag mr-0.5"></i> Orden Compra
          </span>
          <div class="relative flex items-center h-[34px]">
            <i class="fa-solid fa-magnifying-glass absolute left-3 text-slate-400 text-[10px]"></i>
            <input 
              v-model="store.statusFilters.searchOC"
              type="text"
              placeholder="Buscar OC..."
              class="pl-8 pr-10 h-full w-40 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-100 focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
            />
            <button 
              v-if="store.statusFilters.searchOC"
              @click="store.statusFilters.searchOC = ''"
              class="absolute right-2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <i class="fa-solid fa-circle-xmark text-[11px]"></i>
            </button>
          </div>
      </div>

      <!-- Grupo Buscador Tienda -->
      <div class="flex flex-col gap-1.5 shrink-0">
          <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              <i class="fa-solid fa-store mr-0.5"></i> Tienda
          </span>
          <div class="relative flex items-center h-[34px]">
             <input type="text" :placeholder="searchType === 'nombre' ? 'Buscar tienda...' : 'ID Cliente...'" 
               class="w-48 text-xs font-semibold border border-slate-200 rounded-lg pl-8 pr-12 h-full bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium" 
               v-model="searchText" @input="onInputSearch" />
             <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
             
             <!-- Modo Toggle Embedded -->
             <button @click="searchType = searchType === 'nombre' ? 'id' : 'nombre'" 
               class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50 transition-colors shadow-sm select-none"
               title="Alternar entre buscar por Nombre o por ID de Cliente">
                 {{ searchType === 'nombre' ? 'NOM' : 'ID' }}
             </button>
          </div>
      </div>

      <!-- Grupo Select Jefatura -->
      <div class="flex flex-col gap-1.5 shrink-0 mr-auto">
          <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              <i class="fa-solid fa-user-tie mr-0.5"></i> Jefatura
          </span>
          <div class="relative h-[34px]">
              <select 
                class="w-40 text-xs border border-slate-200 rounded-lg pl-3 pr-8 h-full bg-slate-50 focus:bg-white appearance-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none cursor-pointer group hover:border-slate-300 transition-all truncate" 
                :class="store.filters.jefatura ? 'text-slate-700 font-bold uppercase' : 'text-slate-400 font-medium'"
                :value="store.filters.jefatura ?? ''" 
                @change="onChangeJefatura"
              >
                  <option value="" class="text-slate-400 font-medium">Seleccionar Jefatura...</option>
                  <option v-for="j in store.jefaturaOptions" :key="j" :value="j" class="text-slate-700 font-semibold uppercase">{{ j }}</option>
              </select>
              <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none group-hover:text-brand-500"></i>
          </div>
      </div>

      <!-- Botón Recalcular Matemática -->
      <div class="flex flex-col gap-1.5">
          <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 text-right invisible">Acción</span>
          <button
            class="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 h-[34px] rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors shadow-sm"
            @click="confirmRecalculate"
            title="Fuerza un recálculo basado en inventario, sobrescribiendo el borrador actual"
          >
            <i class="fa-solid fa-rotate text-[11px]"></i>
            Recalcular Matemática
          </button>
      </div>

    </nav>

    <!-- ── Content ────────────────────────────────────────────────────────── -->
    <div class="flex flex-1 min-h-0 overflow-hidden relative z-20">

      <!-- Área principal -->
      <div class="flex-1 flex flex-col min-h-0 min-w-0 p-4">

        <!-- Loading -->
        <div v-if="store.loading" class="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-400"></i>
          <p class="text-sm font-medium">Cargando dashboard CPFR...</p>
        </div>

        <!-- Error -->
        <div v-else-if="store.error" class="flex-1 flex flex-col items-center justify-center gap-3 text-rose-400 p-8">
          <i class="fa-solid fa-circle-exclamation text-3xl"></i>
          <p class="text-sm font-medium">{{ store.error }}</p>
          <button
            class="text-xs px-4 py-2 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors"
            @click="store.init()"
          >
            <i class="fa-solid fa-rotate-right mr-1.5"></i>
            Reintentar
          </button>
        </div>

        <!-- Tabla -->
        <CpfrOrderTable
          v-else
          class="flex-1 min-h-0"
          @open-config="onOpenConfig"
        />

      </div>
    </div>

    <!-- ── Paneles y Modales ────────────────────────────────────────────── -->
    <CpfrExportPanel
      v-if="showExportPanel"
      @close="showExportPanel = false"
    />

    <CpfrStoreConfigModal
      v-if="configStore"
      :id-cliente="configStore.id"
      :nombre-tienda="configStore.nombre"
      @close="configStore = null"
    />

    <CpfrInfoModal
      v-if="showInfoModal"
      @close="showInfoModal = false"
    />

    <CpfrChainConfigModal
      v-if="showChainConfig"
      @close="showChainConfig = false"
    />

  </main>
</template>