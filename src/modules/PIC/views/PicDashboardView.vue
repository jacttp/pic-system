<script setup lang="ts">
import { ref } from 'vue';
import { usePicFilterStore } from '../stores/picFilterStore';
import PicChat from '../components/PicChat.vue';
import PicFilters from '../components/PicFilters.vue';
import PicGrid from '../components/PicGrid.vue'; 
import ExecutiveSummaryCard from '../components/ExecutiveSummaryCard.vue'; // <--- IMPORTAR

const store = usePicFilterStore();
const isReportActive = ref(false);

const handleGenerate = async () => {
    const success = await store.generateReport();
    if (success) {
        isReportActive.value = true;
    }
};
</script>

<template>
    <div class="flex h-screen overflow-hidden bg-slate-100">
        
        <div class="flex-1 flex flex-col relative overflow-hidden">
            
            <PicFilters v-if="isReportActive" />
            
            <header v-else class="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between shrink-0">
                <h1 class="text-xl font-bold text-slate-800">Reporte PIC <span class="text-xs font-normal text-slate-400 ml-2">v2.1</span></h1>
            </header>

            <main class="flex-1 overflow-y-auto p-8 relative">
                
                <div v-if="!isReportActive" class="flex h-full items-center justify-center">
                    <div class="text-center max-w-lg">
                        <div class="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6">
                            <i class="fa-solid fa-chart-pie text-4xl text-brand-500"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-slate-800 mb-2">Generador de Reportes</h2>
                        <p class="text-slate-500 mb-8">
                            Utiliza el panel de filtros o consulta a la IA para visualizar el rendimiento de ventas y metas.
                        </p>
                        
                        <button 
                            @click="handleGenerate"
                            :disabled="store.isGenerating"
                            class="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-transform active:scale-95 flex items-center gap-2 mx-auto disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            <i v-if="store.isGenerating" class="fa-solid fa-circle-notch fa-spin"></i>
                            <span v-else>
                                <i class="fa-solid fa-bolt"></i> Generar Reporte 
                            </span>
                        </button>
                    </div>
                </div>

                <div v-else class="pb-20">
                    <ExecutiveSummaryCard />
                    
                    <PicGrid />
                </div>

            </main>
        </div>

        <PicChat />

    </div>
</template>