<script setup lang="ts">
import { computed } from 'vue';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const props = defineProps<{
    config: {
        columns: string[]; // ['Gerencia', 'Zona', 'TotalMetric']
        data: any[];
        metricLabel: string; // 'Venta ($)'
    };
}>();

// Detectar si la métrica es dinero para formatear
const isMoney = computed(() => props.config.metricLabel.includes('$'));

const formatVal = (val: number) => isMoney.value ? formatCurrency(val) : formatNumber(val);
</script>

<template>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
        <div class="overflow-auto custom-scrollbar flex-1">
            <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-500 font-bold uppercase sticky top-0 z-10">
                    <tr>
                        <th v-for="col in config.columns.filter(c => c !== 'TotalMetric')" :key="col" class="px-4 py-3 border-b border-slate-200">
                            {{ col }}
                        </th>
                        <th class="px-4 py-3 text-right border-b border-slate-200 text-brand-600">
                            {{ config.metricLabel }}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="(row, idx) in config.data" :key="idx" class="hover:bg-slate-50 transition-colors">
                        <td v-for="col in config.columns.filter(c => c !== 'TotalMetric')" :key="col" class="px-4 py-2.5 text-slate-600 font-medium">
                            {{ row[col] }}
                        </td>
                        <td class="px-4 py-2.5 text-right font-mono font-bold text-slate-700">
                            {{ formatVal(row.TotalMetric) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="bg-slate-50 px-3 py-2 text-[10px] text-slate-400 text-center border-t border-slate-100">
            Mostrando top {{ config.data.length }} registros
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
</style>