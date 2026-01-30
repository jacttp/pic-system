<script setup lang="ts">
import { computed } from 'vue';
import { useCannibalizationStore } from '../../stores/cannibalizationStore';

const store = useCannibalizationStore();

// Helper rápido para formato numérico
const fmt = (n: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n);

const stats = computed(() => {
    // 1. Configuración de tiempos
    const splitMonth = store.rules.splitMonth; 
    const splitIndex = splitMonth - 1; // Índice 0-11
    
    // 2. Inicializar acumuladores mensuales
    const monthlyClients = Array.from({ length: 12 }, () => new Set<string>());
    const monthlyVolume = new Array(12).fill(0);

    // 3. Procesar datos
    store.detectedCases.forEach(c => {
        const client = store.rawData.find(cli => cli.name === c.clientName);
        if (!client) return;
        
        const family = client.families.find(f => f.name === c.family);
        if (!family) return;

        const victim = family.skus.find(s => s.name === c.victimSku);
        const cannibal = family.skus.find(s => s.name === c.cannibalSku);

        if (victim && cannibal) {
            for (let i = 0; i < 12; i++) {
                const vVal = (victim.salesVector[i] || 0);
                const cVal = (cannibal.salesVector[i] || 0);
                const totalMonth = vVal + cVal;

                // A. Sumar Volumen Total (Víctima + Caníbal)
                monthlyVolume[i] += totalMonth;

                // B. Contar Cliente si hubo actividad
                if (totalMonth > 0) {
                    monthlyClients[i].add(client.matriz);
                }
            }
        }
    });

    // 4. Función genérica para calcular Pre/Post/Diff
    const calculateMetric = (dataArray: number[]) => {
        let sumPre = 0, countPre = 0;
        let sumPost = 0, countPost = 0;

        dataArray.forEach((val, i) => {
            if (i < splitIndex) {
                sumPre += val;
                countPre++;
            } else {
                sumPost += val;
                countPost++;
            }
        });

        const avgPre = countPre > 0 ? sumPre / countPre : 0;
        const avgPost = countPost > 0 ? sumPost / countPost : 0;
        const diff = avgPost - avgPre;
        const percent = avgPre > 0 ? (diff / avgPre) * 100 : 0;

        return { avgPre, avgPost, diff, percent };
    };

    // 5. Calcular métricas finales
    const clientStats = calculateMetric(monthlyClients.map(s => s.size));
    const volumeStats = calculateMetric(monthlyVolume);

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    return {
        splitName: months[splitIndex],
        clients: clientStats,
        volume: volumeStats
    };
});
</script>

<template>
    <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
        
        <div class="flex items-center justify-between border-b border-slate-50 pb-2">
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500 text-xs">
                    <i class="fa-solid fa-calendar-week"></i>
                </div>
                <div>
                    <p class="text-[9px] text-slate-400 uppercase font-bold leading-none">Corte Estrategia</p>
                    <p class="text-xs font-bold text-slate-700 capitalize">Mes {{ stats.splitName }}</p>
                </div>
            </div>
            <div class="text-[9px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                Promedios Mensuales (Pre vs Post)
            </div>
        </div>

        <div class="flex items-center justify-between group">
            <div class="flex items-center gap-3 w-1/3">
                <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs shrink-0">
                    <i class="fa-solid fa-users"></i>
                </div>
                <div>
                    <p class="text-[10px] text-slate-400 font-bold uppercase">Cobertura</p>
                    <div class="flex items-baseline gap-1">
                        <span class="text-xs font-medium text-slate-500">{{ fmt(stats.clients.avgPre) }}</span>
                        <i class="fa-solid fa-arrow-right text-[9px] text-slate-300"></i>
                        <span class="text-xs font-bold text-slate-700">{{ fmt(stats.clients.avgPost) }}</span>
                    </div>
                </div>
            </div>

            <div class="flex-1 px-4">
                <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div class="bg-slate-300 h-full" style="width: 50%"></div>
                    <div 
                        class="h-full transition-all duration-500"
                        :class="stats.clients.diff >= 0 ? 'bg-emerald-500' : 'bg-rose-500'"
                        :style="{ width: '50%' }" 
                    ></div>
                </div>
            </div>

            <div class="w-20 text-right">
                <span 
                    class="text-xs font-bold px-1.5 py-0.5 rounded border"
                    :class="stats.clients.diff >= 0 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-rose-50 text-rose-700 border-rose-100'"
                >
                    {{ stats.clients.diff > 0 ? '+' : '' }}{{ stats.clients.percent.toFixed(1) }}%
                </span>
            </div>
        </div>

        <div class="border-t border-slate-100 border-dashed"></div>

        <div class="flex items-center justify-between group">
            <div class="flex items-center gap-3 w-1/3">
                <div class="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs shrink-0">
                    <i class="fa-solid fa-weight-hanging"></i>
                </div>
                <div>
                    <p class="text-[10px] text-slate-400 font-bold uppercase">Volumen Total</p>
                    <div class="flex items-baseline gap-1">
                        <span class="text-xs font-medium text-slate-500">{{ fmt(stats.volume.avgPre) }}k</span>
                        <i class="fa-solid fa-arrow-right text-[9px] text-slate-300"></i>
                        <span class="text-xs font-bold text-slate-700">{{ fmt(stats.volume.avgPost) }}k</span>
                    </div>
                </div>
            </div>

            <div class="flex-1 px-4">
                 <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div class="bg-slate-300 h-full" style="width: 50%"></div>
                    <div 
                        class="h-full transition-all duration-500"
                        :class="stats.volume.diff >= 0 ? 'bg-emerald-500' : 'bg-rose-500'"
                        :style="{ width: '50%' }" 
                    ></div>
                </div>
            </div>

            <div class="w-20 text-right">
                <span 
                    class="text-xs font-bold px-1.5 py-0.5 rounded border"
                    :class="stats.volume.diff >= 0 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-rose-50 text-rose-700 border-rose-100'"
                >
                    {{ stats.volume.diff > 0 ? '+' : '' }}{{ stats.volume.percent.toFixed(1) }}%
                </span>
            </div>
        </div>

    </div>
</template>