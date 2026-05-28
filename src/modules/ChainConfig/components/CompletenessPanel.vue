<script setup lang="ts">
import { computed } from 'vue';
import { useChainConfigStore } from '../stores/chainConfigStore';

const store = useChainConfigStore();

const diagnostics = computed(() => store.diagnostics);

const cards = computed(() => {
   const summary = diagnostics.value?.summary;
   return [
      {
         key: 'skuUnitsMissing',
         label: 'SKUs sin conversion',
         count: summary?.skuUnitsMissing || 0,
         icon: 'fa-solid fa-scale-balanced',
         tone: 'amber',
      },
      {
         key: 'skuMappingsIncomplete',
         label: 'Mapeos incompletos',
         count: summary?.skuMappingsIncomplete || 0,
         icon: 'fa-solid fa-link-slash',
         tone: 'amber',
      },
      {
         key: 'duplicateUpcs',
         label: 'UPC duplicados',
         count: summary?.duplicateUpcs || 0,
         icon: 'fa-solid fa-copy',
         tone: 'rose',
      },
      {
         key: 'storesWithoutConfig',
         label: 'Tiendas sin config',
         count: summary?.storesWithoutConfig || 0,
         icon: 'fa-solid fa-store-slash',
         tone: 'sky',
      },
      {
         key: 'z8WithoutMapping',
         label: 'Z8 sin homologacion',
         count: summary?.z8WithoutMapping || 0,
         icon: 'fa-solid fa-layer-group',
         tone: 'rose',
      },
      {
         key: 'z8WithMissingPair',
         label: 'Z8 con par invalido',
         count: summary?.z8WithMissingPair || 0,
         icon: 'fa-solid fa-code-compare',
         tone: 'rose',
      },
   ];
});

function cardClass(tone: string, count: number) {
   if (!count) return 'border-emerald-100 bg-emerald-50/50 text-emerald-700';
   if (tone === 'rose') return 'border-rose-100 bg-rose-50 text-rose-700';
   if (tone === 'sky') return 'border-sky-100 bg-sky-50 text-sky-700';
   return 'border-amber-100 bg-amber-50 text-amber-700';
}
</script>

