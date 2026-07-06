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
const dimensionColumns = computed(() => props.config.columns.filter(c => c !== 'TotalMetric'));
const mobilePrimaryDimension = computed(() => dimensionColumns.value[0]);

const formatVal = (val: number) => isMoney.value ? formatCurrency(val) : formatNumber(val);
const formatMobileVal = (val: number) => {
    const value = Number(val || 0);
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (isMoney.value) {
        if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
        if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
        if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
        return `${sign}$${abs.toFixed(0)}`;
    }

    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
    return `${sign}${abs.toFixed(0)}`;
};
</script>

<template>
    <div class="flex h-full flex-col overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm">
        <div class="custom-scrollbar flex-1 overflow-auto md:hidden">
            <table class="w-full table-fixed border-collapse text-left text-[10px]">
                <thead class="sticky top-0 z-10 bg-pic-nav text-[9px] font-black uppercase text-pic-nav-text">
                    <tr>
                        <th class="w-[58%] border-r border-pic-nav-muted bg-pic-nav-muted px-2 py-2.5">
                            {{ mobilePrimaryDimension || 'Concepto' }}
                        </th>
                        <th class="px-2 py-2.5 text-right">
                            {{ config.metricLabel }}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-pic-border">
                    <tr v-for="(row, idx) in config.data" :key="idx" class="odd:bg-pic-surface even:bg-pic-muted-surface/35">
                        <td class="border-r border-pic-border px-2 py-2.5 font-bold text-pic-text-main">
                            <span class="block truncate" :title="row[mobilePrimaryDimension]">{{ row[mobilePrimaryDimension] }}</span>
                        </td>
                        <td class="px-2 py-2.5 text-right font-mono font-bold tabular-nums text-pic-text-main">
                            {{ formatMobileVal(row.TotalMetric) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="custom-scrollbar hidden flex-1 overflow-auto md:block">
            <table class="w-full text-left text-xs">
                <thead class="sticky top-0 z-10 bg-pic-muted-surface font-bold uppercase text-pic-text-muted">
                    <tr>
                        <th v-for="col in dimensionColumns" :key="col" class="border-b border-pic-border px-4 py-3">
                            {{ col }}
                        </th>
                        <th class="border-b border-pic-border px-4 py-3 text-right text-pic-brand">
                            {{ config.metricLabel }}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-pic-border">
                    <tr v-for="(row, idx) in config.data" :key="idx" class="transition-colors hover:bg-pic-muted-surface">
                        <td v-for="col in dimensionColumns" :key="col" class="px-4 py-2.5 font-medium text-pic-text-muted">
                            {{ row[col] }}
                        </td>
                        <td class="px-4 py-2.5 text-right font-mono font-bold text-pic-text-main">
                            {{ formatVal(row.TotalMetric) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="border-t border-pic-border bg-pic-muted-surface px-3 py-2 text-center text-[10px] text-pic-text-muted">
            Mostrando top {{ config.data.length }} registros
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--pic-border)); border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
</style>
