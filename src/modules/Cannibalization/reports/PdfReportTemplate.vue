<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    visualData: any[]; 
    tableData: any[];
    filters: any; // Ahora incluye .rules
    summary: any;
}>();

const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' });

// --- UTILS GRÁFICOS ---
const getSparklinePath = (data: number[], width: number, height: number) => {
    if (!data || data.length === 0) return '';
    const max = Math.max(...data, 10);
    const stepX = width / (data.length - 1);
    const points = data.map((val, index) => {
        const x = index * stepX;
        const y = height - ((val / max) * height); 
        return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
};

const getSparklineFill = (data: number[], width: number, height: number) => {
    const linePath = getSparklinePath(data, width, height);
    return `${linePath} L ${width},${height} L 0,${height} Z`;
};

// --- HELPER FORMATO ---
const fmtPct = (val: number) => `${(val * 100).toFixed(0)}%`;
</script>

<template>
    <div id="pdf-report-content" class="w-[900px] bg-white p-10 text-slate-800 relative font-sans">
        
        <div class="flex justify-between items-end mb-6 border-b-2 border-slate-800 pb-4">
            <div>
                <h1 class="text-2xl font-black text-slate-900 uppercase tracking-tighter">Reporte de Análisis: Canibalización</h1>
                <p class="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">PIC System • Inteligencia Comercial</p>
            </div>
            <div class="text-right">
                <div class="text-[10px] font-mono text-slate-400 mb-1">Generado el: {{ today }}</div>
                <div class="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 inline-block rounded-sm">CONFIDENCIAL</div>
            </div>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-10 shadow-sm break-inside-avoid">
            <h3 class="text-xs font-bold text-slate-900 uppercase mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                <i class="fa-solid fa-sliders"></i> Parámetros y Contexto del Análisis
            </h3>
            
            <div class="grid grid-cols-3 gap-8">
                <div class="space-y-2">
                    <div>
                        <span class="block text-[9px] font-bold text-slate-400 uppercase">Familia Analizada</span>
                        <span class="block text-sm font-bold text-slate-800">{{ filters.family }}</span>
                    </div>
                    <div>
                        <span class="block text-[9px] font-bold text-slate-400 uppercase">Periodo Fiscal</span>
                        <span class="block text-sm font-bold text-slate-800">{{ filters.year }}</span>
                    </div>
                </div>

                <div class="space-y-2 border-l border-slate-200 pl-4">
                    <div>
                        <span class="block text-[9px] font-bold text-slate-400 uppercase">Punto de Inflexión (Corte)</span>
                        <span class="block text-sm font-bold text-slate-800">Mes {{ filters.rules.splitMonth }}</span>
                    </div>
                    <div class="flex gap-4">
                        <div>
                            <span class="block text-[9px] font-bold text-slate-400 uppercase">Sensib. Caída</span>
                            <span class="block text-xs font-mono text-slate-700 bg-white px-1 border border-slate-200 rounded">{{ fmtPct(filters.rules.dropThreshold) }}</span>
                        </div>
                        <div>
                            <span class="block text-[9px] font-bold text-slate-400 uppercase">Sensib. Crecim.</span>
                            <span class="block text-xs font-mono text-slate-700 bg-white px-1 border border-slate-200 rounded">{{ fmtPct(filters.rules.growthThreshold) }}</span>
                        </div>
                    </div>
                </div>

                <div v-if="summary" class="space-y-2 border-l border-slate-200 pl-4">
                    <div class="flex justify-between items-center">
                        <span class="text-[9px] font-bold text-slate-400 uppercase">Impacto Neto Total</span>
                        <span class="text-sm font-black" :class="summary.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                            {{ summary.netBalance > 0 ? '+' : '' }}{{ summary.netBalance.toFixed(0) }} Kg
                        </span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-[9px] font-bold text-slate-400 uppercase">Tasa Sustitución Global</span>
                        <span class="text-sm font-bold text-slate-800">{{ summary.substitutionRate.toFixed(1) }}%</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-[9px] font-bold text-slate-400 uppercase">Casos Críticos</span>
                        <span class="text-xs font-bold text-rose-600 bg-rose-50 px-2 rounded-full border border-rose-100">{{ summary.redCases }} Detec.</span>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="visualData.length > 0" class="mb-10">
            <h3 class="text-sm font-bold text-slate-800 border-l-4 border-brand-600 pl-3 mb-6 uppercase tracking-wide">
                Detalle Gráfico (Top {{ visualData.length }})
            </h3>

            <div class="space-y-6">
                <div v-for="(item, idx) in visualData" :key="item.id" class="break-inside-avoid bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm">
                    
                    <div class="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <span class="w-6 h-6 rounded bg-slate-800 text-white text-xs font-bold flex items-center justify-center">#{{ idx + 1 }}</span>
                            <div>
                                <h4 class="text-sm font-bold text-slate-800">{{ item.clientName }}</h4>
                                <div class="text-[10px] text-slate-500 font-mono flex gap-2">
                                    <span>{{ item.matriz }}</span> • <span>{{ item.route }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right">
                             <span class="block text-[9px] font-bold text-slate-400 uppercase">Score Impacto</span>
                             <span class="font-mono font-bold text-slate-700">{{ item.impactScore.toFixed(0) }} pts</span>
                        </div>
                    </div>

                    <div class="p-4 grid grid-cols-12 gap-6">
                        <div class="col-span-7 relative h-32 border border-slate-100 rounded bg-slate-50/50">
                             <div class="absolute top-0 bottom-0 border-l border-dashed border-slate-400 z-0" :style="{ left: `${(filters.rules.splitMonth / 12) * 100}%` }"></div>
                             
                             <svg class="w-full h-full" viewBox="0 0 800 100" preserveAspectRatio="none">
                                <path :d="getSparklineFill(item.victimVector, 800, 100)" fill="rgba(244, 63, 94, 0.1)" />
                                <path :d="getSparklinePath(item.victimVector, 800, 100)" fill="none" stroke="#e11d48" stroke-width="2.5" />
                                <path :d="getSparklineFill(item.cannibalVector, 800, 100)" fill="rgba(16, 185, 129, 0.1)" />
                                <path :d="getSparklinePath(item.cannibalVector, 800, 100)" fill="none" stroke="#059669" stroke-width="2.5" />
                            </svg>
                        </div>

                        <div class="col-span-5 flex flex-col justify-center space-y-3">
                            <div class="flex justify-between items-start border-b border-slate-100 pb-2">
                                <div>
                                    <span class="text-[9px] font-bold text-rose-600 uppercase block mb-0.5">Víctima (Desplazado)</span>
                                    <span class="text-[10px] font-medium text-slate-600 leading-tight block">{{ item.victimSku }}</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-xs font-bold text-rose-600">-{{ item.volumeLost.toFixed(1) }}</span>
                                    <span class="text-[9px] text-slate-400 block">Kg</span>
                                </div>
                            </div>

                            <div class="flex justify-between items-start border-b border-slate-100 pb-2">
                                <div>
                                    <span class="text-[9px] font-bold text-emerald-600 uppercase block mb-0.5">Caníbal (Crecimiento)</span>
                                    <span class="text-[10px] font-medium text-slate-600 leading-tight block">{{ item.cannibalSku }}</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-xs font-bold text-emerald-600">+{{ item.volumeGained.toFixed(1) }}</span>
                                    <span class="text-[9px] text-slate-400 block">Kg</span>
                                </div>
                            </div>

                            <div class="flex justify-between items-center pt-1">
                                <div>
                                    <span class="text-[9px] text-slate-400 font-bold uppercase">Sustitución</span>
                                    <span class="ml-1 text-[10px] font-bold text-slate-700">{{ item.substitutionRate.toFixed(1) }}%</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-sm font-black px-2 py-0.5 rounded border"
                                          :class="item.netBalance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'">
                                        Neto: {{ item.netBalance > 0 ? '+' : '' }}{{ item.netBalance.toFixed(1) }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="break-after-page"></div>
        </div>

        <div v-if="tableData.length > 0" class="break-inside-avoid">
            <h3 class="text-sm font-bold text-slate-800 border-l-4 border-slate-600 pl-3 mb-6 uppercase tracking-wide">
                Anexo de Datos Tabulares ({{ tableData.length }} Registros)
            </h3>

            <table class="w-full text-[10px] text-left border border-slate-300">
                <thead class="bg-slate-100 text-slate-700 uppercase font-bold">
                    <tr>
                        <th class="p-2 border-b border-slate-300 w-1/4">Cliente / Ruta</th>
                        <th class="p-2 border-b border-slate-300 w-1/4">Víctima</th>
                        <th class="p-2 border-b border-slate-300 w-1/4">Caníbal</th>
                        <th class="p-2 border-b border-slate-300 text-right w-[8%]">Perd.</th>
                        <th class="p-2 border-b border-slate-300 text-right w-[8%]">Gan.</th>
                        <th class="p-2 border-b border-slate-300 text-right w-[9%]">Neto</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                    <tr v-for="(item, idx) in tableData" :key="item.id" class="break-inside-avoid" :class="idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'">
                        <td class="p-2 align-top">
                            <div class="font-bold text-slate-800">{{ item.clientName }}</div>
                            <div class="text-[9px] text-slate-500 mt-0.5">{{ item.matriz }} - {{ item.route }}</div>
                        </td>
                        <td class="p-2 align-top text-slate-600 whitespace-normal">
                            {{ item.victimSku }}
                        </td>
                        <td class="p-2 align-top text-slate-600 whitespace-normal">
                            {{ item.cannibalSku }}
                        </td>
                        <td class="p-2 align-top text-right text-rose-600 font-bold border-l border-slate-100">
                            -{{ item.volumeLost.toFixed(1) }}
                        </td>
                        <td class="p-2 align-top text-right text-emerald-600 font-bold border-l border-slate-100">
                            +{{ item.volumeGained.toFixed(1) }}
                        </td>
                        <td class="p-2 align-top text-right font-black border-l border-slate-100" 
                            :class="item.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                            {{ item.netBalance.toFixed(1) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="mt-10 pt-4 border-t border-slate-300 text-center">
            <p class="text-[9px] text-slate-400">
                Este reporte refleja los datos disponibles al momento de la generación bajo los filtros especificados.
            </p>
        </div>
    </div>
</template>