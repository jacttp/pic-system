<!-- src/modules/Callbook/components/CallbookFilterBar.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCallbookStore } from '../stores/callbookStore'

const store = useCallbookStore()

// ── Local state (editar sin disparar fetch inmediato) ──────────────────────
const local = ref({
  clientId: store.filters.clientId || '',
  year: store.filters.clientId ? store.filters.year : store.globalFilters.anio,
  currentWeek: store.filters.clientId ? store.filters.currentWeek : store.globalFilters.semana,
  previousWeek: store.filters.previousWeek || ''
})

// ── Opciones estáticas — en producción vendrían de /api/filters/* ──────────
const YEARS  = ['2024', '2025', '2026']
const WEEKS  = Array.from({ length: 52 }, (_, i) => String(i + 1).padStart(2, '0'))

// ── Validación: el botón Aplicar de Cliente o Global ────────
const canApply = computed(() => {
  if (local.value.clientId) {
    // Para modo Cliente: Requiere cliente, año, sem actual, sem anterior
    return !!local.value.year && !!local.value.currentWeek && !!local.value.previousWeek
  } else {
    // Para modo Global: Requiere año, sem actual
    return !!local.value.year && !!local.value.currentWeek
  }
})

// ── Semanas disponibles para "Semana Anterior" (excluye currentWeek) ──────
const prevWeekOptions = computed(() =>
  WEEKS.filter(w => w !== local.value.currentWeek)
)

function apply() {
  if (local.value.clientId) {
    // Vista Cliente Específico
    store.setFilters({ 
      clientId: local.value.clientId,
      year: local.value.year,
      currentWeek: local.value.currentWeek,
      previousWeek: local.value.previousWeek
    })
  } else {
    // Panorama General
    store.setFilters({ clientId: '' })
    store.setGlobalAnio(local.value.year)
    store.setGlobalSemana(local.value.currentWeek)
    store.fetchGlobalDashboard(local.value.currentWeek)
  }
}

function reset() {
  local.value = { clientId: '', year: '', currentWeek: '', previousWeek: '' }
}

// Sincronizar si el store cambia externamente para reset del clientId a ""
watch(() => store.filters.clientId, (val) => {
  if (!val) {
    local.value.clientId = ''
  } else {
    local.value.clientId = val
    local.value.year = store.filters.year
    local.value.currentWeek = store.filters.currentWeek
    local.value.previousWeek = store.filters.previousWeek
  }
})
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
    <div class="flex flex-col lg:flex-row lg:items-end gap-3 flex-wrap">

      <!-- ── Cliente ID ────────────────────────────────────────────── -->
      <div class="flex-1 min-w-[180px]">
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center justify-between">
          <span><i class="fa-solid fa-store mr-1 text-brand-500"></i> Cliente (Opcional)</span>
          <span class="text-[10px] text-slate-400 capitalize bg-slate-100 px-1.5 py-0.5 rounded leading-none">
            {{ local.clientId ? 'Vista Específica' : 'Panorama Global' }}
          </span>
        </label>
        <input
          v-model="local.clientId"
          type="text"
          placeholder="Dejar vacío para Panorama Global"
          class="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400
                 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
        />
      </div>

      <!-- ── Año ──────────────────────────────────────────────────── -->
      <div class="w-28">
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          <i class="fa-solid fa-calendar mr-1 text-brand-500"></i> Año
        </label>
        <select
          v-model="local.year"
          class="w-full h-9 px-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800
                 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
        >
          <option value="">--</option>
          <option v-for="y in YEARS" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <!-- ── Semana Actual ─────────────────────────────────────────── -->
      <div class="w-36">
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          <i class="fa-solid fa-calendar-week mr-1 text-brand-500"></i> Semana Actual
        </label>
        <select
          v-model="local.currentWeek"
          class="w-full h-9 px-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800
                 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
        >
          <option value="">--</option>
          <option v-for="w in WEEKS" :key="w" :value="w">Sem {{ w }}</option>
        </select>
      </div>

      <!-- ── Semana Anterior ───────────────────────────────────────── -->
      <div class="w-36">
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"
               :class="{ 'opacity-50': !local.clientId }">
          <i class="fa-regular fa-calendar-minus mr-1 text-slate-400"></i> Sem Anak (Comp)
        </label>
        <select
          v-model="local.previousWeek"
          :disabled="!local.currentWeek || !local.clientId"
          class="w-full h-9 px-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800
                 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition
                 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">--</option>
          <option v-for="w in prevWeekOptions" :key="w" :value="w">Sem {{ w }}</option>
        </select>
      </div>

      <!-- ── Acciones ──────────────────────────────────────────────── -->
      <div class="flex items-end gap-2 ml-auto">
        <button
          @click="reset"
          class="h-9 px-3 rounded-lg border border-slate-200 text-slate-500 text-sm hover:bg-slate-50
                 hover:text-slate-700 transition-colors"
          title="Limpiar filtros"
        >
          <i class="fa-solid fa-rotate-left"></i>
        </button>
        <button
          @click="apply"
          :disabled="!canApply || store.isAnyLoading || store.isAnyLoadingGlobal"
          class="h-9 px-5 rounded-lg bg-brand-600 text-white text-sm font-semibold shadow-sm
                 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center gap-2"
        >
          <i v-if="store.isAnyLoading || store.isAnyLoadingGlobal" class="fa-solid fa-circle-notch fa-spin text-xs"></i>
          <i v-else class="fa-solid fa-magnifying-glass text-xs"></i>
          Consultar
        </button>
      </div>

    </div>

    <!-- ── Indicador de filtros activos ─────────────────────────────── -->
    <div v-if="store.filters.clientId" class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
      <span class="text-xs text-slate-400">Consultando Específico:</span>
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-medium">
        <i class="fa-solid fa-store text-[10px]"></i> {{ store.filters.clientId }}
      </span>
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium">
        <i class="fa-solid fa-calendar text-[10px]"></i> {{ store.filters.year }} · Sem {{ store.filters.currentWeek }}
      </span>
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium">
        <i class="fa-solid fa-arrow-right-arrow-left text-[10px]"></i> WoW vs Sem {{ store.filters.previousWeek }}
      </span>
    </div>
    <div v-else-if="store.globalFilters.semana" class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
      <span class="text-xs text-slate-400">Panorama General:</span>
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-medium">
        <i class="fa-solid fa-earth-americas text-[10px]"></i> Todas las Tiendas
      </span>
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium">
        <i class="fa-solid fa-calendar-week text-[10px]"></i> Sem {{ store.globalFilters.semana }} · {{ store.globalFilters.anio }}
      </span>
    </div>
  </div>
</template>