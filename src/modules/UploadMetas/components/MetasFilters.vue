<script setup lang="ts">
import { computed } from 'vue'
import { useUploadMetasStore } from '../stores/uploadMetasStore'
import type { UploadTarget, AaaFilter } from '../types/uploadMetas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const store = useUploadMetasStore()

// ── Helpers de mes ────────────────────────────────────────────────────────────

/** YYYY-MM del mes actual */
const todayYYYYMM = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Calcula primero y último día del mes dado 'YYYY-MM' */
const monthToDates = (ym: string) => {
  if (!ym) return { inicio: '', fin: '' }
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y!, m!, 0).getDate()
  return {
    inicio: `${ym}-01`,
    fin:    `${ym}-${String(lastDay).padStart(2, '0')}`,
  }
}

/**
 * Computed bidireccional: lee el mes desde fechaInicio del store
 * y al asignarse actualiza fechaInicio + fechaFin automáticamente.
 */
const monthValue = computed({
  get() {
    return store.filters.fechaInicio?.slice(0, 7) || todayYYYYMM()
  },
  set(ym: string) {
    const { inicio, fin } = monthToDates(ym)
    store.filters.fechaInicio = inicio
    store.filters.fechaFin   = fin
  },
})

// ── Filtros ───────────────────────────────────────────────────────────────────

const applyFilters = async () => {
  store.pagination.page = 1
  await store.fetchMetas()
}

const clearFilters = async () => {
  store.filters.clienteMuliix = ''
  store.filters.skum          = ''
  store.filters.aaa           = 'Metas'   // vuelve al default útil
  // Resetear al mes actual
  const { inicio, fin } = monthToDates(todayYYYYMM())
  store.filters.fechaInicio = inicio
  store.filters.fechaFin    = fin
  store.pagination.page = 1
  await store.fetchMetas()
}

const setAaa = async (val: AaaFilter) => {
  store.filters.aaa = val
  await applyFilters()
}

// Sin la opción "Todos" — default siempre es Metas
const aaaOptions: { value: AaaFilter; label: string; activeClass: string }[] = [
  { value: 'venta', label: 'Venta', activeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'Metas', label: 'Metas', activeClass: 'bg-teal-100 text-teal-800 border-teal-300' },
]

const tabOptions: { key: UploadTarget; label: string; color: string; active: string }[] = [
  {
    key:    'test',
    label:  'VentasIC60',
    color:  'border-slate-200 text-slate-600 hover:bg-slate-50',
    active: 'bg-amber-100 text-amber-800 border-amber-300 font-bold shadow-sm',
  },
  {
    key:    'prod',
    label:  'VentasIC',
    color:  'border-slate-200 text-slate-600 hover:bg-slate-50',
    active: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold shadow-sm',
  },
]
</script>

<template>
  <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">

    <!-- Row 1: Vista tabla + búsquedas -->
    <div class="flex flex-col md:flex-row items-start md:items-center gap-3">

      <!-- Selector de tabla (vista) -->
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
          <i class="fa-solid fa-eye mr-1"></i> Ver:
        </span>
        <button
          v-for="opt in tabOptions"
          :key="opt.key"
          class="px-3 py-1.5 rounded-full text-xs border transition-all"
          :class="store.tablaVista === opt.key ? opt.active : opt.color"
          @click="store.setTablaVista(opt.key)"
        >
          <span
            class="inline-block px-1 rounded text-[9px] font-mono mr-1"
            :class="opt.key === 'test' ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'"
          >
            {{ opt.key === 'test' ? 'DEV' : 'PROD' }}
          </span>
          {{ opt.label }}
        </button>
      </div>

      <!-- Spacer -->
      <div class="hidden md:block h-6 w-px bg-slate-200 mx-1"></div>

      <!-- ClienteMuliix -->
      <div class="relative w-full md:w-60">
        <i class="fa-solid fa-store absolute left-3 top-2.5 text-slate-400 text-sm"></i>
        <Input
          v-model="store.filters.clienteMuliix"
          placeholder="Cliente Muliix..."
          class="pl-9 h-9 border-slate-200 bg-slate-50/80 rounded-full text-sm font-medium focus-visible:ring-teal-500"
          @keyup.enter="applyFilters"
        />
      </div>

      <!-- SKU -->
      <div class="relative w-full md:w-48">
        <i class="fa-solid fa-barcode absolute left-3 top-2.5 text-slate-400 text-sm"></i>
        <Input
          v-model="store.filters.skum"
          placeholder="SKU..."
          class="pl-9 h-9 border-slate-200 bg-slate-50/80 rounded-full text-sm font-medium focus-visible:ring-teal-500"
          @keyup.enter="applyFilters"
        />
      </div>

    </div>

    <!-- Row 2: Filtro columna "aaa" -->
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <i class="fa-solid fa-tag mr-1"></i> Tipo:
      </span>
      <button
        v-for="opt in aaaOptions"
        :key="opt.value"
        class="px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200"
        :class="store.filters.aaa === opt.value
          ? opt.activeClass + ' shadow-sm'
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'"
        @click="setAaa(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Divider -->
    <div class="h-px w-full bg-slate-100"></div>

    <!-- Row 2: Fechas + acciones -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">

        <!-- Selector mensual -->
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <i class="fa-regular fa-calendar-days mr-1"></i> Mes:
        </span>
        <input
          type="month"
          v-model="monthValue"
          class="h-8 px-2.5 text-sm border border-slate-200 rounded-lg bg-white font-medium shadow-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all"
          @change="applyFilters"
        />
      </div>

      <div class="flex items-center gap-3">
        <button
          class="text-[11px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors"
          @click="clearFilters"
        >
          Limpiar
        </button>
        <Button
          size="sm"
          class="h-9 bg-teal-700 hover:bg-teal-800 border border-teal-600 shadow-md font-bold px-5 rounded-full text-white"
          @click="applyFilters"
        >
          FILTRAR <i class="fa-solid fa-arrow-right ml-2 text-[10px]"></i>
        </Button>
      </div>

    </div>
  </div>
</template>
