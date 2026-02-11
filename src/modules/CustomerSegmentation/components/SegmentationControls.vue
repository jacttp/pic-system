<script setup lang="ts">
import { useSegmentationStore } from '../stores/segmentationStore';
import { storeToRefs } from 'pinia';

const store = useSegmentationStore();
const { filters, isLoading } = storeToRefs(store);

const measures = [
  { label: 'Cuartiles (4)', value: 4 },
  { label: 'Quintiles (5)', value: 5 },
  { label: 'Deciles (10)', value: 10 },
  { label: 'Percentiles (100)', value: 100 },
];

const groupOptions = ['Gerencia', 'Zona', 'Jefatura', 'Ruta', 'Canal'];

const applyFilters = () => {
  store.fetchData();
};
</script>

<template>
  <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-4">
    <div class="flex flex-col gap-1">
      <label class="text-xs font-bold text-slate-500 uppercase">Segmentación</label>
      <select 
        v-model="filters.measure" 
        class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option v-for="m in measures" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-xs font-bold text-slate-500 uppercase">Agrupar por</label>
      <select 
        v-model="filters.groupBy" 
        class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option v-for="opt in groupOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
    </div>

    <button 
      @click="applyFilters"
      :disabled="isLoading"
      class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
    >
      <span v-if="isLoading" class="animate-spin text-lg">↻</span>
      {{ isLoading ? 'Procesando...' : 'Actualizar Análisis' }}
    </button>
  </div>
</template>