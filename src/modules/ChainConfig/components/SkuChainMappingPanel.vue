<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useChainConfigStore } from '../stores/chainConfigStore';
import type { ChainSkuMapping, ChainSkuMappingPayload } from '../types/chainConfigTypes';
import { ALLOWED_CHAINS, normalizeChain } from '../utils/chainConfigOptions';

const store = useChainConfigStore();
const search = ref('');
const selectedChain = ref<string>('');
const editingId = ref<number | null>(null);
const message = ref('');

const newForm = reactive<ChainSkuMappingPayload>({
   sku_muliix: '',
   sku_cadena: '',
   upc_cadena: '',
   nom_cadena: 'SORIANA',
});

const editForm = reactive<ChainSkuMappingPayload>({
   sku_muliix: '',
   sku_cadena: '',
   upc_cadena: '',
   nom_cadena: 'SORIANA',
});

const filteredMappings = computed(() => {
   const query = search.value.trim().toLowerCase();
   return store.skuMappings.filter(item => {
      const matchesChain = !selectedChain.value || item.nom_cadena === selectedChain.value;
      const matchesSearch = !query ||
         item.sku_muliix.toLowerCase().includes(query) ||
         item.sku_nombre.toLowerCase().includes(query) ||
         (item.sku_cadena || '').toLowerCase().includes(query) ||
         (item.upc_cadena || '').toLowerCase().includes(query);
      return matchesChain && matchesSearch;
   });
});

const incompleteCount = computed(() =>
   store.skuMappings.filter(item => !item.sku_cadena || !item.upc_cadena).length
);

function resetNewForm() {
   newForm.sku_muliix = '';
   newForm.sku_cadena = '';
   newForm.upc_cadena = '';
   newForm.nom_cadena = normalizeChain(newForm.nom_cadena);
}

async function createMapping() {
   if (!newForm.sku_muliix) {
      message.value = 'Selecciona un SKU interno antes de guardar.';
      return;
   }
   const ok = await store.createSkuMapping({
      ...newForm,
      sku_cadena: newForm.sku_cadena || null,
      upc_cadena: newForm.upc_cadena || null,
      nom_cadena: normalizeChain(newForm.nom_cadena),
   });
   message.value = ok ? 'Homologacion creada.' : 'No se pudo crear la homologacion.';
   if (ok) resetNewForm();
}

function startEdit(mapping: ChainSkuMapping) {
   editingId.value = mapping.idskuscadenas;
   editForm.sku_muliix = mapping.sku_muliix;
   editForm.sku_cadena = mapping.sku_cadena;
   editForm.upc_cadena = mapping.upc_cadena;
   editForm.nom_cadena = normalizeChain(mapping.nom_cadena);
}

function cancelEdit() {
   editingId.value = null;
}

async function saveEdit(id: number) {
   const ok = await store.updateSkuMapping(id, {
      ...editForm,
      sku_cadena: editForm.sku_cadena || null,
      upc_cadena: editForm.upc_cadena || null,
      nom_cadena: normalizeChain(editForm.nom_cadena),
   });
   message.value = ok ? 'Homologacion actualizada.' : 'No se pudo actualizar la homologacion.';
   if (ok) editingId.value = null;
}

async function deleteMapping(id: number) {
   if (!confirm('Eliminar esta asociacion SKU-cadena?')) return;
   const ok = await store.deleteSkuMapping(id);
   message.value = ok ? 'Homologacion eliminada.' : 'No se pudo eliminar la homologacion.';
}
</script>

