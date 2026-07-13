<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useChainConfigStore } from '../stores/chainConfigStore';
import ChainConfigTabs from '../components/ChainConfigTabs.vue';
import StoreConfigPanel from '../components/StoreConfigPanel.vue';
import SkuUnitsPanel from '../components/SkuUnitsPanel.vue';
import SkuChainMappingPanel from '../components/SkuChainMappingPanel.vue';
import Z8CatalogPanel from '../components/Z8CatalogPanel.vue';
import CompletenessPanel from '../components/CompletenessPanel.vue';
import BulkUploadPanel from '../components/BulkUploadPanel.vue';

type TabId = 'stores' | 'skuUnits' | 'mappings' | 'z8' | 'diagnostics' | 'bulk';

const store = useChainConfigStore();
const activeTab = ref<TabId>('stores');

onMounted(() => {
   store.init();
});
</script>

<template>
   <main class="h-full overflow-y-auto bg-slate-50">
      <div class="max-w-[1600px] mx-auto p-6 xl:p-8 space-y-6">
         <header class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
               <div class="flex items-start gap-4">
                  <div class="w-12 h-12 rounded-lg bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center shrink-0">
                     <i class="fa-solid fa-sitemap text-xl"></i>
                  </div>
                  <div>
                     <p class="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500 mb-1">CPFR · Datos operativos</p>
                     <h1 class="text-2xl font-black text-slate-800 tracking-tight">Configuracion de Cadenas</h1>
                     <p class="text-sm text-slate-500 max-w-3xl mt-1">
                        Administra asociaciones y parametros usados por CPFR sin modificar catalogos maestros de productos, clientes, tiendas o cadenas.
                     </p>
                  </div>
               </div>

               <div class="flex flex-col gap-3 min-w-full xl:min-w-[420px]">
                  <a
                     href="http://localhost:5173/admin/cpfr"
                     class="inline-flex items-center justify-center gap-2 self-start xl:self-end rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  >
                     <i class="fa-solid fa-arrow-left"></i>
                     Ir a CPFR
                  </a>

                  <div class="grid grid-cols-3 gap-3">
                     <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiendas</p>
                        <p class="text-xl font-black text-slate-800">{{ store.storeConfigs.length }}</p>
                     </div>
                     <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">SKUs</p>
                        <p class="text-xl font-black text-slate-800">{{ store.skuUnits.length }}</p>
                     </div>
                     <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mapeos</p>
                        <p class="text-xl font-black text-slate-800">{{ store.skuMappings.length }}</p>
                     </div>
                  </div>
               </div>
            </div>

            <div v-if="store.error" class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
               <i class="fa-solid fa-circle-exclamation mr-2"></i>
               {{ store.error }}
            </div>
         </header>

         <ChainConfigTabs v-model:active-tab="activeTab" />

         <StoreConfigPanel v-if="activeTab === 'stores'" />
         <SkuUnitsPanel v-else-if="activeTab === 'skuUnits'" />
         <SkuChainMappingPanel v-else-if="activeTab === 'mappings'" />
         <Z8CatalogPanel v-else-if="activeTab === 'z8'" />
         <CompletenessPanel v-else-if="activeTab === 'diagnostics'" />
         <BulkUploadPanel v-else />
      </div>
   </main>
</template>
