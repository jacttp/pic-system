<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useChainConfigStore } from '../stores/chainConfigStore';
import type { ChainStoreConfig } from '../types/chainConfigTypes';
import { DAY_OPTIONS } from '../utils/chainConfigOptions';

const store = useChainConfigStore();
const search = ref('');
const selectedDay = ref<number | ''>('');
const localRows = reactive<Record<string, ChainStoreConfig>>({});
const modifiedIds = ref<Set<string>>(new Set());
const message = ref('');

watch(() => store.storeConfigs, (rows) => {
   rows.forEach(row => {
      if (!modifiedIds.value.has(row.id_cliente)) {
         localRows[row.id_cliente] = { ...row };
      }
   });
}, { immediate: true, deep: true });

const filteredRows = computed(() => {
   const query = search.value.trim().toLowerCase();
   return Object.values(localRows).filter(row => {
      const matchesDay = selectedDay.value === '' || row.dia_ventas === Number(selectedDay.value);
      const matchesSearch = !query ||
         row.id_cliente.toLowerCase().includes(query) ||
         (row.nombre_tienda || '').toLowerCase().includes(query) ||
         (row.Jefatura || row.jefatura || '').toLowerCase().includes(query);
      return matchesDay && matchesSearch;
   });
});

const modifiedCount = computed(() => modifiedIds.value.size);

const compactDayOptions = DAY_OPTIONS.map(day => ({
   ...day,
   label: day.label.slice(0, 3),
}));

function markChanged(idCliente: string) {
   modifiedIds.value.add(idCliente);
}

function resetRow(idCliente: string) {
   const original = store.storeConfigs.find(row => row.id_cliente === idCliente);
   if (!original) return;
   localRows[idCliente] = { ...original };
   modifiedIds.value.delete(idCliente);
}

async function saveChanges() {
   if (!modifiedIds.value.size) return;
   message.value = 'Guardando cambios...';
   const ids = Array.from(modifiedIds.value);
   const results = await Promise.all(ids.map(id => {
      const row = localRows[id];
      if (!row) return false;
      return store.saveStoreConfig(id, {
         dia_cadena: Number(row.dia_cadena),
         dia_ventas: Number(row.dia_ventas),
         lead_time: Number(row.lead_time),
         semanas_objetivo: Number(row.semanas_objetivo),
         semanas_sellout: Number(row.semanas_sellout),
      });
   }));

   if (results.every(Boolean)) {
      modifiedIds.value.clear();
      await store.fetchStoreConfigs();
      message.value = 'Configuracion de tiendas actualizada.';
   } else {
      message.value = 'Algunos registros no se pudieron guardar.';
   }
}
</script>

