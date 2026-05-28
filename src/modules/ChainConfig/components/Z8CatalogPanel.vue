<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useChainConfigStore } from '../stores/chainConfigStore';
import type { ChainZ8CatalogItem, ChainZ8CatalogPayload } from '../types/chainConfigTypes';
import { normalizeZ8Permission, Z8_PERMISSION_OPTIONS } from '../utils/chainConfigOptions';

const store = useChainConfigStore();
const search = ref('');
const selectedPermission = ref<string>('');
const editingId = ref<number | null>(null);
const message = ref('');

const newForm = reactive<ChainZ8CatalogPayload>({
   id_cliente: '',
   permiso_oc: 'z8',
   sku_muliix: '',
   par_muliix: null,
   mixbase: null,
   mixpar: null,
});

const editForm = reactive<ChainZ8CatalogPayload>({
   id_cliente: '',
   permiso_oc: 'z8',
   sku_muliix: '',
   par_muliix: null,
   mixbase: null,
   mixpar: null,
});

const filteredItems = computed(() => {
   const query = search.value.trim().toLowerCase();
   return store.z8Catalog.filter(item => {
      const matchesPermission = !selectedPermission.value || item.permiso_oc === selectedPermission.value;
      const matchesSearch = !query ||
         item.id_cliente.toLowerCase().includes(query) ||
         (item.nombre_tienda || '').toLowerCase().includes(query) ||
         (item.Jefatura || '').toLowerCase().includes(query) ||
         item.sku_muliix.toLowerCase().includes(query) ||
         item.sku_nombre.toLowerCase().includes(query) ||
         (item.par_muliix || '').toLowerCase().includes(query) ||
         (item.par_nombre || '').toLowerCase().includes(query);
      return matchesPermission && matchesSearch;
   });
});

const noResurtibleCount = computed(() =>
   store.z8Catalog.filter(item => item.permiso_oc === 'NoResurtible').length
);

function resetNewForm() {
   newForm.id_cliente = '';
   newForm.permiso_oc = 'z8';
   newForm.sku_muliix = '';
   newForm.par_muliix = null;
   newForm.mixbase = null;
   newForm.mixpar = null;
}

function sanitizePayload(form: ChainZ8CatalogPayload): ChainZ8CatalogPayload {
   return {
      id_cliente: form.id_cliente,
      permiso_oc: normalizeZ8Permission(form.permiso_oc),
      sku_muliix: form.sku_muliix,
      par_muliix: form.par_muliix || null,
      mixbase: form.mixbase === undefined ? null : form.mixbase,
      mixpar: form.mixpar === undefined ? null : form.mixpar,
   };
}

async function createItem() {
   if (!newForm.id_cliente || !newForm.sku_muliix) {
      message.value = 'Selecciona tienda y SKU interno antes de guardar.';
      return;
   }
   const ok = await store.createZ8CatalogItem(sanitizePayload(newForm));
   message.value = ok ? 'Asociacion Z8 creada.' : 'No se pudo crear la asociacion Z8.';
   if (ok) resetNewForm();
}

function startEdit(item: ChainZ8CatalogItem) {
   editingId.value = item.id;
   editForm.id_cliente = item.id_cliente;
   editForm.permiso_oc = item.permiso_oc;
   editForm.sku_muliix = item.sku_muliix;
   editForm.par_muliix = item.par_muliix;
   editForm.mixbase = item.mixbase;
   editForm.mixpar = item.mixpar;
}

function cancelEdit() {
   editingId.value = null;
}

async function saveEdit(id: number) {
   const ok = await store.updateZ8CatalogItem(id, sanitizePayload(editForm));
   message.value = ok ? 'Asociacion Z8 actualizada.' : 'No se pudo actualizar la asociacion Z8.';
   if (ok) editingId.value = null;
}

async function deleteItem(id: number) {
   if (!confirm('Eliminar esta asociacion del catalogo Z8?')) return;
   const ok = await store.deleteZ8CatalogItem(id);
   message.value = ok ? 'Asociacion Z8 eliminada.' : 'No se pudo eliminar la asociacion Z8.';
}

function permissionClass(permission: string) {
   if (permission === 'z8carnes') return 'bg-purple-50 text-purple-700 border-purple-100 ring-1 ring-purple-100';
   if (permission === 'NoResurtible') return 'bg-violet-50 text-violet-600 border-violet-100 ring-1 ring-violet-100';
   return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100 ring-1 ring-fuchsia-100';
}
</script>

