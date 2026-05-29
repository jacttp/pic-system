<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useChainConfigStore } from '../stores/chainConfigStore';
import type { ChainZ8CatalogItem, ChainZ8CatalogPayload } from '../types/chainConfigTypes';
import { normalizeZ8Permission, Z8_PERMISSION_OPTIONS } from '../utils/chainConfigOptions';

const store = useChainConfigStore();
const search = ref('');
const selectedPermission = ref<string>('');
const editingId = ref<number | null>(null);
const expandedStores = ref<Set<string>>(new Set());
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

const groupedStores = computed(() => {
   const groups = new Map<string, {
      id_cliente: string;
      nombre_tienda: string;
      Jefatura: string;
      items: ChainZ8CatalogItem[];
   }>();

   filteredItems.value.forEach(item => {
      const key = item.id_cliente;
      if (!groups.has(key)) {
         groups.set(key, {
            id_cliente: item.id_cliente,
            nombre_tienda: item.nombre_tienda || 'Sin nombre',
            Jefatura: item.Jefatura || 'N/D',
            items: [],
         });
      }
      groups.get(key)?.items.push(item);
   });

   return Array.from(groups.values())
      .map(group => ({
         ...group,
         items: group.items.sort((a, b) => a.sku_muliix.localeCompare(b.sku_muliix)),
         permissions: {
            z8: group.items.filter(item => item.permiso_oc === 'z8').length,
            z8carnes: group.items.filter(item => item.permiso_oc === 'z8carnes').length,
            noResurtible: group.items.filter(item => item.permiso_oc === 'NoResurtible').length,
         },
      }))
      .sort((a, b) => a.nombre_tienda.localeCompare(b.nombre_tienda));
});

const noResurtibleCount = computed(() =>
   store.z8Catalog.filter(item => item.permiso_oc === 'NoResurtible').length
);

watch([search, selectedPermission], () => {
   expandedStores.value = new Set();
});

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

function isStoreExpanded(idCliente: string) {
   return expandedStores.value.has(idCliente);
}

