<script setup lang="ts">
// src/modules/CPFR/views/CPFRView.vue
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCpfrStore } from '../stores/cpfrStore'
import CpfrFiltersPanel    from '../components/CpfrFiltersPanel.vue'
import CpfrOrderTable      from '../components/CpfrOrderTable.vue'
import CpfrChainTabs       from '../components/CpfrChainTabs.vue'
import CpfrExportPanel     from '../components/CpfrExportPanel.vue'
import CpfrStoreConfigModal from '../components/CpfrStoreConfigModal.vue'
import CpfrInfoModal        from '../components/CpfrInfoModal.vue'
import CpfrZ8ManagerPanel  from '../components/CpfrZ8ManagerPanel.vue'
import { buildVisibleCpfrDias, cpfrSkuFinalPieces } from '../composables/useCpfrVisibility'

const store = useCpfrStore()
const router = useRouter()

// ── Panel state ───────────────────────────────────────────────────────────────
const showExportPanel  = ref(false)
const showInfoModal    = ref(false)
const showZ8Manager    = ref(false)
const configStore      = ref<{ id: string; nombre: string } | null>(null)
const chainLabel = computed(() => store.nom_cadena === 'SAMS' ? "Sam's" : 'Soriana')

const visibleDias = computed(() => buildVisibleCpfrDias({
    activeTab: store.activeTab,
    dias: store.dias,
    historialDias: store.historialDias,
    statusFilters: store.statusFilters,
    criterioGlobal: store.criterio_global,
}))

const orderTotals = computed(() => {
    let piezas = 0
    let kg = 0
    const tiendas = new Set<string>()

    if (store.activeTab === 'historial') {
        const term = store.historialSearch.trim().toLowerCase()

        for (const dia of store.historialDias) {
            for (const tienda of dia.tiendas) {
                let hasVisibleSku = false

                for (const sku of tienda.skus) {
                    const state = String(sku.estado_oc ?? '').trim().toLowerCase()
                    if (state !== 'aprobado' && state !== 'cerrado') continue

                    const searchable = [
                        tienda.nombre_tienda,
                        tienda.id_cliente,
                        state,
                        sku.num_pedido,
                    ].filter(Boolean).join(' ').toLowerCase()

                    if (term && !searchable.includes(term)) continue

                    const piezasSku = cpfrSkuFinalPieces(sku)
                    const kgPorPieza = Number(sku.unidad_inventario ?? 0)
                    piezas += piezasSku
                    kg += kgPorPieza > 0 ? piezasSku * kgPorPieza : Number(sku.pedido_sugerido_kg ?? 0)
                    hasVisibleSku = true
                }

                if (hasVisibleSku) tiendas.add(tienda.id_cliente)
            }
        }

        return { tiendas: tiendas.size, piezas, kg }
    }

    for (const dia of visibleDias.value) {
        for (const tienda of dia.tiendas) {
            for (const sku of tienda.skus) {
                const piezasSku = cpfrSkuFinalPieces(sku)
                const kgPorPieza = Number(sku.unidad_inventario ?? 0)
                piezas += piezasSku
                kg += kgPorPieza > 0 ? piezasSku * kgPorPieza : Number(sku.pedido_sugerido_kg ?? 0)
            }

            tiendas.add(tienda.id_cliente)
        }
    }

    return { tiendas: tiendas.size, piezas, kg }
})

const formatNumber = (value: number, maximumFractionDigits = 0) =>
    value.toLocaleString('es-MX', { maximumFractionDigits })

onMounted(() => store.init())

function onOpenConfig(id_cliente: string, nombre_tienda: string) {
    configStore.value = { id: id_cliente, nombre: nombre_tienda }
}

function openChainConfig() {
    router.push({ name: 'chain-config' })
}
</script>

<template>
  <main class="flex flex-col h-full min-h-0 bg-slate-50">

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <header class="px-4 xl:px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between flex-wrap xl:flex-nowrap gap-4 shrink-0">

      <!-- Título -->
      <div class="min-w-0">
        <h1 class="text-sm xl:text-base font-bold text-slate-800 flex items-center gap-2 truncate">
          <i class="fa-solid fa-truck-ramp-box text-brand-500 shrink-0"></i>
          <span class="truncate">Modelo CPFR</span>
          <button 
            @click="showInfoModal = true"
            class="w-5 h-5 shrink-0 rounded-full border border-slate-200 text-slate-400 hover:text-brand-500 hover:border-brand-200 hover:bg-brand-50 transition-all flex items-center justify-center text-[10px] ml-1"
            title="Ver guía del algoritmo y simbología"
          >
            <i class="fa-solid fa-question"></i>
          </button>

          <!-- Switch de Vista -->
          <div class="flex items-center gap-1 ml-2 xl:ml-4 bg-slate-100/50 border border-slate-200 p-0.5 rounded-lg shrink-0">
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
              title="Modo Admin"
            >
              <i class="fa-solid fa-table-cells-large text-[11px]"></i>
            </button>
          </div>
        </h1>
        <p class="text-[10px] xl:text-[11px] text-slate-400 mt-0.5 truncate">
          Reabastecimiento - {{ chainLabel }}
          <span v-if="store.currentWeek" class="ml-2 text-slate-300">
            - Anio {{ store.currentWeek.anio }} - Sem. {{ store.currentWeek.semana_ic }}
          </span>
        </p>
      </div>

      <CpfrChainTabs class="order-3 w-full xl:order-none xl:w-auto" />

      <!-- KPIs del contexto -->
      <div v-if="store.context" class="flex items-center gap-3 xl:gap-5 shrink-0">
        <div class="text-center">
          <p class="text-[8px] xl:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Tiendas</p>
          <p class="text-lg xl:text-xl font-bold text-slate-700 leading-tight">{{ orderTotals.tiendas }}</p>
        </div>
        <div class="w-px h-6 xl:h-8 bg-slate-200"></div>
        <div class="text-center">
          <p class="text-[8px] xl:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Piezas</p>
          <p class="text-lg xl:text-xl font-bold text-slate-700 leading-tight">{{ formatNumber(orderTotals.piezas) }}</p>
        </div>
        <div class="w-px h-6 xl:h-8 bg-slate-200"></div>
        <div class="text-center">
          <p class="text-[8px] xl:text-[10px] uppercase tracking-widest text-slate-400 font-bold">KG</p>
          <p class="text-lg xl:text-xl font-bold text-slate-700 leading-tight">{{ formatNumber(orderTotals.kg, 1) }}</p>
        </div>
        <div class="w-px h-6 xl:h-8 bg-slate-200"></div>
        <div class="text-center">
          <p class="text-[8px] xl:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Criterio Global</p>
          <p class="text-lg xl:text-xl font-bold text-brand-600 leading-tight">{{ store.context.criterio_global }} sem.</p>
        </div>
      </div>

    </header>

    <!-- ── Barra de Filtros (Colapsable) ────────────────────────────────────────── -->
    <CpfrFiltersPanel 
      @open-export="showExportPanel = true" 
      @open-chain-config="openChainConfig"
      @open-z8-manager="showZ8Manager = true"
    />

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
      :key="store.activeTab"
      :tab="store.activeTab"
      @close="showExportPanel = false"
    />

    <!-- Panel Gestión de Borradores Z8 -->
    <CpfrZ8ManagerPanel
      v-if="showZ8Manager"
      @close="showZ8Manager = false"
      @deleted="store.loadDashboard()"
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
