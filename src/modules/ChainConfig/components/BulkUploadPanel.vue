<script setup lang="ts">
import { computed, ref } from 'vue';
import * as XLSX from 'xlsx';
import { useChainConfigStore } from '../stores/chainConfigStore';
import type { ChainConfigBulkSummary, ChainConfigBulkType } from '../types/chainConfigTypes';
import { ALLOWED_CHAINS, Z8_PERMISSION_OPTIONS } from '../utils/chainConfigOptions';

const store = useChainConfigStore();
const bulkType = ref<ChainConfigBulkType>('skuMappings');
const rows = ref<Record<string, unknown>[]>([]);
const summary = ref<ChainConfigBulkSummary | null>(null);
const fileName = ref('');
const message = ref('');

const templates = {
   skuMappings: {
      label: 'SKU por Cadena',
      description: 'Crea o actualiza homologaciones por cadena usando sku_muliix + nom_cadena como llave.',
      columns: ['idskuscadenas', 'sku_muliix', 'nom_cadena', 'upc_cadena', 'sku_cadena'],
      sample: [{
         idskuscadenas: '',
         sku_muliix: 'SKU_INTERNO',
         nom_cadena: ALLOWED_CHAINS[0],
         upc_cadena: '7500000000000',
         sku_cadena: 'Nombre o codigo externo',
      }],
   },
   z8Catalog: {
      label: 'Catalogo Z8',
      description: 'Crea o actualiza asociaciones Z8 usando id_cliente + sku_muliix + permiso_oc como llave.',
      columns: ['id', 'id_cliente', 'permiso_oc', 'sku_muliix', 'par_muliix', 'mixbase', 'mixpar'],
      sample: [{
         id: '',
         id_cliente: 'CLIENTE_ID',
         permiso_oc: Z8_PERMISSION_OPTIONS[0],
         sku_muliix: 'SKU_INTERNO',
         par_muliix: '',
         mixbase: 1,
         mixpar: '',
      }],
   },
};

const currentTemplate = computed(() => templates[bulkType.value]);
const canCommit = computed(() => Boolean(summary.value && summary.value.valid > 0 && summary.value.errors === 0));

function resetPreview() {
   summary.value = null;
   message.value = '';
}

function normalizeRows(rawRows: Record<string, unknown>[]) {
   return rawRows
      .map(row => Object.fromEntries(
         currentTemplate.value.columns.map(column => [column, row[column] ?? ''])
      ))
      .filter(row => Object.values(row).some(value => String(value ?? '').trim() !== ''));
}

async function handleFile(event: Event) {
   const input = event.target as HTMLInputElement;
   const file = input.files?.[0];
   resetPreview();
   rows.value = [];
   fileName.value = file?.name || '';

   if (!file) return;

   try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      rows.value = normalizeRows(parsed);
      message.value = rows.value.length
         ? `${rows.value.length} registros leidos. Ejecuta prevalidacion antes de guardar.`
         : 'El archivo no contiene registros utiles.';
   } catch (error) {
      console.error('[BulkUploadPanel.handleFile]', error);
      message.value = 'No se pudo leer el archivo. Usa XLSX, XLS o CSV con encabezados validos.';
   }
}

async function preview() {
   if (rows.value.length === 0) {
      message.value = 'Carga un archivo antes de prevalidar.';
      return;
   }
   const result = await store.previewBulk(bulkType.value, rows.value);
   summary.value = result;
   message.value = result
      ? `Prevalidacion lista: ${result.creates} altas, ${result.updates} actualizaciones, ${result.errors} errores.`
      : 'No se pudo prevalidar el archivo.';
}

async function commit() {
   if (!canCommit.value) return;
   if (!confirm('Aplicar la carga masiva validada?')) return;
   const result = await store.commitBulk(bulkType.value, rows.value);
   summary.value = result;
   message.value = result
      ? `Carga aplicada: ${result.creates} altas y ${result.updates} actualizaciones.`
      : 'No se pudo aplicar la carga masiva.';
}

function downloadTemplate() {
   const worksheet = XLSX.utils.json_to_sheet(currentTemplate.value.sample, {
      header: currentTemplate.value.columns,
   });
   const workbook = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(workbook, worksheet, 'plantilla');
   XLSX.writeFile(workbook, `chain-config-${bulkType.value}.xlsx`);
}
</script>