function toggleStore(idCliente: string) {
   const next = new Set(expandedStores.value);
   if (next.has(idCliente)) {
      next.delete(idCliente);
   } else {
      next.add(idCliente);
   }
   expandedStores.value = next;
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

            <div v-else class="p-4 space-y-4 bg-slate-50/60 max-h-[720px] overflow-y-auto">
               <article
                  v-for="group in groupedStores"
                  :key="group.id_cliente"
                  class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
               >
                  <header class="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
                     <button
                        type="button"
                        class="w-full text-left flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3"
                        @click="toggleStore(group.id_cliente)"
                     >
                        <div class="min-w-0">
                           <div class="flex items-center gap-2">
                              <span
                                 class="w-7 h-7 rounded-lg bg-white text-slate-400 border border-slate-200 flex items-center justify-center transition-transform"
                                 :class="isStoreExpanded(group.id_cliente) ? 'rotate-90 text-brand-600 border-brand-200' : ''"
                              >
                                 <i class="fa-solid fa-chevron-right text-[10px]"></i>
                              </span>
                              <p class="text-sm font-black text-slate-800 truncate">{{ group.nombre_tienda }}</p>
                           </div>
                           <div class="mt-1 flex flex-wrap items-center gap-1.5">
                              <span class="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-700 ring-1 ring-sky-100">
                                 {{ group.id_cliente }}
                              </span>
                              <span class="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                                 {{ group.Jefatura }}
                              </span>
                              <span class="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-black text-slate-500">
                                 {{ group.items.length }} productos
                              </span>
                           </div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                           <span class="summary-pill bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100">z8 {{ group.permissions.z8 }}</span>
                           <span class="summary-pill bg-purple-50 text-purple-700 ring-purple-100">z8carnes {{ group.permissions.z8carnes }}</span>
                           <span class="summary-pill bg-violet-50 text-violet-600 ring-violet-100">NoRes {{ group.permissions.noResurtible }}</span>
                        </div>
                     </button>
                  </header>

                  <div v-if="isStoreExpanded(group.id_cliente)" class="overflow-x-auto">
                     <table class="w-full text-sm">
                        <thead class="bg-white text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                           <tr>
                              <th class="px-4 py-3 text-left w-[14%]">Permiso</th>
                              <th class="px-3 py-3 text-left min-w-[240px]">SKU</th>
                              <th class="px-3 py-3 text-left min-w-[220px]">Par</th>
                              <th class="px-3 py-3 text-center w-[120px]">Mix</th>
                              <th class="px-4 py-3 text-right w-[110px]">Acciones</th>
                           </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                           <tr v-for="item in group.items" :key="item.id" class="hover:bg-slate-50">
                              <template v-if="editingId === item.id">
                                 <td colspan="5" class="px-4 py-4 bg-amber-50/40">
                                    <div class="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr_1.2fr_1.2fr_0.9fr_auto] gap-3 items-end">
                                       <label class="block">
                                          <span class="field-label">Tienda</span>
                                          <select v-model="editForm.id_cliente" class="control w-full">
                                             <option v-for="option in store.storeOptions" :key="option.id_cliente" :value="option.id_cliente">
                                                {{ option.id_cliente }} - {{ option.nombre_tienda }}
                                             </option>
                                          </select>
                                       </label>
                                       <label class="block">
                                          <span class="field-label">Permiso</span>
                                          <select v-model="editForm.permiso_oc" class="control w-full">
                                             <option v-for="permission in Z8_PERMISSION_OPTIONS" :key="permission" :value="permission">{{ permission }}</option>
                                          </select>
                                       </label>
                                       <label class="block">
                                          <span class="field-label">SKU interno</span>
                                          <select v-model="editForm.sku_muliix" class="control w-full">
                                             <option v-for="sku in store.skuOptions" :key="sku.sku_muliix" :value="sku.sku_muliix">
                                                {{ sku.sku_muliix }} - {{ sku.sku_nombre }}
                                             </option>
                                          </select>
                                       </label>
                                       <label class="block">
                                          <span class="field-label">SKU par</span>
                                          <select v-model="editForm.par_muliix" class="control w-full">
                                             <option :value="null">Sin par</option>
                                             <option v-for="sku in store.skuOptions" :key="sku.sku_muliix" :value="sku.sku_muliix">
                                                {{ sku.sku_muliix }} - {{ sku.sku_nombre }}
                                             </option>
                                          </select>
                                       </label>
                                       <div class="grid grid-cols-2 gap-2">
                                          <label class="block">
                                             <span class="field-label">Base</span>
                                             <input v-model.number="editForm.mixbase" type="number" step="0.01" class="control w-full text-center">
                                          </label>
                                          <label class="block">
                                             <span class="field-label">Par</span>
                                             <input v-model.number="editForm.mixpar" type="number" step="0.01" class="control w-full text-center">
                                          </label>
                                       </div>
                                       <div class="flex justify-end gap-2">
                                          <button class="h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-500 hover:text-slate-700" @click="cancelEdit">Cancelar</button>
                                          <button class="h-10 px-3 rounded-lg bg-brand-600 text-white text-xs font-black hover:bg-brand-700" @click="saveEdit(item.id)">Guardar</button>
                                       </div>
                                    </div>
                                 </td>
                              </template>
                              <template v-else>
                                 <td class="px-4 py-3">
                                    <span class="px-2 py-1 rounded-md border text-[10px] font-black" :class="permissionClass(item.permiso_oc)">
                                       {{ item.permiso_oc }}
                                    </span>
                                 </td>
                                 <td class="px-3 py-3">
                                    <p class="font-bold text-slate-700">{{ item.sku_nombre }}</p>
                                    <span class="mt-1 inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-700 ring-1 ring-sky-100">
                                       {{ item.sku_muliix }}
                                    </span>
                                 </td>
                                 <td class="px-3 py-3">
                                    <template v-if="item.par_muliix">
                                       <p class="font-bold text-slate-600">{{ item.par_nombre || item.par_muliix }}</p>
                                       <span class="mt-1 inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-700 ring-1 ring-amber-100">
                                          {{ item.par_muliix }}
                                       </span>
                                    </template>
                                    <span v-else class="text-xs text-slate-300 font-bold">Sin par</span>
                                 </td>
                                 <td class="px-3 py-3 text-center">
                                    <span class="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 font-mono text-xs font-bold text-slate-600 ring-1 ring-slate-100">
                                       {{ item.mixbase ?? 'N/D' }} / {{ item.mixpar ?? 'N/D' }}
                                    </span>
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
               </article>

               <div v-if="groupedStores.length === 0" class="py-16 text-center text-slate-400">
                  <i class="fa-solid fa-filter-circle-xmark text-3xl"></i>
                  <p class="mt-2 text-xs font-bold uppercase tracking-widest">Sin registros para los filtros actuales</p>
               </div>
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
.summary-pill {
   display: inline-flex;
   align-items: center;
   border-radius: 999px;
   padding: 4px 8px;
   font-size: 10px;
   font-weight: 900;
   text-transform: uppercase;
   letter-spacing: .04em;
   box-shadow: inset 0 0 0 1px currentColor;
}
</style>
