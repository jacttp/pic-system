<script setup lang="ts">
// src/modules/CPFR/components/CpfrFiltersPanel.vue
// Filtros: Día, Jefatura, Tienda → disparan loadDashboard() en el store
import { useCpfrStore } from '../stores/cpfrStore'

const store = useCpfrStore()

function onChangeDia(e: Event) {
    const val = (e.target as HTMLSelectElement).value
    store.setFilter('dia', val ? Number(val) : undefined)
    store.loadDashboard()
}

function onChangeJefatura(e: Event) {
    const val = (e.target as HTMLSelectElement).value
    store.setFilter('jefatura', val || undefined)
    store.loadDashboard()
}

function onChangeTienda(e: Event) {
    const val = (e.target as HTMLSelectElement).value
    store.setFilter('id_cliente', val || undefined)
    store.loadDashboard()
}

function clearAll() {
    store.clearFilters()
    store.loadDashboard()
}

const hasFilters = () =>
    store.filters.dia != null ||
    !!store.filters.jefatura ||
    !!store.filters.id_cliente
</script>

<template>
  <div class="flex items-center gap-3 flex-wrap">

    <!-- Día -->
    <div class="flex flex-col gap-0.5">
      <label class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Día</label>
      <select
        class="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 min-w-[120px]"
        :value="store.filters.dia ?? ''"
        @change="onChangeDia"
      >
        <option value="">Todos</option>
        <option v-for="d in store.diaOptions" :key="d.num" :value="d.num">
          {{ d.nombre }}
        </option>
      </select>
    </div>

    <!-- Jefatura -->
    <div class="flex flex-col gap-0.5">
      <label class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Jefatura</label>
      <select
        class="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 min-w-[220px]"
        :value="store.filters.jefatura ?? ''"
        @change="onChangeJefatura"
      >
        <option value="">Todas</option>
        <option v-for="j in store.jefaturaOptions" :key="j" :value="j">{{ j }}</option>
      </select>
    </div>

    <!-- Tienda -->
    <div class="flex flex-col gap-0.5">
      <label class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Tienda</label>
      <select
        class="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 min-w-[200px]"
        :value="store.filters.id_cliente ?? ''"
        @change="onChangeTienda"
      >
        <option value="">Todas</option>
        <option v-for="t in store.tiendaOptions" :key="t.id" :value="t.id">{{ t.nombre }}</option>
      </select>
    </div>

    <!-- Limpiar filtros -->
    <button
      v-if="hasFilters()"
      class="self-end text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-colors"
      @click="clearAll"
    >
      <i class="fa-solid fa-xmark mr-1"></i>
      Limpiar
    </button>

  </div>
</template>