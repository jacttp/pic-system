<script setup lang="ts">
// src/modules/SellOut/components/SellOutFilters.vue
import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSellOutStore } from '../stores/selloutStore'

const store = useSellOutStore()
const {
  filters,
  filterOptions,
  isLoadingFilters,
  isLoadingDashboard,
} = storeToRefs(store)

// ─── Watchers ─────────────────────────────────────────────────────────────────

watch(() => filters.value.año, async (año) => {
  if (año) await store.fetchWeeks(año)
})

// flush:'post' garantiza que Vue procesó el DOM antes de disparar el dashboard
watch(() => filters.value.semana, (semana) => {
  if (semana) store.fetchDashboard()
}, { flush: 'post' })

// ─── Handlers ────────────────────────────────────────────────────────────────

// Normalizar semana a entero-string para que coincida con filters.semana
// "09" → "9", "10" → "10". Consistencia con el store.
function onSemanaChange(e: Event) {
  const raw = (e.target as HTMLSelectElement).value
  filters.value.semana = String(parseInt(raw))
}

function onGerenciaChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  store.onGerenciaChange(val || null)
}

function onRutaChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  store.onRutaChange(val || null)
}

function onSkuChange(e: Event) {
  filters.value.sku = (e.target as HTMLSelectElement).value || null
}

function onApply() {
  store.fetchDashboard()
}

function onReset() {
  store.resetFilters()
  store.fetchDashboard()
}

const isDisabled = (condition: boolean) => condition || isLoadingDashboard.value
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">

    <div v-if="isLoadingFilters" class="flex gap-3 animate-pulse">
      <div v-for="i in 5" :key="i" class="h-9 bg-slate-100 rounded-lg flex-1" />
    </div>

    <div v-else class="flex flex-wrap items-end gap-3">

      <!-- Año -->
      <div class="flex flex-col gap-1 min-w-[90px]">
        <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Año</label>
        <div class="relative">
          <select
            v-model="filters.año"
            :disabled="isDisabled(false)"
            class="appearance-none w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-7 text-sm text-slate-700 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <option v-for="a in filterOptions.años" :key="a" :value="a">{{ a }}</option>
          </select>
          <i class="fa-solid fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
        </div>
      </div>

      <!-- Semana
           :value en la option usa parseInt para normalizar "09" → "9"
           y coincidir con filters.semana que siempre es string de entero -->
      <div class="flex flex-col gap-1 min-w-[160px]">
        <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Semana</label>
        <div class="relative">
          <select
            :value="filters.semana"
            :disabled="isDisabled(filterOptions.semanas.length === 0)"
            @change="onSemanaChange"
            class="appearance-none w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-7 text-sm text-slate-700 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <option
              v-for="s in filterOptions.semanas"
              :key="s.semana"
              :value="String(parseInt(s.semana))"
            >
              {{ s.label }}
            </option>
          </select>
          <i class="fa-solid fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
        </div>
      </div>

      <div class="hidden sm:block h-9 w-px bg-slate-200 self-end mb-0.5" />

      <!-- Gerencia -->
      <div class="flex flex-col gap-1 min-w-[160px]">
        <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Gerencia</label>
        <div class="relative">
          <select
            :value="filters.gerencia ?? ''"
            :disabled="isDisabled(false)"
            @change="onGerenciaChange"
            class="appearance-none w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-7 text-sm text-slate-700 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <option value="">Todas</option>
            <option v-for="g in filterOptions.gerencias" :key="g" :value="g">{{ g }}</option>
          </select>
          <i class="fa-solid fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
        </div>
      </div>

      <!-- Ruta -->
      <div class="flex flex-col gap-1 min-w-[140px]">
        <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Ruta</label>
        <div class="relative">
          <select
            :value="filters.ruta ?? ''"
            :disabled="isDisabled(!filters.gerencia)"
            @change="onRutaChange"
            class="appearance-none w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-7 text-sm text-slate-700 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <option value="">Todas</option>
            <option v-for="r in filterOptions.rutas" :key="r" :value="r">{{ r }}</option>
          </select>
          <i class="fa-solid fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
        </div>
      </div>

      <!-- SKU -->
      <div class="flex flex-col gap-1 min-w-[180px]">
        <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">SKU</label>
        <div class="relative">
          <select
            :value="filters.sku ?? ''"
            :disabled="isDisabled(filterOptions.skus.length === 0)"
            @change="onSkuChange"
            class="appearance-none w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-7 text-sm text-slate-700 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <option value="">Todos</option>
            <option v-for="s in filterOptions.skus" :key="s.sku" :value="s.sku">{{ s.nombre }}</option>
          </select>
          <i class="fa-solid fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
        </div>
      </div>

      <!-- Acciones -->
      <div class="flex items-end gap-2 ml-auto">
        <button
          :disabled="isDisabled(false)"
          @click="onReset"
          class="h-9 px-3 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
          title="Limpiar filtros opcionales"
        >
          <i class="fa-solid fa-rotate-left text-xs" />
        </button>

        <button
          :disabled="isDisabled(false)"
          @click="onApply"
          class="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i v-if="isLoadingDashboard" class="fa-solid fa-spinner animate-spin text-xs" />
          <i v-else class="fa-solid fa-magnifying-glass text-xs" />
          <span>{{ isLoadingDashboard ? 'Cargando...' : 'Aplicar' }}</span>
        </button>
      </div>

    </div>
  </div>
</template>