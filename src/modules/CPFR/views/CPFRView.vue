<script setup lang="ts">
// src/modules/CPFR/views/CPFRView.vue
import { ref, onMounted } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import CpfrFiltersPanel    from '../components/CpfrFiltersPanel.vue'
import CpfrCriteriaPanel   from '../components/CpfrCriteriaPanel.vue'
import CpfrOrderTable      from '../components/CpfrOrderTable.vue'
import CpfrUploadModal     from '../components/CpfrUploadModal.vue'
import CpfrStoreConfigModal from '../components/CpfrStoreConfigModal.vue'

const store = useCpfrStore()

// ── Modal state ────────────────────────────────────────────────────────────────
const showUploadModal  = ref(false)
const configStore      = ref<{ id: string; nombre: string } | null>(null)

onMounted(() => store.init())

function onOpenConfig(id_cliente: string, nombre_tienda: string) {
    configStore.value = { id: id_cliente, nombre: nombre_tienda }
}

function onUploadDone() {
    // Tras subir OC, recargar el dashboard
    store.loadDashboard()
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

      <!-- Preview banner inline -->
      <div
        v-if="store.preview"
        class="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mr-2"
      >
        <i class="fa-solid fa-circle-exclamation text-amber-400 text-xs"></i>
        <span class="text-[11px] text-amber-600 font-semibold">Vista previa — valores no guardados</span>
      </div>

      <div class="flex-1"></div>

      <!-- Expandir / Contraer -->
      <button
        class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
        @click="store.expandAll()"
      >
        <i class="fa-solid fa-angles-down text-[11px]"></i>
        Expandir
      </button>
      <button
        class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
        @click="store.collapseAll()"
      >
        <i class="fa-solid fa-angles-up text-[11px]"></i>
        Contraer
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

  </main>
</template>