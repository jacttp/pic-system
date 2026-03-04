<script setup lang="ts">
// src/modules/CPFR/components/CpfrFiltersPanel.vue
import { computed } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'

const store = useCpfrStore()

const jefaturasConTodas = computed(() => ['', ...store.filterOptions.jefaturas])
const diasConTodos      = computed(() => ['', ...store.filterOptions.dias])

const tiendasFiltradas = computed(() => {
  const base = store.filterOptions.tiendas
  if (!store.activeFilters.jefatura) return base
  // filtra tiendas por jefatura usando rawData como catálogo
  const ids = new Set(
    store.rawData
      .filter(r => r.jefatura === store.activeFilters.jefatura)
      .map(r => r.id_cliente)
  )
  return base.filter(t => ids.has(t.id))
})

function onYearChange() {
  store.fetchData()
}

function onSemanaChange() {
  store.fetchData()
}

function onJefaturaChange() {
  store.activeFilters.tienda = ''
}
</script>

<template>
  <div class="flex flex-wrap items-end gap-3">

    <!-- Año -->
    <div class="flex flex-col gap-1 min-w-[90px]">
      <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Año</label>
      <select
        v-model="store.activeFilters.ano"
        class="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        @change="onYearChange"
      >
        <option v-for="a in store.filterOptions.anos" :key="a" :value="a">{{ a }}</option>
      </select>
    </div>

    <!-- Semana -->
    <div class="flex flex-col gap-1 min-w-[100px]">
      <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Semana</label>
      <select
        v-model="store.activeFilters.semana"
        class="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        @change="onSemanaChange"
      >
        <option v-for="s in store.filterOptions.semanas" :key="s" :value="s">Sem. {{ s }}</option>
      </select>
    </div>

    <!-- Día -->
    <div class="flex flex-col gap-1 min-w-[130px]">
      <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Día</label>
      <select
        v-model="store.activeFilters.dia"
        class="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">Todos los días</option>
        <option v-for="d in diasConTodos.slice(1)" :key="d" :value="d">{{ d }}</option>
      </select>
    </div>

    <!-- Jefatura -->
    <div class="flex flex-col gap-1 min-w-[260px]">
      <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Jefatura</label>
      <select
        v-model="store.activeFilters.jefatura"
        class="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        @change="onJefaturaChange"
      >
        <option value="">Todas las jefaturas</option>
        <option v-for="j in store.filterOptions.jefaturas" :key="j" :value="j">{{ j }}</option>
      </select>
    </div>

    <!-- Tienda -->
    <div class="flex flex-col gap-1 min-w-[220px]">
      <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tienda</label>
      <select
        v-model="store.activeFilters.tienda"
        class="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">Todas las tiendas</option>
        <option v-for="t in tiendasFiltradas" :key="t.id" :value="t.id">{{ t.nombre }}</option>
      </select>
    </div>

  </div>
</template>