<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePicFilterStore } from '../../stores/picFilterStore';
import { formatNumber } from '../../utils/formatters';

const props = defineProps<{
    title: string;
    dimensionKey: string; // 'marcas', 'zona', etc. (Clave exacta del store)
    initialCollapsed?: boolean;
}>();

const store = usePicFilterStore();
const isCollapsed = ref(props.initialCollapsed || false);

// Acceder dinámicamente a los datos en el store usando la prop
const tableData = computed(() => store.projectionData[props.dimensionKey as keyof typeof store.projectionData] || []);
const isLoading = computed(() => store.loadingProjections[props.dimensionKey] || false);

// Años a comparar (Leemos del store directamente para estar sincronizados)
const years = computed(() => {
    return store.selected.Anio.length > 0 
        ? [...store.selected.Anio].sort() 
        : ['2023', '2024', '2025'];
});

// Años clave
const currentYear = computed(() => years.value[years.value.length - 1]);
const prevYear = computed(() => years.value.length > 1 ? years.value[years.value.length - 2] : null);

// --- LÓGICA DE CARGA ---
const handleLoad = () => {
    isCollapsed.value = false; // Asegurar que se vea al cargar
    store.fetchSingleProjection(props.dimensionKey);
};

// --- LÓGICA MATEMÁTICA (Igual que antes) ---
const processedRows = computed(() => {
    if (tableData.value.length === 0) return [];
    
    const yCurr = currentYear.value;
    const yPrev = prevYear.value;
    const totalMarketSize = tableData.value.reduce((sum, row) => sum + (row[`Venta_${yCurr}`] || 0), 0);

    return tableData.value.map(row => {
        const valCurr = row[`Venta_${yCurr}`] || 0;
        const valPrev = yPrev ? (row[`Venta_${yPrev}`] || 0) : 0;
        const meta = row[`Meta_${yCurr}`] || 0;
        const difAnual = valCurr - valPrev;
        const difMeta = valCurr - meta;
        const crec = valPrev !== 0 ? (difAnual / valPrev) * 100 : 0;
        const varMeta = meta !== 0 ? (valCurr / meta) * 100 : 0;
        const share = totalMarketSize !== 0 ? (valCurr / totalMarketSize) * 100 : 0;

        return { ...row, valCurr, valPrev, meta, difAnual, difMeta, crec, varMeta, share };
    });
});

// Footer (Igual que antes)
const footer = computed(() => {
    if (processedRows.value.length === 0) return null;
    const sums: any = { Dimension: 'TOTAL' };
    years.value.forEach(y => {
        sums[`Venta_${y}`] = processedRows.value.reduce((s, r) => s + (r[`Venta_${y}`] || 0), 0);
    });
    sums.meta = processedRows.value.reduce((s, r) => s + r.meta, 0);
    const totalCurr = sums[`Venta_${currentYear.value}`];
    const totalPrev = prevYear.value ? sums[`Venta_${prevYear.value}`] : 0;
    sums.difAnual = totalCurr - totalPrev;
    sums.difMeta = totalCurr - sums.meta;
    sums.crec = totalPrev !== 0 ? (sums.difAnual / totalPrev) * 100 : 0;
    sums.varMeta = sums.meta !== 0 ? (totalCurr / sums.meta) * 100 : 0;
    sums.share = 100;
    return sums;
});

const colorClass = (val: number, isPercent = false) => {
    if (val === 0) return 'text-slate-400';
    if (isPercent && val >= 100) return 'text-emerald-700 font-bold';
    if (isPercent) return val >= 0 ? 'text-emerald-700' : 'text-red-600';
    return val >= 0 ? 'text-emerald-700' : 'text-red-600';
};
</script>

