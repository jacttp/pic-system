<script setup lang="ts">
import { ref } from 'vue';
import { usePicFilterStore } from '../stores/picFilterStore';
import { picApi } from '../services/picApi';

const store = usePicFilterStore();
const summaryHtml = ref('');
const isLoading = ref(false);
const isExpanded = ref(true);
const hasGenerated = ref(false);

const generateSummary = async () => {
    if (store.reportData.length === 0) return;
    
    isLoading.value = true;
    isExpanded.value = true;
    try {
        const result = await picApi.getExecutiveSummary(store.reportData);
        summaryHtml.value = result;
        hasGenerated.value = true;
    } catch (e) {
        summaryHtml.value = '<p class="text-red-500">No se pudo generar el resumen ejecutivo en este momento.</p>';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 transition-all duration-300">
        
        <div class="p-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                    <i class="fa-solid fa-user-tie text-xl text-brand-300"></i>
                </div>
                <div>
                    <h3 class="font-bold text-sm md:text-base">Resumen Ejecutivo IA</h3>
                    <p class="text-[10px] text-slate-300 uppercase tracking-wider font-medium">Análisis Financiero Automático</p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <button 
                    v-if="hasGenerated"
                    @click="isExpanded = !isExpanded"
                    class="text-slate-300 hover:text-white transition-colors"
                >
                    <i class="fa-solid" :class="isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
            </div>
        </div>

        <div v-if="isExpanded" class="bg-white transition-all duration-300">
            
            <div v-if="!hasGenerated && !isLoading" class="p-8 text-center">
                <p class="text-slate-500 text-sm mb-4">
                    Genera un análisis narrativo profesional basado en los datos actuales del reporte.
                </p>
                <button 
                    @click="generateSummary"
                    class="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-brand-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2 mx-auto"
                >
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Generar Análisis
                </button>
            </div>

            <div v-if="isLoading" class="p-12 flex flex-col items-center justify-center text-slate-400">
                <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-500 mb-3"></i>
                <span class="text-xs font-medium animate-pulse">El CFO Virtual está analizando los datos...</span>
            </div>

            <div v-if="hasGenerated && !isLoading" class="p-6 md:p-8 animate-fade-in">
                <div class="prose prose-sm prose-slate max-w-none">
                    <div v-html="summaryHtml" class="ai-content text-slate-700 leading-relaxed"></div>
                </div>
                
                <div class="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span class="text-[10px] text-slate-400">Generado con IA • Revisar antes de compartir</span>
                    <button @click="generateSummary" class="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1">
                        <i class="fa-solid fa-rotate-right"></i> Regenerar
                    </button>
                </div>
            </div>

        </div>
    </div>
</template>

<style>
/* Estilos para el contenido HTML inyectado por la IA */
.ai-content p { margin-bottom: 1rem; }
.ai-content strong { color: #0f172a; font-weight: 700; }
.ai-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
.ai-content li { margin-bottom: 0.5rem; }
</style>