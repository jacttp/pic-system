<script setup lang="ts">
// src/modules/SellOut/views/SellOutDashboardView.vue
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSellOutStore } from '../stores/selloutStore'
import SellOutFilters from '../components/SellOutFilters.vue'
import SellOutKpiCards from '../components/SellOutKpiCards.vue'
import SellOutTrendChart from '../components/SellOutTrendChart.vue'
import SellOutCoverageChart from '../components/SellOutCoverageChart.vue'

const store = useSellOutStore()
const { error, hasData, filters, isLoadingDashboard } = storeToRefs(store)

onMounted(() => store.initFilters())
</script>

<template>
  <div class="flex flex-col gap-4 p-4 lg:p-6 min-h-screen bg-slate-50">

    <!-- Page header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-slate-800 flex items-center gap-2">
          <i class="fa-solid fa-chart-column text-emerald-600" />
          Sell Out & Callbook
        </h1>
        <p class="text-xs text-slate-400 mt-0.5">
          Análisis semanal de venta e inventario en tienda
        </p>
      </div>

      <!-- Badge de período activo -->
      <transition name="fade">
        <div
          v-if="hasData && !isLoadingDashboard"
          class="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full"
        >
          <i class="fa-solid fa-calendar-week text-[10px]" />
          Semana {{ filters.semana }} · {{ filters.año }}
        </div>
      </transition>
    </div>

    <!-- Filtros -->
    <SellOutFilters />

    <!-- Error global -->
    <transition name="fade">
      <div
        v-if="error"
        class="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3"
      >
        <i class="fa-solid fa-circle-exclamation shrink-0" />
        {{ error }}
      </div>
    </transition>

    <!-- KPI Cards -->
    <SellOutKpiCards />

    <!-- Gráficas -->
    <div v-if="hasData || isLoadingDashboard" class="grid grid-cols-1 lg:grid-cols-3 gap-4">

      <!-- Tendencia — ocupa 2/3 -->
      <div class="lg:col-span-2">
        <SellOutTrendChart />
      </div>

      <!-- Cobertura — ocupa 1/3 -->
      <div class="lg:col-span-1">
        <SellOutCoverageChart />
      </div>

    </div>

    <!-- Empty state inicial -->
    <div
      v-else
      class="flex flex-col items-center justify-center gap-3 py-20 text-slate-400"
    >
      <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
        <i class="fa-solid fa-chart-column text-2xl" />
      </div>
      <p class="text-sm font-medium text-slate-500">Selecciona un período para cargar el dashboard</p>
      <p class="text-xs">Año y semana son requeridos</p>
    </div>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>