<template>
   <section class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <header class="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
         <div>
            <h2 class="text-sm font-black text-slate-800 uppercase tracking-tight">Validacion Operativa</h2>
            <p class="text-xs text-slate-500">Detecta faltantes y conflictos antes de preparar nuevas cadenas.</p>
         </div>
         <button
            :disabled="store.loadingDiagnostics"
            class="h-10 px-4 rounded-lg bg-brand-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40 hover:bg-brand-700"
            @click="store.fetchDiagnostics()"
         >
            <i :class="store.loadingDiagnostics ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-rotate-right'" class="mr-2"></i>
            Actualizar
         </button>
      </header>

      <div v-if="store.loadingDiagnostics" class="py-16 text-center text-slate-400">
         <i class="fa-solid fa-circle-notch fa-spin text-2xl"></i>
         <p class="mt-2 text-xs font-bold uppercase tracking-widest">Analizando datos operativos</p>
      </div>

      <template v-else-if="diagnostics">
         <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3 p-5 bg-slate-50 border-b border-slate-100">
            <div
               v-for="card in cards"
               :key="card.key"
               class="rounded-xl border p-4"
               :class="cardClass(card.tone, card.count)"
            >
               <div class="flex items-center justify-between gap-3">
                  <i :class="card.icon"></i>
                  <span class="text-2xl font-black">{{ card.count }}</span>
               </div>
               <p class="mt-3 text-[10px] font-black uppercase tracking-widest">{{ card.label }}</p>
            </div>
         </div>

         <div class="p-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
            <article class="diagnostic-card">
               <h3 class="diagnostic-title">SKUs sin conversion completa</h3>
               <div class="diagnostic-list">
                  <div v-for="item in diagnostics.skuUnitsMissing.slice(0, 40)" :key="item.sku_muliix" class="diagnostic-row">
                     <div>
                        <p class="font-bold text-slate-800">{{ item.sku_nombre }}</p>
                        <p class="text-[11px] text-slate-400 font-mono">{{ item.sku_muliix }}</p>
                     </div>
                     <p class="text-[11px] text-amber-600 font-bold text-right">kg/pza: {{ item.unidad_inventario ?? 'N/D' }} · bolsa: {{ item.pzas_bolsa ?? 'N/D' }}</p>
                  </div>
                  <p v-if="!diagnostics.skuUnitsMissing.length" class="empty-state">Sin faltantes.</p>
               </div>
            </article>

            <article class="diagnostic-card">
               <h3 class="diagnostic-title">Mapeos SKU-cadena incompletos</h3>
               <div class="diagnostic-list">
                  <div v-for="item in diagnostics.skuMappingsIncomplete.slice(0, 40)" :key="item.idskuscadenas" class="diagnostic-row">
                     <div>
                        <p class="font-bold text-slate-800">{{ item.sku_nombre }}</p>
                        <p class="text-[11px] text-slate-400 font-mono">{{ item.nom_cadena }} · {{ item.sku_muliix }}</p>
                     </div>
                     <p class="text-[11px] text-amber-600 font-bold text-right">UPC: {{ item.upc_cadena || 'N/D' }} · cadena: {{ item.sku_cadena || 'N/D' }}</p>
                  </div>
                  <p v-if="!diagnostics.skuMappingsIncomplete.length" class="empty-state">Sin faltantes.</p>
               </div>
            </article>

            <article class="diagnostic-card">
               <h3 class="diagnostic-title">UPC duplicados por cadena</h3>
               <div class="diagnostic-list">
                  <div v-for="item in diagnostics.duplicateUpcs.slice(0, 40)" :key="item.nom_cadena + item.upc_cadena" class="diagnostic-row">
                     <div>
                        <p class="font-bold text-slate-800">{{ item.upc_cadena }}</p>
                        <p class="text-[11px] text-slate-400 font-mono">{{ item.nom_cadena }}</p>
                     </div>
                     <p class="text-[11px] text-rose-600 font-bold text-right">{{ item.sku_count }} SKUs · {{ item.sku_muliix_list }}</p>
                  </div>
                  <p v-if="!diagnostics.duplicateUpcs.length" class="empty-state">Sin duplicados.</p>
               </div>
            </article>

            <article class="diagnostic-card">
               <h3 class="diagnostic-title">Tiendas de cadenas permitidas sin config CPFR</h3>
               <div class="diagnostic-list">
                  <div v-for="item in diagnostics.storesWithoutConfig.slice(0, 40)" :key="item.id_cliente" class="diagnostic-row">
                     <div>
                        <p class="font-bold text-slate-800">{{ item.nombre_tienda || 'Sin nombre' }}</p>
                        <p class="text-[11px] text-slate-400 font-mono">{{ item.id_cliente }}</p>
                     </div>
                     <p class="text-[11px] text-sky-600 font-bold text-right">{{ item.Cadena || 'N/D' }} · {{ item.Jefatura || 'N/D' }}</p>
                  </div>
                  <p v-if="!diagnostics.storesWithoutConfig.length" class="empty-state">Todas las tiendas tienen config.</p>
               </div>
            </article>

            <article class="diagnostic-card">
               <h3 class="diagnostic-title">Z8 sin homologacion SKU-cadena</h3>
               <div class="diagnostic-list">
                  <div v-for="item in diagnostics.z8WithoutMapping.slice(0, 40)" :key="item.id" class="diagnostic-row">
                     <div>
                        <p class="font-bold text-slate-800">{{ item.sku_nombre }}</p>
                        <p class="text-[11px] text-slate-400 font-mono">{{ item.sku_muliix }} · {{ item.permiso_oc }}</p>
                     </div>
                     <p class="text-[11px] text-rose-600 font-bold text-right">{{ item.nombre_tienda || item.id_cliente }}</p>
                  </div>
                  <p v-if="!diagnostics.z8WithoutMapping.length" class="empty-state">Sin Z8 pendientes de homologacion.</p>
               </div>
            </article>

            <article class="diagnostic-card">
               <h3 class="diagnostic-title">Z8 con SKU par inexistente</h3>
               <div class="diagnostic-list">
                  <div v-for="item in diagnostics.z8WithMissingPair.slice(0, 40)" :key="item.id" class="diagnostic-row">
                     <div>
                        <p class="font-bold text-slate-800">{{ item.sku_nombre }}</p>
                        <p class="text-[11px] text-slate-400 font-mono">{{ item.sku_muliix }}</p>
                     </div>
                     <p class="text-[11px] text-rose-600 font-bold text-right">Par: {{ item.par_muliix }}</p>
                  </div>
                  <p v-if="!diagnostics.z8WithMissingPair.length" class="empty-state">Sin pares invalidos.</p>
               </div>
            </article>
         </div>
      </template>

      <div v-else class="py-16 text-center text-slate-400">
         <i class="fa-solid fa-clipboard-check text-3xl"></i>
         <p class="mt-2 text-xs font-bold uppercase tracking-widest">Sin diagnostico cargado</p>
      </div>
   </section>
</template>

<style scoped>
.diagnostic-card {
   border: 1px solid rgb(226 232 240);
   border-radius: 12px;
   overflow: hidden;
   background: white;
}
.diagnostic-title {
   padding: 14px 16px;
   border-bottom: 1px solid rgb(241 245 249);
   font-size: 11px;
   font-weight: 900;
   color: rgb(51 65 85);
   text-transform: uppercase;
   letter-spacing: .08em;
   background: rgb(248 250 252);
}
.diagnostic-list {
   max-height: 360px;
   overflow-y: auto;
}
.diagnostic-row {
   display: flex;
   align-items: center;
   justify-content: space-between;
   gap: 16px;
   padding: 12px 16px;
   border-bottom: 1px solid rgb(241 245 249);
}
.empty-state {
   padding: 28px 16px;
   text-align: center;
   font-size: 12px;
   font-weight: 700;
   color: rgb(148 163 184);
}
</style>
