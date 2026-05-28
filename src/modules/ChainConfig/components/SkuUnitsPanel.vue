<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useChainConfigStore } from '../stores/chainConfigStore';
import type { ChainSkuUnit } from '../types/chainConfigTypes';

const store = useChainConfigStore();
const search = ref('');
const localRows = reactive<Record<string, ChainSkuUnit>>({});
const modifiedSkus = ref<Set<string>>(new Set());
const message = ref('');

watch(() => store.skuUnits, (rows) => {
   rows.forEach(row => {
      if (!modifiedSkus.value.has(row.sku_muliix)) {
         localRows[row.sku_muliix] = { ...row };
      }
   });
}, { immediate: true, deep: true });

const filteredRows = computed(() => {
   const query = search.value.trim().toLowerCase();
   return Object.values(localRows).filter(row =>
      !query ||
      row.sku_muliix.toLowerCase().includes(query) ||
      row.sku_nombre.toLowerCase().includes(query)
   );
});

const missingUnits = computed(() =>
   Object.values(localRows).filter(row => row.unidad_inventario == null || row.pzas_bolsa == null).length
);

function markChanged(sku: string) {
   modifiedSkus.value.add(sku);
}

function resetRow(sku: string) {
   const original = store.skuUnits.find(row => row.sku_muliix === sku);
   if (!original) return;
   localRows[sku] = { ...original };
   modifiedSkus.value.delete(sku);
}

async function saveChanges() {
   if (!modifiedSkus.value.size) return;
   message.value = 'Guardando conversiones...';
   const skus = Array.from(modifiedSkus.value);
   const results = await Promise.all(skus.map(sku => {
      const row = localRows[sku];
      if (!row) return false;
      return store.saveSkuUnit(sku, {
         unidad_inventario: row.unidad_inventario,
         pzas_caja: row.pzas_caja,
         kg_caja: row.kg_caja,
         cajas_pallet: row.cajas_pallet,
         pzas_pallet: row.pzas_pallet,
         pzas_bolsa: row.pzas_bolsa,
         unidad_ventau: row.unidad_ventau,
      });
   }));

   if (results.every(Boolean)) {
      modifiedSkus.value.clear();
      await store.fetchSkuUnits();
      message.value = 'Conversiones actualizadas. Cache CPFR invalidada por backend.';
   } else {
      message.value = 'Algunas conversiones no se pudieron guardar.';
   }
}
</script>

<template>
   <section class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <header class="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
         <div>
            <h2 class="text-sm font-black text-slate-800 uppercase tracking-tight">Unidades SKU</h2>
            <p class="text-xs text-slate-500">Solo conversiones operativas; codigo y nombre son de solo lectura.</p>
         </div>
         <input
            v-model="search"
            type="text"
            placeholder="Buscar SKU o producto..."
            class="h-10 w-full lg:w-80 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold outline-none focus:border-brand-400 focus:bg-white"
         >
      </header>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 border-b border-slate-100 bg-slate-50">
         <div class="bg-white border border-slate-100 rounded-lg p-3">
            <p class="text-[10px] uppercase tracking-widest text-slate-400 font-black">SKUs</p>
            <p class="text-xl font-black text-slate-800">{{ store.skuUnits.length }}</p>
         </div>
         <div class="bg-white border border-slate-100 rounded-lg p-3">
            <p class="text-[10px] uppercase tracking-widest text-slate-400 font-black">Incompletos</p>
            <p class="text-xl font-black" :class="missingUnits ? 'text-amber-600' : 'text-emerald-600'">{{ missingUnits }}</p>
         </div>
         <div class="bg-white border border-slate-100 rounded-lg p-3">
            <p class="text-[10px] uppercase tracking-widest text-slate-400 font-black">Editados</p>
            <p class="text-xl font-black text-brand-600">{{ modifiedSkus.size }}</p>
         </div>
      </div>

      <div v-if="store.loadingSkuUnits" class="py-16 text-center text-slate-400">
         <i class="fa-solid fa-circle-notch fa-spin text-2xl"></i>
         <p class="mt-2 text-xs font-bold uppercase tracking-widest">Cargando SKUs</p>
      </div>

      <div v-else class="overflow-x-auto">
         <table class="w-full text-sm">
            <thead class="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
               <tr>
                  <th class="px-4 py-3 text-left">SKU interno</th>
                  <th class="px-3 py-3 text-center">Kg/Pza</th>
                  <th class="px-3 py-3 text-center">Pzas/Caja</th>
                  <th class="px-3 py-3 text-center">Kg/Caja</th>
                  <th class="px-3 py-3 text-center">Cajas/Pallet</th>
                  <th class="px-3 py-3 text-center">Pzas/Pallet</th>
                  <th class="px-3 py-3 text-center">Pzas/Bolsa</th>
                  <th class="px-3 py-3 text-center">Unidad Venta</th>
                  <th class="px-4 py-3 text-right">Accion</th>
               </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
               <tr v-for="row in filteredRows" :key="row.sku_muliix" :class="modifiedSkus.has(row.sku_muliix) ? 'bg-amber-50/50' : 'hover:bg-slate-50'">
                  <td class="px-4 py-3 min-w-[280px]">
                     <p class="font-bold text-slate-800">{{ row.sku_nombre }}</p>
                     <span class="mt-1 inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-700 ring-1 ring-sky-100">
                        {{ row.sku_muliix }}
                     </span>
                  </td>
                  <td class="px-3 py-3"><input v-model.number="row.unidad_inventario" type="number" step="0.01" class="cell-input" @input="markChanged(row.sku_muliix)"></td>
                  <td class="px-3 py-3"><input v-model.number="row.pzas_caja" type="number" class="cell-input" @input="markChanged(row.sku_muliix)"></td>
                  <td class="px-3 py-3"><input v-model.number="row.kg_caja" type="number" step="0.01" class="cell-input" @input="markChanged(row.sku_muliix)"></td>
                  <td class="px-3 py-3"><input v-model.number="row.cajas_pallet" type="number" class="cell-input" @input="markChanged(row.sku_muliix)"></td>
                  <td class="px-3 py-3"><input v-model.number="row.pzas_pallet" type="number" class="cell-input" @input="markChanged(row.sku_muliix)"></td>
                  <td class="px-3 py-3"><input v-model.number="row.pzas_bolsa" type="number" class="cell-input" @input="markChanged(row.sku_muliix)"></td>
                  <td class="px-3 py-3"><input v-model.number="row.unidad_ventau" type="number" step="0.01" class="cell-input" @input="markChanged(row.sku_muliix)"></td>
                  <td class="px-4 py-3 text-right">
                     <button v-if="modifiedSkus.has(row.sku_muliix)" class="text-xs font-bold text-slate-400 hover:text-rose-500" @click="resetRow(row.sku_muliix)">Restaurar</button>
                  </td>
               </tr>
            </tbody>
         </table>
      </div>

      <footer class="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
         <p class="text-xs font-semibold" :class="message.includes('no se') ? 'text-rose-500' : 'text-slate-500'">{{ message || `${filteredRows.length} SKUs visibles` }}</p>
         <button
            :disabled="modifiedSkus.size === 0 || store.saving"
            class="h-10 px-4 rounded-lg bg-brand-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-30 hover:bg-brand-700 transition-colors"
            @click="saveChanges"
         >
            <i class="fa-solid fa-floppy-disk mr-2"></i>
            Guardar {{ modifiedSkus.size || '' }}
         </button>
      </footer>
   </section>
</template>

<style scoped>
.cell-input {
   width: 82px;
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
.cell-input:focus {
   border-color: rgb(59 130 246);
   background: white;
}
</style>
