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

// ── Ref a la tabla para acceder a expandedOCGroups expuesto ─────────────────────
const tableRef = ref<InstanceType<typeof CpfrOrderTable> | null>(null)

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

      <!-- Recalcular Matemática -->
      <button
        class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors mr-auto"
        @click="confirmRecalculate"
        title="Fuerza un recálculo basado en inventario, sobrescribiendo el borrador actual"
      >
        <i class="fa-solid fa-rotate text-[11px]"></i>
        Recalcular Matemática
      </button>

      <!-- Expandir / Contraer por niveles -->
      <div class="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
        <!-- Label -->
        <span class="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide border-r border-slate-200 py-1.5">Tiendas</span>
        <button
          class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 text-slate-500 hover:bg-white hover:text-slate-700 transition-colors"
          title="Expandir todas las tiendas"
          @click="store.expandAll()"
        >
          <i class="fa-solid fa-chevron-down text-[10px]"></i>
          Abrir
        </button>
        <button
          class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 text-slate-500 hover:bg-white hover:text-slate-700 transition-colors border-l border-slate-200"
          title="Contraer todas las tiendas"
          @click="store.collapseAll()"
        >
          <i class="fa-solid fa-chevron-up text-[10px]"></i>
          Cerrar
        </button>
      </div>

      <div class="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
        <!-- Label -->
        <span class="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide border-r border-slate-200 py-1.5">OCs</span>
        <button
          class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 text-slate-500 hover:bg-white hover:text-slate-700 transition-colors"
          title="Expandir todas las órdenes de compra"
          @click="tableRef && store.expandAllOCs(tableRef.expandedOCGroups)"
        >
          <i class="fa-solid fa-chevron-down text-[10px]"></i>
          Abrir
        </button>
        <button
          class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 text-slate-500 hover:bg-white hover:text-slate-700 transition-colors border-l border-slate-200"
          title="Contraer todas las órdenes de compra"
          @click="tableRef && store.collapseAllOCs(tableRef.expandedOCGroups)"
        >
          <i class="fa-solid fa-chevron-up text-[10px]"></i>
          Cerrar
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
          ref="tableRef"
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