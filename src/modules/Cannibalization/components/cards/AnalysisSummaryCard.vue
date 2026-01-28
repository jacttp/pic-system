<script setup lang="ts">
import { computed } from 'vue';
import { useCannibalizationStore } from '../../stores/cannibalizationStore';

const store = useCannibalizationStore();

const emit = defineEmits(['export']);

// --- CÁLCULOS AGREGADOS ---
const stats = computed(() => {
    const cases = store.detectedCases;
    const totalCases = cases.length;
    
    if (totalCases === 0) return null;

    // 1. Totales de Volumen
    const totalLoss = cases.reduce((acc, c) => acc + c.volumeLost, 0);
    const totalGain = cases.reduce((acc, c) => acc + c.volumeGained, 0);
    const netBalance = totalGain - totalLoss;

    // 2. Conteo de Rojos (Casos ineficientes)
    const redCases = cases.filter(c => c.netBalance < 0).length;
    const redPercentage = (redCases / totalCases) * 100;

    // 3. Tasa de Sustitución (Efficiency)
    // Cuánto de la caída fue cubierto por el caníbal.
    const substitutionRate = totalLoss > 0 ? (totalGain / totalLoss) * 100 : 0;

    // 4. Familia más afectada (Moda)
    const familyCounts: Record<string, number> = {};
    cases.forEach(c => { familyCounts[c.family] = (familyCounts[c.family] || 0) + 1; });
    const topFamily = Object.keys(familyCounts).reduce((a, b) => familyCounts[a] > familyCounts[b] ? a : b, '');

    return {
        totalLoss,
        totalGain,
        netBalance,
        redCases,
        redPercentage,
        substitutionRate,
        topFamily
    };
});

// Helper de formato
const fmt = (num: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(num);

// Color semántico del balance global
const balanceColor = computed(() => {
    if (!stats.value) return 'text-slate-500';
    return stats.value.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600';
});
</script>

<template>
    <div class="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col h-full relative overflow-hidden">
        
        <div class="flex justify-between items-start mb-6 z-10">
            <div>
                <h3 class="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <i class="fa-solid fa-clipboard-list text-brand-500"></i>
                    Resumen del Análisis
                </h3>
                <p class="text-[10px] text-slate-400 mt-1">
                    Basado en {{ store.detectedCases.length }} casos detectados • Corte: {{ store.rules.splitMonth }}
                </p>
            </div>
            
            <button 
                @click="$emit('export')"
                class="group flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-brand-50 text-slate-600 hover:text-brand-600 border border-slate-200 hover:border-brand-200 rounded-lg transition-all text-xs font-semibold"
            >
                <i class="fa-solid fa-file-export group-hover:scale-110 transition-transform"></i>
                <span>Exportar</span>
            </button>
        </div>

        <div v-if="stats" class="flex-1 flex flex-col gap-6 z-10">
            
            <div class="flex items-end justify-between border-b border-slate-100 pb-4">
                <div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Balance Neto Global</span>
                    <div class="text-3xl font-black tracking-tight flex items-baseline gap-1" :class="balanceColor">
                        <span>{{ stats.netBalance > 0 ? '+' : '' }}{{ fmt(stats.netBalance) }}</span>
                        <span class="text-sm font-medium text-slate-400">Kg</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tasa Sustitución</span>
                    <div class="text-xl font-bold text-slate-700">
                        {{ stats.substitutionRate.toFixed(1) }}%
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="bg-rose-50 rounded-lg p-3 border border-rose-100">
                    <div class="flex items-center gap-2 mb-1">
                        <i class="fa-solid fa-circle-xmark text-rose-500 text-xs"></i>
                        <span class="text-[10px] font-bold text-rose-700 uppercase">CANIBALIZACIÓN</span>
                    </div>
                    <p class="text-xs text-rose-800 leading-snug">
                        <span class="font-bold">{{ stats.redCases }} casos</span> ({{ stats.redPercentage.toFixed(0) }}%) de {{ store.detectedCases.length }} generaron pérdida neta de volumen.
                    </p>
                </div>

                <div class="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div class="flex items-center gap-2 mb-1">
                        <i class="fa-solid fa-bullseye text-slate-500 text-xs"></i>
                        <span class="text-[10px] font-bold text-slate-500 uppercase">Familia Analizada</span>
                    </div>
                    <p class="text-xs text-slate-700 font-medium truncate" :title="stats.topFamily">
                        {{ stats.topFamily || 'N/A' }}
                    </p>
                </div>
            </div>

            <div class="mt-auto pt-2 text-[9px] text-slate-400 font-mono flex gap-3">
                <span><i class="fa-solid fa-filter mr-1"></i>Umbrales: -{{ (store.rules.dropThreshold * 100).toFixed(0) }}% / +{{ (store.rules.growthThreshold * 100).toFixed(0) }}%</span>
                <span><i class="fa-solid fa-cube mr-1"></i>Vol. Min: {{ store.rules.minVolume }}kg</span>
            </div>

        </div>

        <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-300 z-10">
            <i class="fa-solid fa-chart-simple text-4xl mb-2 opacity-50"></i>
            <p class="text-xs">Sin datos para resumir</p>
        </div>

        <div class="absolute -right-6 -bottom-6 text-slate-50 opacity-50 pointer-events-none transform rotate-12">
            <i class="fa-solid fa-file-invoice-dollar text-9xl"></i>
        </div>
    </div>
</template>