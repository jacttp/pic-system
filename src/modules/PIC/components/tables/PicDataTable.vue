<script setup lang="ts">
import { computed } from 'vue';
import { usePicFilterStore } from '../../stores/picFilterStore';
import { calculateTableData, formatCurrency, formatNumber } from '../../utils/picUtils';

const props = defineProps<{
    title: string;
    type: 'pesos' | 'kilos' | 'promedio';
    processedData: any[]; // Datos ya procesados por processChartData
    years: string[];
}>();

const store = usePicFilterStore();

// Calculamos toda la data de la tabla usando la utilidad
const tableData = computed(() => {
    return calculateTableData(
        props.processedData, 
        props.years, 
        props.type, 
        store.isComparisonFrozen
    );
});

// Helpers de estilo
const getDiffClass = (val: number) => val < 0 ? 'text-red-500' : 'text-emerald-600';
const fmt = (val: number) => props.type === 'kilos' ? formatNumber(val) : formatCurrency(val);
</script>

<template>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
                <i class="fa-solid fa-table text-slate-400"></i> {{ title }}
            </h3>
            
            <button 
                v-if="tableData.prevYear"
                @click="store.toggleComparisonLock()"
                class="text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1"
                :class="store.isComparisonFrozen ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-orange-50 text-orange-600 border-orange-200'"
                title="Bloquear/Desbloquear comparación del mes actual"
            >
                <i class="fa-solid" :class="store.isComparisonFrozen ? 'fa-lock' : 'fa-lock-open'"></i>
                {{ store.isComparisonFrozen ? 'Mes Actual Bloqueado' : 'Comparar Mes Actual' }}
            </button>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th class="px-4 py-3">Mes</th>
                        <th v-for="y in tableData.sortedYears" :key="y" class="px-4 py-3 text-right">
                            {{ type === 'kilos' ? 'Venta KG' : (type === 'pesos' ? 'Venta $' : 'Promedio') }} {{ y }}
                        </th>
                        
                        <th v-if="type === 'kilos'" class="px-4 py-3 text-right text-purple-600">
                            Meta {{ tableData.currentYear }}
                        </th>

                        <template v-if="tableData.prevYear">
                            <th class="px-4 py-3 text-right">DIF vs {{ tableData.prevYear }}</th>
                            <th class="px-4 py-3 text-right">Crec %</th>
                            
                            <template v-if="type === 'kilos'">
                                <th class="px-4 py-3 text-right">DIF vs Meta</th>
                                <th class="px-4 py-3 text-right">Var % Meta</th>
                            </template>
                        </template>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="row in tableData.rows" :key="row.mesIndex" class="hover:bg-slate-50/50 transition-colors">
                        <td class="px-4 py-3 font-medium text-slate-700">{{ row.nombre }}</td>
                        
                        <td v-for="y in tableData.sortedYears" :key="y" class="px-4 py-3 text-right tabular-nums text-slate-600">
                            {{ fmt(row[y]) }}
                        </td>

                        <td v-if="type === 'kilos'" class="px-4 py-3 text-right tabular-nums text-purple-600 font-medium">
                            {{ fmt(row[`meta_${tableData.currentYear}`]) }}
                        </td>

                        <template v-if="tableData.prevYear">
                            <td class="px-4 py-3 text-right tabular-nums font-medium" :class="row.diff !== null ? getDiffClass(row.diff) : 'text-slate-300'">
                                {{ row.diff !== null ? fmt(row.diff) : '—' }}
                            </td>
                            <td class="px-4 py-3 text-right tabular-nums font-bold" :class="row.growth !== null ? getDiffClass(row.growth) : 'text-slate-300'">
                                {{ row.growth !== null ? row.growth.toFixed(1) + '%' : '—' }}
                            </td>

                            <template v-if="type === 'kilos'">
                                <td class="px-4 py-3 text-right tabular-nums" :class="row.diffMeta !== null ? getDiffClass(row.diffMeta) : 'text-slate-300'">
                                    {{ row.diffMeta !== null ? fmt(row.diffMeta) : '—' }}
                                </td>
                                <td class="px-4 py-3 text-right tabular-nums font-bold" :class="row.varMeta !== null ? (row.varMeta >= 100 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-300'">
                                    {{ row.varMeta !== null ? row.varMeta.toFixed(1) + '%' : '—' }}
                                </td>
                            </template>
                        </template>
                    </tr>
                </tbody>
                <tfoot class="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                    <tr>
                        <td class="px-4 py-3">TOTAL</td>
                        <td v-for="y in tableData.sortedYears" :key="y" class="px-4 py-3 text-right tabular-nums">
                            {{ fmt(tableData.footer[y]) }}
                        </td>
                        
                        <td v-if="type === 'kilos'" class="px-4 py-3 text-right tabular-nums text-purple-700">
                            {{ fmt(tableData.footer[`meta_${tableData.currentYear}`]) }}
                        </td>

                        <template v-if="tableData.prevYear">
                            <td class="px-4 py-3 text-right tabular-nums" :class="getDiffClass(tableData.footer.diff)">
                                {{ fmt(tableData.footer.diff) }}
                            </td>
                            <td class="px-4 py-3 text-right tabular-nums" :class="getDiffClass(tableData.footer.growth)">
                                {{ tableData.footer.growth.toFixed(1) }}%
                            </td>

                            <template v-if="type === 'kilos'">
                                <td class="px-4 py-3 text-right tabular-nums" :class="getDiffClass(tableData.footer.diffMeta)">
                                    {{ fmt(tableData.footer.diffMeta) }}
                                </td>
                                <td class="px-4 py-3 text-right tabular-nums" :class="tableData.footer.varMeta >= 100 ? 'text-emerald-600' : 'text-red-500'">
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