<script setup lang="ts">
// src/modules/CPFR/views/CpfrView.vue
import { onMounted } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import CpfrFiltersPanel from '../components/CpfrFiltersPanel.vue'
import CpfrCriteriaPanel from '../components/CpfrCriteriaPanel.vue'
import CpfrOrderTable from '../components/CpfrOrderTable.vue'

const store = useCpfrStore()

onMounted(() => store.init())
</script>

<template>
  <main class="flex flex-col h-full min-h-0 bg-slate-50">

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <header class="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-lg font-bold text-slate-800 flex items-center gap-2">
          <i class="fa-solid fa-truck-ramp-box text-indigo-500"></i>
          CPFR — Propuesta de Pedido Sugerido
        </h1>
        <p class="text-xs text-slate-400 mt-0.5">Basado en inventario y sellout semanal · Soriana</p>
      </div>

      <!-- KPIs globales -->
      <div v-if="store.globalKpis" class="flex items-center gap-4 flex-wrap">
        <div class="text-center">
          <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Tiendas</p>
          <p class="text-xl font-bold text-slate-700">{{ store.globalKpis.totalTiendas }}</p>
        </div>
        <div class="w-px h-8 bg-slate-200"></div>
        <div class="text-center">
          <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Pedido Total</p>
          <p class="text-xl font-bold text-indigo-600">{{ store.globalKpis.totalSugerido.toLocaleString('es-MX') }}</p>
        </div>
        <div class="w-px h-8 bg-slate-200"></div>
        <div class="text-center">
          <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Fill Rate</p>
          <p class="text-xl font-bold" :class="store.globalKpis.fillRate >= 90 ? 'text-emerald-600' : store.globalKpis.fillRate >= 70 ? 'text-amber-500' : 'text-rose-500'">
            {{ store.globalKpis.fillRate.toFixed(1) }}%
          </p>
        </div>
        <div class="w-px h-8 bg-slate-200"></div>
        <div class="text-center">
          <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">INSTOCK</p>
          <p class="text-xl font-bold" :class="store.globalKpis.instockPct >= 95 ? 'text-emerald-600' : store.globalKpis.instockPct >= 75 ? 'text-amber-500' : 'text-rose-500'">
            {{ store.globalKpis.instockPct.toFixed(1) }}%
          </p>
        </div>
      </div>
    </header>

    <!-- ── Body ───────────────────────────────────────────────────────────── -->
    <div class="flex flex-1 min-h-0 overflow-hidden">

      <!-- Sidebar: filtros + criterios -->
      <aside class="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col gap-4 p-4 overflow-y-auto">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Filtros</p>
          <CpfrFiltersPanel />
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            Criterio de Semanas
          </p>
          <CpfrCriteriaPanel />
        </div>
      </aside>

      <!-- Contenido principal -->
      <div class="flex-1 flex flex-col min-h-0 min-w-0">

        <!-- Loading overlay -->
        <div
          v-if="store.isLoading"
          class="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400"
        >
          <i class="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-400"></i>
          <p class="text-sm font-medium">Cargando datos...</p>
        </div>

        <!-- Error -->
        <div
          v-else-if="store.error"
          class="flex-1 flex flex-col items-center justify-center gap-3 text-rose-400 p-8"
        >
          <i class="fa-solid fa-circle-exclamation text-3xl"></i>
          <p class="text-sm font-medium">{{ store.error }}</p>
          <button
            class="text-xs px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors"
            @click="store.init()"
          >
            Reintentar
          </button>
        </div>

        <!-- Tabla -->
        <CpfrOrderTable v-else class="flex-1 min-h-0" />

      </div>
    </div>

  </main>
</template>