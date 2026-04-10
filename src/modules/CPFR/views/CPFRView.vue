<script setup lang="ts">
// src/modules/CPFR/views/CPFRView.vue
import { ref, onMounted } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import CpfrFiltersPanel    from '../components/CpfrFiltersPanel.vue'
import CpfrCriteriaPanel   from '../components/CpfrCriteriaPanel.vue'
import CpfrOrderTable      from '../components/CpfrOrderTable.vue'
import CpfrUploadModal     from '../components/CpfrUploadModal.vue'
import CpfrStoreConfigModal from '../components/CpfrStoreConfigModal.vue'
import CpfrInfoModal        from '../components/CpfrInfoModal.vue'

const store = useCpfrStore()

// ── Modal state ───────────────────────────────────────────────────────────────
const showUploadModal  = ref(false)
const showInfoModal    = ref(false)
const configStore      = ref<{ id: string; nombre: string } | null>(null)


onMounted(() => store.init())

function onOpenConfig(id_cliente: string, nombre_tienda: string) {
    configStore.value = { id: id_cliente, nombre: nombre_tienda }
}

function onUploadDone() {
    store.loadDashboard()
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
    <CpfrFiltersPanel @upload-oc="showUploadModal = true" />

    <!-- ── Barra de acciones (Secundaria) ──────────────────────────────────────────────── -->
    <nav class="bg-white border-b border-slate-200 px-5 flex items-center gap-2 py-2 shrink-0 flex-wrap relative z-30">

      <!-- Buscador de OC (Ahora a la izquierda) -->
      <div class="relative flex items-center h-8">
        <i class="fa-solid fa-magnifying-glass absolute left-3 text-slate-400 text-[10px]"></i>
        <input 
          v-model="store.statusFilters.searchOC"
          type="text"
          placeholder="Buscar OC..."
          class="pl-8 pr-3 h-full w-40 bg-slate-50 border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:bg-white transition-all placeholder:text-slate-400 placeholder:font-medium"
        />
        <button 
          v-if="store.statusFilters.searchOC"
          @click="store.statusFilters.searchOC = ''"
          class="absolute right-2 text-slate-300 hover:text-slate-500 transition-colors"
        >
          <i class="fa-solid fa-circle-xmark text-[11px]"></i>
        </button>
      </div>

      <!-- Divisor sutil -->
      <div class="w-px h-6 bg-slate-200 mx-2"></div>

      <!-- Quick Status Filters (Con mr-auto para empujar lo que sigue a la derecha) -->
      <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl mr-auto">
        <span class="px-2 text-[9px] font-black text-slate-400 uppercase tracking-tighter">Filtros</span>
        
        <div class="flex items-center gap-1 px-1 border-r border-slate-200 mr-1">
          <button 
            @click="store.toggleStatusFilter('escenarioA')"
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-all text-[11px]"
            :class="store.statusFilters.escenarioA ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-200' : 'text-sky-600 hover:bg-white border border-transparent hover:border-sky-100'"
            title="Escenario A"
          ><i class="fa-solid fa-font"></i></button>
          
          <button 
            @click="store.toggleStatusFilter('escenarioB')"
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-all text-[11px]"
            :class="store.statusFilters.escenarioB ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-200' : 'text-amber-600 hover:bg-white border border-transparent hover:border-amber-100'"
            title="Escenario B"
          ><i class="fa-solid fa-bold"></i></button>
        </div>

        <div class="flex items-center gap-1">
          <button 
            @click="store.toggleStatusFilter('sinSellout')"
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            :class="store.statusFilters.sinSellout ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-200' : 'text-emerald-500 hover:bg-emerald-50 border border-transparent hover:border-emerald-100'"
            title="Sin Sellout"
          ><i class="fa-solid fa-seedling text-[11px]"></i></button>

          <button 
            @click="store.toggleStatusFilter('desabasto')"
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            :class="store.statusFilters.desabasto ? 'bg-rose-500 text-white shadow-sm ring-2 ring-rose-200' : 'text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100'"
            title="Desabasto (Inv <= 0)"
          ><i class="fa-solid fa-ban text-[11px]"></i></button>

          <button 
            @click="store.toggleStatusFilter('bajoStock')"
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            :class="store.statusFilters.bajoStock ? 'bg-rose-500 text-white shadow-sm ring-2 ring-rose-200' : 'text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100'"
            title="Bajo Stock"
          ><i class="fa-solid fa-triangle-exclamation text-[11px]"></i></button>

          <button 
            @click="store.toggleStatusFilter('sobrestock')"
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            :class="store.statusFilters.sobrestock ? 'bg-orange-500 text-white shadow-sm ring-2 ring-orange-200' : 'text-orange-500 hover:bg-orange-50 border border-transparent hover:border-orange-100'"
            title="Sobrestock"
          ><i class="fa-solid fa-arrow-trend-up text-[11px]"></i></button>

          <button 
            @click="store.toggleStatusFilter('fillrateBajo')"
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            :class="store.statusFilters.fillrateBajo ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-200' : 'text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100'"
            title="Fill Rate Bajo"
          ><i class="fa-solid fa-arrow-down text-[11px]"></i></button>

          <button 
            @click="store.toggleStatusFilter('fillrate100')"
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            :class="store.statusFilters.fillrate100 ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-200' : 'text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100'"
            title="Fill Rate 100%"
          ><i class="fa-solid fa-check text-[11px]"></i></button>

          <button 
            @click="store.toggleStatusFilter('sobrepedido')"
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            :class="store.statusFilters.sobrepedido ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-200' : 'text-sky-600 hover:bg-sky-50 border border-transparent hover:border-sky-100'"
            title="Sobrepedido"
          ><i class="fa-solid fa-arrow-up text-[11px]"></i></button>
        </div>

        <button 
          v-if="Object.values(store.statusFilters).some(v => v)"
          @click="store.clearStatusFilters()"
          class="ml-1 px-2 py-1 text-[9px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase"
        >Limpiar</button>
      </div>

      <!-- Recalcular Matemática (Ahora a la derecha) -->
      <button
        class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
        @click="confirmRecalculate"
        title="Fuerza un recálculo basado en inventario, sobrescribiendo el borrador actual"
      >
        <i class="fa-solid fa-rotate text-[11px]"></i>
        Recalcular Matemática
      </button>

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

    <!-- ── Modales conservados ────────────────────────────────────────────── -->
    <CpfrUploadModal
      v-if="showUploadModal"
      @close="showUploadModal = false"
      @uploaded="onUploadDone"
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

  </main>
</template>