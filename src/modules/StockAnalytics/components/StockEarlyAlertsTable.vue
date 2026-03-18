<!-- src/modules/StockAnalytics/components/StockEarlyAlertsTable.vue -->
<script setup lang="ts">
import { useStockAnalyticsStore } from '../stores/stockAnalyticsStore';

const store = useStockAnalyticsStore();

interface SeverityBadge { label: string; classes: string }

function severityBadge(zeroWeeks: number, activeWeeks: number): SeverityBadge {
    const ratio = activeWeeks > 0 ? zeroWeeks / activeWeeks : 0;
    if (ratio >= 0.5)  return { label: 'Crítico',  classes: 'bg-red-100 text-red-700 border border-red-200' };
    if (ratio >= 0.25) return { label: 'Alto',     classes: 'bg-amber-100 text-amber-700 border border-amber-200' };
    return                    { label: 'Moderado', classes: 'bg-yellow-50 text-yellow-700 border border-yellow-200' };
}

function pct(zero: number, active: number): string {
    return active > 0 ? `${((zero / active) * 100).toFixed(0)}%` : '0%';
}
</script>

<template>
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden shrink-0">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 class="text-sm font-semibold text-slate-700">
                <i class="fa-solid fa-triangle-exclamation mr-2 text-amber-500"></i>
                Alertas Tempranas — Top 20 Quiebres
            </h3>
            <span class="text-xs text-slate-400">{{ store.top20Stockouts.length }} registros</span>
        </div>

        <div class="overflow-auto">
            <table class="w-full text-xs border-collapse">

                <thead class="sticky top-0 z-10">
                    <tr class="bg-slate-800 text-slate-200">
                        <th class="px-4 py-2.5 text-left font-semibold w-8">#</th>
                        <th class="px-4 py-2.5 text-left font-semibold min-w-[130px]">Cliente</th>
                        <th class="px-4 py-2.5 text-left font-semibold min-w-[160px]">SKU</th>
                        <th class="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Sem. Activas</th>
                        <th class="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Sem. Sin Venta</th>
                        <th class="px-4 py-2.5 text-center font-semibold whitespace-nowrap">% Quiebre</th>
                        <th class="px-4 py-2.5 text-center font-semibold">Severidad</th>
                    </tr>
                </thead>

                <tbody>
                    <!-- Skeleton -->
                    <template v-if="store.isLoadingData">
                        <tr v-for="i in 5" :key="i" class="border-b border-slate-100">
                            <td colspan="7" class="px-4 py-3">
                                <div class="h-3 bg-slate-100 rounded animate-pulse"></div>
                            </td>
                        </tr>
                    </template>

                    <!-- Empty -->
                    <template v-else-if="!store.top20Stockouts.length">
                        <tr>
                            <td colspan="7" class="text-center py-12 text-slate-400">
                                Sin alertas en el rango seleccionado.
                            </td>
                        </tr>
                    </template>

                    <!-- Rows -->
                    <tr
                        v-else
                        v-for="(row, idx) in store.top20Stockouts"
                        :key="`${row.id_cliente}-${row.SKU_NOMBRE}`"
                        class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                    >
                        <td class="px-4 py-2.5 text-slate-400 font-medium">{{ idx + 1 }}</td>
                        <td class="px-4 py-2.5 font-medium text-slate-700 max-w-[130px] truncate whitespace-nowrap">
                            {{ row.id_cliente }}
                        </td>
                        <td class="px-4 py-2.5 text-slate-500 max-w-[160px] truncate whitespace-nowrap">
                            {{ row.SKU_NOMBRE }}
                        </td>
                        <td class="px-4 py-2.5 text-center tabular-nums text-slate-600">
                            {{ row.ActiveWeeks }}
                        </td>
                        <td class="px-4 py-2.5 text-center tabular-nums font-semibold text-rose-600">
                            {{ row.ZeroSalesWeeks }}
                        </td>
                        <td class="px-4 py-2.5 text-center tabular-nums text-slate-600">
                            {{ pct(row.ZeroSalesWeeks, row.ActiveWeeks) }}
                        </td>
                        <td class="px-4 py-2.5 text-center">
                            <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold', severityBadge(row.ZeroSalesWeeks, row.ActiveWeeks).classes]">
                                {{ severityBadge(row.ZeroSalesWeeks, row.ActiveWeeks).label }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>