<template>
   <section class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <header class="p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
         <div>
            <h2 class="text-sm font-black text-slate-800 uppercase tracking-tight">Catalogo Z8</h2>
            <p class="text-xs text-slate-500">Asocia tiendas existentes con SKUs internos y permisos Z8.</p>
         </div>
         <div class="flex flex-col sm:flex-row gap-3">
            <select v-model="selectedPermission" class="control w-full sm:w-44">
               <option value="">Todos los permisos</option>
               <option v-for="permission in Z8_PERMISSION_OPTIONS" :key="permission" :value="permission">{{ permission }}</option>
            </select>
            <input v-model="search" type="text" placeholder="Buscar tienda, SKU o par..." class="control w-full sm:w-80">
         </div>
      </header>

      <div class="grid grid-cols-1 xl:grid-cols-[420px_1fr] min-h-[560px]">
         <aside class="border-b xl:border-b-0 xl:border-r border-slate-100 bg-slate-50 p-5">
            <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
               <h3 class="text-xs font-black text-slate-700 uppercase tracking-widest mb-4">Nueva asociacion Z8</h3>
               <div class="space-y-3">
                  <label class="block">
                     <span class="field-label">Tienda</span>
                     <select v-model="newForm.id_cliente" class="control w-full">
                        <option value="" disabled>Selecciona una tienda...</option>
                        <option v-for="option in store.storeOptions" :key="option.id_cliente" :value="option.id_cliente">
                           {{ option.id_cliente }} - {{ option.nombre_tienda }}
                        </option>
                     </select>
                  </label>
                  <label class="block">
                     <span class="field-label">Permiso OC</span>
                     <select v-model="newForm.permiso_oc" class="control w-full">
                        <option v-for="permission in Z8_PERMISSION_OPTIONS" :key="permission" :value="permission">{{ permission }}</option>
                     </select>
                  </label>
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
                     <span class="field-label">SKU par</span>
                     <select v-model="newForm.par_muliix" class="control w-full">
                        <option :value="null">Sin par</option>
                        <option v-for="sku in store.skuOptions" :key="sku.sku_muliix" :value="sku.sku_muliix">
                           {{ sku.sku_muliix }} - {{ sku.sku_nombre }}
                        </option>
                     </select>
                  </label>
                  <div class="grid grid-cols-2 gap-3">
                     <label class="block">
                        <span class="field-label">Mix base</span>
                        <input v-model.number="newForm.mixbase" type="number" step="0.01" class="control w-full">
                     </label>
                     <label class="block">
                        <span class="field-label">Mix par</span>
                        <input v-model.number="newForm.mixpar" type="number" step="0.01" class="control w-full">
                     </label>
                  </div>
                  <button
                     :disabled="store.saving"
                     class="w-full h-10 rounded-lg bg-brand-600 text-white text-xs font-black uppercase tracking-widest hover:bg-brand-700 disabled:opacity-40"
                     @click="createItem"
                  >
                     <i class="fa-solid fa-plus mr-2"></i>
                     Crear Z8
                  </button>
               </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mt-4">
               <div class="bg-white border border-slate-100 rounded-lg p-3">
                  <p class="text-[10px] uppercase tracking-widest text-slate-400 font-black">Registros</p>
                  <p class="text-xl font-black text-slate-800">{{ store.z8Catalog.length }}</p>
               </div>
               <div class="bg-white border border-slate-100 rounded-lg p-3">
                  <p class="text-[10px] uppercase tracking-widest text-slate-400 font-black">No resurtibles</p>
                  <p class="text-xl font-black text-slate-500">{{ noResurtibleCount }}</p>
               </div>
            </div>
         </aside>

         <div>
            <div v-if="store.loadingZ8Catalog" class="py-16 text-center text-slate-400">
               <i class="fa-solid fa-circle-notch fa-spin text-2xl"></i>
               <p class="mt-2 text-xs font-bold uppercase tracking-widest">Cargando catalogo Z8</p>
            </div>

            <div v-else class="overflow-x-auto">
               <table class="w-full text-sm">
                  <thead class="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                     <tr>
                        <th class="px-4 py-3 text-left">Tienda</th>
                        <th class="px-3 py-3 text-left">Permiso</th>
                        <th class="px-3 py-3 text-left">SKU</th>
                        <th class="px-3 py-3 text-left">Par</th>
                        <th class="px-3 py-3 text-center">Mix</th>
                        <th class="px-4 py-3 text-right">Acciones</th>
                     </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                     <tr v-for="item in filteredItems" :key="item.id" class="hover:bg-slate-50">
                        <template v-if="editingId === item.id">
                           <td class="px-4 py-3 min-w-[260px]">
                              <select v-model="editForm.id_cliente" class="control w-full">
                                 <option v-for="option in store.storeOptions" :key="option.id_cliente" :value="option.id_cliente">
                                    {{ option.id_cliente }} - {{ option.nombre_tienda }}
                                 </option>
                              </select>
                           </td>
                           <td class="px-3 py-3">
                              <select v-model="editForm.permiso_oc" class="control w-36">
                                 <option v-for="permission in Z8_PERMISSION_OPTIONS" :key="permission" :value="permission">{{ permission }}</option>
                              </select>
                           </td>
                           <td class="px-3 py-3 min-w-[260px]">
                              <select v-model="editForm.sku_muliix" class="control w-full">
                                 <option v-for="sku in store.skuOptions" :key="sku.sku_muliix" :value="sku.sku_muliix">
                                    {{ sku.sku_muliix }} - {{ sku.sku_nombre }}
                                 </option>
                              </select>
                           </td>
                           <td class="px-3 py-3 min-w-[220px]">
                              <select v-model="editForm.par_muliix" class="control w-full">
                                 <option :value="null">Sin par</option>
                                 <option v-for="sku in store.skuOptions" :key="sku.sku_muliix" :value="sku.sku_muliix">
                                    {{ sku.sku_muliix }} - {{ sku.sku_nombre }}
                                 </option>
                              </select>
                           </td>
                           <td class="px-3 py-3">
                              <div class="flex items-center justify-center gap-2">
                                 <input v-model.number="editForm.mixbase" type="number" step="0.01" class="control w-20 text-center">
                                 <input v-model.number="editForm.mixpar" type="number" step="0.01" class="control w-20 text-center">
                              </div>
                           </td>
                           <td class="px-4 py-3 text-right whitespace-nowrap">
                              <button class="text-xs font-bold text-slate-400 hover:text-slate-600 mr-3" @click="cancelEdit">Cancelar</button>
                              <button class="text-xs font-black text-brand-600 hover:text-brand-700" @click="saveEdit(item.id)">Guardar</button>
                           </td>
                        </template>
                        <template v-else>
                           <td class="px-4 py-3 min-w-[240px]">
                              <p class="font-bold text-slate-800">{{ item.nombre_tienda || 'Sin nombre' }}</p>
                              <div class="mt-1 flex flex-wrap items-center gap-1.5">
                                 <span class="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-700 ring-1 ring-sky-100">
                                    {{ item.id_cliente }}
                                 </span>
                                 <span class="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                                    {{ item.Jefatura || 'N/D' }}
                                 </span>
                              </div>
                           </td>
                           <td class="px-3 py-3">
                              <span class="px-2 py-1 rounded-md border text-[10px] font-black" :class="permissionClass(item.permiso_oc)">
                                 {{ item.permiso_oc }}
                              </span>
                           </td>
                           <td class="px-3 py-3 min-w-[230px]">
                              <p class="font-bold text-slate-700">{{ item.sku_nombre }}</p>
                              <span class="mt-1 inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-700 ring-1 ring-sky-100">
                                 {{ item.sku_muliix }}
                              </span>
                           </td>
                           <td class="px-3 py-3 min-w-[210px]">
                              <template v-if="item.par_muliix">
                                 <p class="font-bold text-slate-600">{{ item.par_nombre || item.par_muliix }}</p>
                                 <span class="mt-1 inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-700 ring-1 ring-amber-100">
                                    {{ item.par_muliix }}
                                 </span>
                              </template>
                              <span v-else class="text-xs text-slate-300 font-bold">Sin par</span>
                           </td>
                           <td class="px-3 py-3 text-center font-mono text-xs text-slate-600">
                              {{ item.mixbase ?? 'N/D' }} / {{ item.mixpar ?? 'N/D' }}
                           </td>
                           <td class="px-4 py-3 text-right whitespace-nowrap">
                              <button class="w-8 h-8 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50" @click="startEdit(item)">
                                 <i class="fa-solid fa-pen"></i>
                              </button>
                              <button class="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" @click="deleteItem(item.id)">
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
         <p class="text-xs font-semibold" :class="message.includes('No se') ? 'text-rose-500' : 'text-slate-500'">{{ message || `${filteredItems.length} registros Z8 visibles` }}</p>
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