<template>
   <section class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <header class="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
         <div>
            <h2 class="text-sm font-black text-slate-800 uppercase tracking-tight">Tiendas CPFR</h2>
            <p class="text-xs text-slate-500">Parametros logisticos por tienda existente.</p>
         </div>
         <div class="flex flex-col sm:flex-row gap-3">
            <input
               v-model="search"
               type="text"
               placeholder="Buscar tienda, id o jefatura..."
               class="h-10 w-full sm:w-72 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold outline-none focus:border-brand-400 focus:bg-white"
            >
            <select
               v-model="selectedDay"
               class="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-brand-400 focus:bg-white"
            >
               <option value="">Todos los dias</option>
               <option v-for="day in DAY_OPTIONS" :key="day.value" :value="day.value">{{ day.label }}</option>
            </select>
         </div>
      </header>

      <div v-if="store.loadingStores" class="py-16 text-center text-slate-400">
         <i class="fa-solid fa-circle-notch fa-spin text-2xl"></i>
         <p class="mt-2 text-xs font-bold uppercase tracking-widest">Cargando tiendas</p>
      </div>

      <div v-else class="overflow-x-auto">
         <table class="w-full text-sm table-fixed">
            <thead class="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
               <tr>
                  <th class="w-[32%] px-4 py-3 text-left">Tienda</th>
                  <th class="w-[10%] px-3 py-3 text-center">Dia Cadena</th>
                  <th class="w-[10%] px-3 py-3 text-center">Dia Ventas</th>
                  <th class="w-[9%] px-3 py-3 text-center">Lead Time</th>
                  <th class="w-[9%] px-3 py-3 text-center">Sem. Obj.</th>
                  <th class="w-[9%] px-3 py-3 text-center">Sellout</th>
                  <th class="w-[9%] px-3 py-3 text-center">Factor</th>
                  <th class="w-[12%] px-4 py-3 text-right">Accion</th>
               </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
               <tr v-for="row in filteredRows" :key="row.id_cliente" :class="modifiedIds.has(row.id_cliente) ? 'bg-amber-50/50' : 'hover:bg-slate-50'">
                  <td class="px-4 py-3">
                     <p class="font-bold text-slate-800">{{ row.nombre_tienda || 'Sin nombre' }}</p>
                     <div class="mt-1 flex flex-wrap items-center gap-1.5">
                        <span class="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-700 ring-1 ring-sky-100">
                           {{ row.id_cliente }}
                        </span>
                        <span class="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                           {{ row.Jefatura || row.jefatura || 'N/D' }}
                        </span>
                     </div>
                  </td>
                  <td class="px-3 py-3 text-center">
                     <select v-model.number="row.dia_cadena" class="cell-select" @change="markChanged(row.id_cliente)">
                        <option v-for="day in compactDayOptions" :key="day.value" :value="day.value">{{ day.label }}</option>
                     </select>
                  </td>
                  <td class="px-3 py-3 text-center">
                     <select v-model.number="row.dia_ventas" class="cell-select" @change="markChanged(row.id_cliente)">
                        <option v-for="day in compactDayOptions" :key="day.value" :value="day.value">{{ day.label }}</option>
                     </select>
                  </td>
                  <td class="px-3 py-3 text-center"><input v-model.number="row.lead_time" type="number" min="0" class="cell-input" @input="markChanged(row.id_cliente)"></td>
                  <td class="px-3 py-3 text-center"><input v-model.number="row.semanas_objetivo" type="number" min="0.5" step="0.5" class="cell-input" @input="markChanged(row.id_cliente)"></td>
                  <td class="px-3 py-3 text-center"><input v-model.number="row.semanas_sellout" type="number" min="1" class="cell-input" @input="markChanged(row.id_cliente)"></td>
                  <td class="px-3 py-3 text-center font-mono text-xs text-slate-500">{{ row.factor_ajuste ?? 'N/D' }}</td>
                  <td class="px-4 py-3 text-right">
                     <button v-if="modifiedIds.has(row.id_cliente)" class="text-xs font-bold text-slate-400 hover:text-rose-500" @click="resetRow(row.id_cliente)">Restaurar</button>
                  </td>
               </tr>
            </tbody>
         </table>
      </div>

      <footer class="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
         <p class="text-xs font-semibold" :class="message.includes('no se') ? 'text-rose-500' : 'text-slate-500'">{{ message || `${filteredRows.length} tiendas visibles` }}</p>
         <button
            :disabled="modifiedCount === 0 || store.saving"
            class="h-10 px-4 rounded-lg bg-brand-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-30 hover:bg-brand-700 transition-colors"
            @click="saveChanges"
         >
            <i class="fa-solid fa-floppy-disk mr-2"></i>
            Guardar {{ modifiedCount || '' }}
         </button>
      </footer>
   </section>
</template>

<style scoped>
.cell-input,
.cell-select {
   width: 84px;
   height: 34px;
   border-radius: 8px;
   border: 1px solid rgb(226 232 240);
   background: rgb(248 250 252);
   text-align: center;
   font-size: 12px;
   font-weight: 700;
   color: rgb(51 65 85);
   outline: none;
}
.cell-input:focus,
.cell-select:focus {
   border-color: rgb(59 130 246);
   background: white;
}
</style>
