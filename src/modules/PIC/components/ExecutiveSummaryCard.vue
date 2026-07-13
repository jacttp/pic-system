<script setup lang="ts">
import { ref } from 'vue';
import { usePicFilterStore } from '../stores/picFilterStore';
import { picApi } from '../services/picApi';

const store = usePicFilterStore();
const summaryText = ref('');
const isLoading = ref(false);
const isExpanded = ref(true);
const hasGenerated = ref(false);

const generateSummary = async () => {
    if (store.reportData.length === 0) return;
    
    isLoading.value = true;
    isExpanded.value = true;
    try {
        const result = await picApi.getOpenAiExecutiveSummary(store.reportData);
        summaryText.value = result;
        hasGenerated.value = true;
    } catch (e) {
        summaryText.value = 'No se pudo generar el resumen ejecutivo en este momento.';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <div 
        class="mb-6 overflow-hidden rounded-2xl border border-pic-border bg-pic-surface text-pic-text-main shadow-sm transition-all duration-300 md:mb-8 md:rounded-xl"
        :data-html2canvas-ignore="!hasGenerated ? 'true' : undefined"
    >
        
        <div class="flex items-center justify-between bg-pic-nav p-5 text-pic-nav-text md:bg-pic-nav md:p-4">
            <div class="flex items-center gap-3">
                <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm md:h-10 md:w-10">
                    <i class="fa-solid fa-wand-magic-sparkles text-2xl md:text-xl"></i>
                </div>
                <div>
                    <h3 class="text-xl font-black md:text-base md:font-bold">Asistente IA</h3>
                    <p class="mt-1 text-xs font-bold uppercase tracking-wider text-pic-nav-text-muted md:mt-0 md:text-[10px] md:font-medium">Análisis Financiero Automático</p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <button 
                    v-if="hasGenerated"
                    data-pic-print-control="true"
                    @click="isExpanded = !isExpanded"
                    class="text-pic-nav-text-muted transition-colors hover:text-pic-nav-text"
                >
                    <i class="fa-solid" :class="isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
            </div>
        </div>

        <div v-if="isExpanded" class="bg-pic-nav px-5 pb-5 text-pic-nav-text transition-all duration-300 md:bg-pic-surface md:p-0 md:text-pic-text-main">
            
            <div v-if="!hasGenerated && !isLoading" class="text-left md:flex md:items-center md:justify-between md:gap-6 md:bg-pic-nav md:p-5 md:text-pic-nav-text">
                <p class="mb-5 max-w-[310px] text-lg leading-relaxed text-pic-nav-text md:mb-0 md:max-w-2xl md:text-sm md:text-pic-nav-text">
                    Genera un análisis narrativo profesional basado en los datos actuales del reporte.
                </p>
                <button 
                    data-pic-print-control="true"
                    @click="generateSummary"
                    class="flex shrink-0 items-center gap-2 rounded-xl bg-pic-brand px-6 py-3 text-base font-black text-white shadow-lg shadow-pic-brand/25 transition-all hover:-translate-y-0.5 hover:bg-pic-brand/90 md:py-2.5 md:text-sm"
                >
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Generar Análisis
                </button>
            </div>

            <div v-if="isLoading" class="flex flex-col items-center justify-center p-12 text-pic-nav-text-muted md:text-pic-text-muted">
                <i class="fa-solid fa-circle-notch fa-spin mb-3 text-3xl text-pic-brand"></i>
                <span class="text-xs font-medium animate-pulse">El CFO Virtual está analizando los datos...</span>
            </div>

            <div v-if="hasGenerated && !isLoading" class="animate-fade-in rounded-xl bg-pic-surface p-5 text-pic-text-main md:p-8">
                <div class="prose prose-sm prose-slate max-w-none">
                    <div class="whitespace-pre-line leading-relaxed text-pic-text-main">{{ summaryText }}</div>
                </div>
                
                <div data-pic-print-control="true" class="mt-6 flex items-center justify-between border-t border-pic-border pt-4">
                    <span class="text-[10px] text-pic-text-muted">Generado con IA • Revisar antes de compartir</span>
                    <button @click="generateSummary" class="flex items-center gap-1 text-xs font-medium text-pic-brand hover:text-pic-text-main">
                        <i class="fa-solid fa-rotate-right"></i> Regenerar
                    </button>
                </div>
            </div>

        </div>
    </div>
</template>