<template>
   <section class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <header class="p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
         <div>
            <h2 class="text-sm font-black text-slate-800 uppercase tracking-tight">SKU por Cadena</h2>
            <p class="text-xs text-slate-500">Relaciona productos internos con codigos, UPC y nombres externos.</p>
         </div>
         <div class="flex flex-col sm:flex-row gap-3">
            <select v-model="selectedChain" class="control w-full sm:w-44">
               <option value="">Todas las cadenas</option>
               <option v-for="chain in ALLOWED_CHAINS" :key="chain" :value="chain">{{ chain }}</option>
            </select>
            <input v-model="search" type="text" placeholder="Buscar SKU, UPC o nombre..." class="control w-full sm:w-80">
         </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-[360px_1fr] min-h-[520px]">
         <aside class="border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50 p-5">
            <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
               <h3 class="text-xs font-black text-slate-700 uppercase tracking-widest mb-4">Nueva homologacion</h3>
               <div class="space-y-3">
                  <label class="block">
                     <span class="field-label">SKU interno</span>
                     <select v-model="newForm.sku_muliix" class="control w-full">
                        <option value="" disabled>Selecciona un SKU...</option>
                        <option v-for="sku in store.skuOptions" :key="sku.sku_muliix" :value="sku.sku_muliix">
                           {{ sku.sku_muliix }} - {{ sku.sku_nombre }}
                        </option>
                     </select>
                  </label>
                  <label class="block">
                     <span class="field-label">Cadena</span>
                     <select v-model="newForm.nom_cadena" class="control w-full">
                        <option v-for="chain in ALLOWED_CHAINS" :key="chain" :value="chain">{{ chain }}</option>
                     </select>
                  </label>
                  <label class="block">
                     <span class="field-label">UPC cadena</span>
                     <input v-model="newForm.upc_cadena" type="text" class="control w-full" placeholder="750...">
                  </label>
                  <label class="block">
                     <span class="field-label">Nombre / codigo en cadena</span>
                     <input v-model="newForm.sku_cadena" type="text" class="control w-full" placeholder="Descripcion externa">
                  </label>
                  <button
                     :disabled="store.saving"
                     class="w-full h-10 rounded-lg bg-brand-600 text-white text-xs font-black uppercase tracking-widest hover:bg-brand-700 disabled:opacity-40"
                     @click="createMapping"
                  >
                     <i class="fa-solid fa-plus mr-2"></i>
                     Crear asociacion
                  </button>
               </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mt-4">
               <div class="bg-white border border-slate-100 rounded-lg p-3">
                  <p class="text-[10px] uppercase tracking-widest text-slate-400 font-black">Mapeos</p>
                  <p class="text-xl font-black text-slate-800">{{ store.skuMappings.length }}</p>
               </div>
               <div class="bg-white border border-slate-100 rounded-lg p-3">
                  <p class="text-[10px] uppercase tracking-widest text-slate-400 font-black">Incompletos</p>
                  <p class="text-xl font-black" :class="incompleteCount ? 'text-amber-600' : 'text-emerald-600'">{{ incompleteCount }}</p>
               </div>
            </div>
         </aside>

         <div>
            <div v-if="store.loadingMappings" class="py-16 text-center text-slate-400">
               <i class="fa-solid fa-circle-notch fa-spin text-2xl"></i>
               <p class="mt-2 text-xs font-bold uppercase tracking-widest">Cargando homologaciones</p>
            </div>

            <div v-else class="overflow-x-auto">
               <table class="w-full text-sm">
                  <thead class="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                     <tr>
                        <th class="px-4 py-3 text-left">SKU interno</th>
                        <th class="px-3 py-3 text-left">Cadena</th>
                        <th class="px-3 py-3 text-left">UPC</th>
                        <th class="px-3 py-3 text-left">Nombre cadena</th>
                        <th class="px-4 py-3 text-right">Acciones</th>
                     </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                     <tr v-for="item in filteredMappings" :key="item.idskuscadenas" class="hover:bg-slate-50">
                        <template v-if="editingId === item.idskuscadenas">
                           <td class="px-4 py-3 min-w-[280px]">
                              <select v-model="editForm.sku_muliix" class="control w-full">
                                 <option v-for="sku in store.skuOptions" :key="sku.sku_muliix" :value="sku.sku_muliix">
                                    {{ sku.sku_muliix }} - {{ sku.sku_nombre }}
                                 </option>
                              </select>
                           </td>
                           <td class="px-3 py-3">
                              <select v-model="editForm.nom_cadena" class="control w-36">
                                 <option v-for="chain in ALLOWED_CHAINS" :key="chain" :value="chain">{{ chain }}</option>
                              </select>
                           </td>
                           <td class="px-3 py-3"><input v-model="editForm.upc_cadena" type="text" class="control w-40"></td>
                           <td class="px-3 py-3"><input v-model="editForm.sku_cadena" type="text" class="control w-64"></td>
                           <td class="px-4 py-3 text-right whitespace-nowrap">
                              <button class="text-xs font-bold text-slate-400 hover:text-slate-600 mr-3" @click="cancelEdit">Cancelar</button>
                              <button class="text-xs font-black text-brand-600 hover:text-brand-700" @click="saveEdit(item.idskuscadenas)">Guardar</button>
                           </td>
                        </template>
                        <template v-else>
                           <td class="px-4 py-3 min-w-[260px]">
                              <p class="font-bold text-slate-800">{{ item.sku_nombre }}</p>
                              <span class="mt-1 inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-700 ring-1 ring-sky-100">
                                 {{ item.sku_muliix }}
                              </span>
                           </td>
                           <td class="px-3 py-3">
                              <span class="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 text-[10px] font-black">{{ item.nom_cadena }}</span>
                           </td>
                           <td class="px-3 py-3">
                              <span class="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-700 ring-1 ring-amber-100">
                                 {{ item.upc_cadena || 'N/D' }}
                              </span>
                           </td>
                           <td class="px-3 py-3 text-xs min-w-[220px]">
                              <span class="inline-flex items-center rounded-md bg-slate-50 px-1.5 py-0.5 font-semibold text-slate-600 ring-1 ring-slate-100">
                                 {{ item.sku_cadena || 'N/D' }}
                              </span>
                           </td>
                           <td class="px-4 py-3 text-right whitespace-nowrap">
                              <button class="w-8 h-8 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50" @click="startEdit(item)">
                                 <i class="fa-solid fa-pen"></i>
                              </button>
                              <button class="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" @click="deleteMapping(item.idskuscadenas)">
                                 <i class="fa-solid fa-trash"></i>
                              </button>
                           </td>
                        </template>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>
      </div>

      <footer class="px-5 py-4 bg-slate-50 border-t border-slate-100">
         <p class="text-xs font-semibold" :class="message.includes('No se') ? 'text-rose-500' : 'text-slate-500'">{{ message || `${filteredMappings.length} homologaciones visibles` }}</p>
      </footer>
   </section>
</template>

<style scoped>
.control {
   height: 40px;
   border-radius: 8px;
   border: 1px solid rgb(226 232 240);
   background: rgb(248 250 252);
   padding: 0 12px;
   font-size: 12px;
   font-weight: 700;
   color: rgb(51 65 85);
   outline: none;
}
.control:focus {
   border-color: rgb(59 130 246);
   background: white;
}
.field-label {
   display: block;
   margin-bottom: 6px;
   font-size: 10px;
   font-weight: 900;
   color: rgb(148 163 184);
   text-transform: uppercase;
   letter-spacing: .08em;
}
</style>