<template>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full transition-all duration-300">
        
        <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
            <h3 class="font-bold text-slate-700 text-xs uppercase tracking-wide flex items-center gap-2">
                <i class="fa-solid fa-chart-gantt text-slate-400"></i>
                {{ title }}
            </h3>
            
            <button v-if="tableData.length > 0" @click="isCollapsed = !isCollapsed" class="text-[10px] uppercase font-bold text-slate-400 hover:text-brand-600">
                {{ isCollapsed ? 'Mostrar' : 'Ocultar' }}
            </button>
        </div>

        <div v-if="tableData.length === 0 && !isLoading" class="p-6 flex flex-col items-center justify-center bg-slate-50/50 min-h-[150px]">
            <p class="text-xs text-slate-500 mb-3">Análisis disponible bajo demanda</p>
            <button 
                @click="handleLoad"
                class="bg-white border border-slate-300 hover:border-brand-400 hover:text-brand-600 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2"
            >
                <i class="fa-solid fa-bolt"></i> Generar Tabla
            </button>
        </div>

        <div v-else-if="isLoading" class="p-8 text-center text-slate-500 min-h-[150px] flex items-center justify-center">
            <div class="flex flex-col items-center gap-2">
                <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-500"></i>
                <span class="text-xs font-medium">Procesando datos...</span>
            </div>
        </div>

        <div v-else-if="!isCollapsed" class="overflow-x-auto custom-scrollbar animate-fade-in">
            <table class="w-full text-xs text-left border-collapse whitespace-nowrap">
                <thead class="bg-slate-800 text-white font-semibold uppercase sticky top-0 z-10">
                    <tr>
                        <th class="px-3 py-2 text-left bg-slate-900 border-r border-slate-700 min-w-[150px] sticky left-0 z-20">
                            Concepto
                        </th>
                        <th v-for="y in years" :key="y" class="px-3 py-2 text-right">Venta {{ y }}</th>
                        <th class="px-3 py-2 text-right bg-slate-700">Meta {{ currentYear }}</th>
                        <th class="px-3 py-2 text-right">Dif (Año)</th>
                        <th class="px-3 py-2 text-right">Dif (Meta)</th>
                        <th class="px-3 py-2 text-right">Crec %</th>
                        <th class="px-3 py-2 text-right">Cumpl %</th>
                        <th class="px-3 py-2 text-right bg-slate-900/50">Part %</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="(row, idx) in processedRows" :key="idx" class="hover:bg-yellow-50 transition-colors group">
                        <td class="px-3 py-2 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-yellow-50 border-r border-slate-100 truncate max-w-[200px]" :title="row.Dimension">
                            {{ row.Dimension }}
                        </td>
                        <td v-for="y in years" :key="y" class="px-3 py-2 text-right text-slate-600 font-mono">{{ formatNumber(row[`Venta_${y}`]) }}</td>
                        <td class="px-3 py-2 text-right text-emerald-700 font-mono bg-emerald-50/30">{{ formatNumber(row.meta) }}</td>
                        <td class="px-3 py-2 text-right font-mono" :class="colorClass(row.difAnual)">{{ formatNumber(row.difAnual) }}</td>
                        <td class="px-3 py-2 text-right font-mono" :class="colorClass(row.difMeta)">{{ formatNumber(row.difMeta) }}</td>
                        <td class="px-3 py-2 text-right font-bold" :class="colorClass(row.crec)">{{ row.crec.toFixed(1) }}%</td>
                        <td class="px-3 py-2 text-right font-bold" :class="colorClass(row.varMeta, true)">{{ row.varMeta.toFixed(1) }}%</td>
                        <td class="px-3 py-2 text-right text-slate-800 font-bold bg-slate-50">{{ row.share.toFixed(1) }}%</td>
                    </tr>
                </tbody>
                <tfoot v-if="footer" class="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                    <tr>
                        <td class="px-3 py-2 sticky left-0 bg-slate-100 border-r border-slate-200">TOTAL</td>
                        <td v-for="y in years" :key="y" class="px-3 py-2 text-right font-mono">{{ formatNumber(footer[`Venta_${y}`]) }}</td>
                        <td class="px-3 py-2 text-right font-mono text-emerald-800">{{ formatNumber(footer.meta) }}</td>
                        <td class="px-3 py-2 text-right font-mono" :class="colorClass(footer.difAnual)">{{ formatNumber(footer.difAnual) }}</td>
                        <td class="px-3 py-2 text-right font-mono" :class="colorClass(footer.difMeta)">{{ formatNumber(footer.difMeta) }}</td>
                        <td class="px-3 py-2 text-right" :class="colorClass(footer.crec)">{{ footer.crec.toFixed(1) }}%</td>
                        <td class="px-3 py-2 text-right" :class="colorClass(footer.varMeta, true)">{{ footer.varMeta.toFixed(1) }}%</td>
                        <td class="px-3 py-2 text-right bg-slate-200">100%</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.animate-fade-in { animation: fadeIn 0.3s ease-in; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>