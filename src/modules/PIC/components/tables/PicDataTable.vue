<script setup lang="ts">
import { computed } from 'vue';
import { usePicFilterStore } from '../../stores/picFilterStore';
import { usePicChatStore } from '../../stores/picChatStore'; // <--- Importar Chat Store
import { calculateTableData, formatCurrency, formatNumber } from '../../utils/picUtils';

const props = defineProps<{
    title: string;
    type: 'pesos' | 'kilos' | 'promedio';
    processedData: any[]; 
    years: string[];
}>();

const store = usePicFilterStore();
const chatStore = usePicChatStore(); // <--- Instanciar

const tableData = computed(() => {
    return calculateTableData(
        props.processedData, 
        props.years, 
        props.type, 
        store.isComparisonFrozen
    );
});

const getDiffClass = (val: number) => val < 0 ? 'text-red-500' : 'text-emerald-600';
const fmt = (val: number) => props.type === 'kilos' ? formatNumber(val) : formatCurrency(val);

// ACCIÓN: Enviar datos de la tabla al chat
const handleAnalyze = () => {
    // Enviamos 'tableData.rows' y 'footer' que ya contienen los cálculos (diff, growth, etc.)
    // Esto es mucho más rico para la IA que los datos crudos.
    const contextData = {
        rows: tableData.value.rows,
        totals: tableData.value.footer,
        years: tableData.value.sortedYears
    };
    
    chatStore.setContext(props.title, contextData, 'table');
};
</script>

<template>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group transition-shadow hover:shadow-md">
        
        <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
                <i class="fa-solid fa-table text-slate-400"></i> {{ title }}
            </h3>
            
            <div class="flex items-center gap-3">
                <button 
                    @click="handleAnalyze"
                    class="text-slate-400 hover:text-brand-600 flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                    title="Analizar esta tabla con IA"
                >
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Analizar
                </button>

                <button 
                    v-if="tableData.prevYear"
                    @click="store.toggleComparisonLock()"
                    class="text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1"
                    :class="store.isComparisonFrozen ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-orange-50 text-orange-600 border-orange-200'"
                    title="Bloquear/Desbloquear comparación del mes actual"
                >
                    <i class="fa-solid" :class="store.isComparisonFrozen ? 'fa-lock' : 'fa-lock-open'"></i>
                    <span class="hidden sm:inline">{{ store.isComparisonFrozen ? 'Mes Actual Bloqueado' : 'Comparar Mes Actual' }}</span>
                </button>
            </div>
        </div>

        <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-sm text-left border-collapse">
                <thead class="text-xs text-white uppercase bg-slate-800 font-semibold sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="px-4 py-3 border-r border-slate-700 bg-slate-900/50">Mes</th>
                        <th v-for="y in tableData.sortedYears" :key="y" class="px-4 py-3 text-right font-medium">
                            {{ type === 'kilos' ? 'Venta KG' : (type === 'pesos' ? 'Venta $' : 'Promedio') }} {{ y }}
                        </th>
                        
                        <th v-if="type === 'kilos'" class="px-4 py-3 text-right text-purple-300 bg-slate-700/50">
                            Meta {{ tableData.currentYear }}
                        </th>

                        <template v-if="tableData.prevYear">
                            <th class="px-4 py-3 text-right text-slate-300 font-medium">DIF vs {{ tableData.prevYear }}</th>
                            <th class="px-4 py-3 text-right text-slate-300 font-medium">Crec %</th>
                            
                            <template v-if="type === 'kilos'">
                                <th class="px-4 py-3 text-right text-slate-300 font-medium">DIF vs Meta</th>
                                <th class="px-4 py-3 text-right text-slate-300 font-medium">Var % Meta</th>
                            </template>
                        </template>
                    </tr>
                </thead>
               <tbody class="divide-y divide-slate-100">
                    <tr v-for="row in tableData.rows" :key="row.mesIndex" class="hover:bg-slate-50/50 transition-colors">
                        <td class="px-4 py-3 font-medium text-slate-700">{{ row.nombre }}</td>
                        
                        <td v-for="y in tableData.sortedYears" :key="y" class="px-4 py-3 text-right tabular-nums text-slate-600 font-mono">
                            {{ fmt(row[y]) }}
                        </td>

                        <td v-if="type === 'kilos'" class="px-4 py-3 text-right tabular-nums text-purple-600 font-medium font-mono">
                            {{ fmt(row[`meta_${tableData.currentYear}`]) }}
                        </td>

                        <template v-if="tableData.prevYear">
                            <td class="px-4 py-3 text-right tabular-nums font-medium font-mono" :class="row.diff !== null ? getDiffClass(row.diff) : 'text-slate-300'">
                                {{ row.diff !== null ? fmt(row.diff) : '—' }}
                            </td>
                            <td class="px-4 py-3 text-right tabular-nums font-bold font-mono" :class="row.growth !== null ? getDiffClass(row.growth) : 'text-slate-300'">
                                {{ row.growth !== null ? row.growth.toFixed(1) + '%' : '—' }}
                            </td>

                            <template v-if="type === 'kilos'">
                                <td class="px-4 py-3 text-right tabular-nums font-mono" :class="row.diffMeta !== null ? getDiffClass(row.diffMeta) : 'text-slate-300'">
                                    {{ row.diffMeta !== null ? fmt(row.diffMeta) : '—' }}
                                </td>
                                <td class="px-4 py-3 text-right tabular-nums font-bold font-mono" :class="row.varMeta !== null ? (row.varMeta >= 100 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-300'">
                                    {{ row.varMeta !== null ? row.varMeta.toFixed(1) + '%' : '—' }}
                                </td>
                            </template>
                        </template>
                    </tr>
                </tbody>
               <tfoot class="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                    <tr>
                        <td class="px-4 py-3">TOTAL</td>
                        
                        <td v-for="y in tableData.sortedYears" :key="y" class="px-4 py-3 text-right tabular-nums font-mono">
                            {{ fmt(tableData.footer[y]) }}
                        </td>
                        
                        <td v-if="type === 'kilos'" class="px-4 py-3 text-right tabular-nums text-purple-700 font-mono">
                            {{ fmt(tableData.footer[`meta_${tableData.currentYear}`]) }}
                        </td>

                        <template v-if="tableData.prevYear">
                            <td class="px-4 py-3 text-right tabular-nums font-mono" :class="getDiffClass(tableData.footer.diff)">
                                {{ fmt(tableData.footer.diff) }}
                            </td>
                            <td class="px-4 py-3 text-right tabular-nums font-mono" :class="getDiffClass(tableData.footer.growth)">
                                {{ tableData.footer.growth.toFixed(1) }}%
                            </td>

                            <template v-if="type === 'kilos'">
                                <td class="px-4 py-3 text-right tabular-nums font-mono" :class="getDiffClass(tableData.footer.diffMeta)">
                                    {{ fmt(tableData.footer.diffMeta) }}
                                </td>
                                <td class="px-4 py-3 text-right tabular-nums font-mono" :class="tableData.footer.varMeta >= 100 ? 'text-emerald-600' : 'text-red-500'">
                                    {{ tableData.footer.varMeta.toFixed(1) }}%
                                </td>
                            </template>
                        </template>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
</template>
<style scoped>
/* Scrollbar fino para coincidir con el estilo del sistema */
.custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
</style>