<template>
   <section class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <header class="p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
         <div>
            <h2 class="text-sm font-black text-slate-800 uppercase tracking-tight">Carga Masiva</h2>
            <p class="text-xs text-slate-500">Prevalida archivos antes de insertar o actualizar asociaciones operativas.</p>
         </div>
         <button
            type="button"
            class="h-10 px-4 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 text-xs font-black uppercase tracking-widest hover:bg-brand-100"
            @click="downloadTemplate"
         >
            <i class="fa-solid fa-file-arrow-down mr-2"></i>
            Descargar plantilla
         </button>
      </header>

      <div class="grid grid-cols-1 xl:grid-cols-[420px_1fr] min-h-[520px]">
         <aside class="border-b xl:border-b-0 xl:border-r border-slate-100 bg-slate-50 p-5 space-y-4">
            <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
               <label class="block">
                  <span class="field-label">Tipo de carga</span>
                  <select v-model="bulkType" class="control w-full" @change="rows = []; resetPreview()">
                     <option value="skuMappings">SKU por Cadena</option>
                     <option value="z8Catalog">Catalogo Z8</option>
                  </select>
               </label>

               <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p class="text-xs font-black text-slate-700">{{ currentTemplate.label }}</p>
                  <p class="text-[11px] text-slate-500 mt-1">{{ currentTemplate.description }}</p>
               </div>

               <label class="block">
                  <span class="field-label">Archivo XLSX, XLS o CSV</span>
                  <input
                     type="file"
                     accept=".xlsx,.xls,.csv"
                     class="block w-full text-xs text-slate-500 file:mr-3 file:h-10 file:px-4 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white file:text-xs file:font-black file:uppercase file:tracking-widest hover:file:bg-slate-700"
                     @change="handleFile"
                  >
               </label>

               <div class="flex gap-2">
                  <button
                     type="button"
                     :disabled="store.loadingBulk || rows.length === 0"
                     class="flex-1 h-10 rounded-lg bg-slate-800 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-700 disabled:opacity-40"
                     @click="preview"
                  >
                     <i class="fa-solid fa-shield-halved mr-2"></i>
                     Prevalidar
                  </button>
                  <button
                     type="button"
                     :disabled="store.saving || !canCommit"
                     class="flex-1 h-10 rounded-lg bg-brand-600 text-white text-xs font-black uppercase tracking-widest hover:bg-brand-700 disabled:opacity-40"
                     @click="commit"
                  >
                     <i class="fa-solid fa-upload mr-2"></i>
                     Aplicar
                  </button>
               </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
               <div class="bg-white border border-slate-100 rounded-lg p-3">
                  <p class="text-[10px] uppercase tracking-widest text-slate-400 font-black">Archivo</p>
                  <p class="text-xs font-bold text-slate-700 truncate">{{ fileName || 'Sin archivo' }}</p>
               </div>
               <div class="bg-white border border-slate-100 rounded-lg p-3">
                  <p class="text-[10px] uppercase tracking-widest text-slate-400 font-black">Leidos</p>
                  <p class="text-xl font-black text-slate-800">{{ rows.length }}</p>
               </div>
            </div>

            <div v-if="summary" class="grid grid-cols-2 gap-3">
               <div class="metric-card">
                  <p>Altas</p>
                  <strong class="text-brand-600">{{ summary.creates }}</strong>
               </div>
               <div class="metric-card">
                  <p>Actualizaciones</p>
                  <strong class="text-sky-600">{{ summary.updates }}</strong>
               </div>
               <div class="metric-card">
                  <p>Validos</p>
                  <strong class="text-emerald-600">{{ summary.valid }}</strong>
               </div>
               <div class="metric-card">
                  <p>Errores</p>
                  <strong :class="summary.errors ? 'text-rose-600' : 'text-emerald-600'">{{ summary.errors }}</strong>
               </div>
            </div>
         </aside>

         <div class="overflow-x-auto">
            <div v-if="!summary" class="p-8">
               <div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <i class="fa-solid fa-table-list text-3xl text-slate-300"></i>
                  <h3 class="mt-4 text-sm font-black text-slate-700 uppercase tracking-tight">Flujo seguro de carga</h3>
                  <p class="mt-2 text-xs text-slate-500 max-w-xl mx-auto">
                     Descarga la plantilla, completa solo asociaciones permitidas, sube el archivo y revisa la prevalidacion. El backend no escribe si existe cualquier error.
                  </p>
                  <div class="mt-5 flex flex-wrap justify-center gap-2">
                     <span v-for="column in currentTemplate.columns" :key="column" class="px-2 py-1 rounded-md bg-white border border-slate-100 text-[10px] font-black text-slate-500">
                        {{ column }}
                     </span>
                  </div>
               </div>
            </div>

            <table v-else class="w-full text-sm">
               <thead class="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <tr>
                     <th class="px-4 py-3 text-left">Fila</th>
                     <th class="px-3 py-3 text-left">Accion</th>
                     <th v-for="column in currentTemplate.columns" :key="column" class="px-3 py-3 text-left">{{ column }}</th>
                     <th class="px-4 py-3 text-left">Validacion</th>
                  </tr>
               </thead>
               <tbody class="divide-y divide-slate-100">
                  <tr v-for="item in summary.items" :key="item.rowNumber" class="hover:bg-slate-50">
                     <td class="px-4 py-3 text-xs font-mono text-slate-500">{{ item.rowNumber }}</td>
                     <td class="px-3 py-3">
                        <span
                           class="px-2 py-1 rounded-md text-[10px] font-black uppercase"
                           :class="{
                              'bg-emerald-50 text-emerald-700': item.action === 'create',
                              'bg-sky-50 text-sky-700': item.action === 'update',
                              'bg-rose-50 text-rose-700': item.action === 'error',
                           }"
                        >
                           {{ item.action }}
                        </span>
                     </td>
                     <td v-for="column in currentTemplate.columns" :key="column" class="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {{ item[column] || 'N/D' }}
                     </td>
                     <td class="px-4 py-3 min-w-[280px]">
                        <p v-if="item.errors.length === 0" class="text-xs font-bold text-emerald-600">Listo para aplicar.</p>
                        <ul v-else class="space-y-1">
                           <li v-for="error in item.errors" :key="error" class="text-xs font-semibold text-rose-600">{{ error }}</li>
                        </ul>
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
      </div>

      <footer class="px-5 py-4 bg-slate-50 border-t border-slate-100">
         <p class="text-xs font-semibold" :class="message.includes('No se') || message.includes('errores') ? 'text-rose-500' : 'text-slate-500'">
            {{ message || 'Carga una plantilla para iniciar la prevalidacion.' }}
         </p>
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
.metric-card {
   border-radius: 8px;
   border: 1px solid rgb(241 245 249);
   background: white;
   padding: 12px;
}
.metric-card p {
   font-size: 10px;
   font-weight: 900;
   color: rgb(148 163 184);
   text-transform: uppercase;
   letter-spacing: .08em;
}
.metric-card strong {
   display: block;
   margin-top: 4px;
   font-size: 24px;
   line-height: 1;
}
</style>
