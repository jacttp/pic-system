<!-- src/modules/Callbook/components/CallbookWeekSelector.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCallbookStore } from '../stores/callbookStore'

const store = useCallbookStore()

const YEARS = ['2024', '2025', '2026']
const WEEKS = Array.from({ length: 52 }, (_, i) => String(i + 1).padStart(2, '0'))

const localAnio   = ref(store.globalFilters.anio)
const localSemana = ref(store.globalFilters.semana)

// Sincronizar cuando el store se actualiza desde onMounted de la vista
watch(
  () => store.globalFilters.anio,
  (v) => { localAnio.value = v },
  { immediate: true }
)

watch(
  () => store.globalFilters.semana,
  (v) => { if (v) localSemana.value = v },
  { immediate: true }
)

function apply() {
  store.setGlobalAnio(localAnio.value)
  store.setGlobalSemana(localSemana.value)
  store.fetchGlobalDashboard(localSemana.value)
}
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
    <div class="flex flex-col sm:flex-row sm:items-end gap-3">

      <!-- Label -->
      <div class="flex items-center gap-2 sm:mr-2">
        <div class="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
          <i class="fa-solid fa-earth-americas text-brand-600 text-xs"></i>
        </div>
        <div>
          <p class="text-xs font-bold text-slate-700">Panorama General</p>
          <p class="text-[10px] text-slate-400">Todas las tiendas</p>
        </div>
      </div>

      <div class="h-px sm:h-8 sm:w-px bg-slate-100 sm:bg-slate-200"></div>

      <!-- Año -->
      <div class="w-28">
        <label class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Año
        </label>
        <select
          v-model="localAnio"
          class="w-full h-9 px-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800
                 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
        >
          <option v-for="y in YEARS" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <!-- Semana -->
      <div class="w-36">
        <label class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Semana
        </label>
        <select
          v-model="localSemana"
          class="w-full h-9 px-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800
                 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
        >
          <option value="">-- Selecciona</option>
          <option v-for="w in WEEKS" :key="w" :value="w">Sem {{ w }}</option>
        </select>
      </div>

      <!-- Aplicar -->
      <button
        @click="apply"
        :disabled="!localAnio || !localSemana || store.isAnyLoadingGlobal"
        class="h-9 px-5 rounded-lg bg-brand-600 text-white text-sm font-semibold shadow-sm
               hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
               flex items-center gap-2"
      >
        <i
          class="text-xs"
          :class="store.isAnyLoadingGlobal
            ? 'fa-solid fa-circle-notch fa-spin'
            : 'fa-solid fa-magnifying-glass'"
        ></i>
        Consultar
      </button>

      <!-- Indicador activo -->
      <div
        v-if="store.globalFilters.semana"
        class="flex items-center gap-1.5 text-xs text-slate-400 sm:ml-1"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
        {{ store.globalFilters.anio }} · Sem {{ store.globalFilters.semana }}
      </div>

    </div>
  </div>
</template>