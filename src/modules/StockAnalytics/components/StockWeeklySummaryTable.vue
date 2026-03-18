<!-- src/modules/StockAnalytics/components/StockWeeklySummaryTable.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStockAnalyticsStore } from '../stores/stockAnalyticsStore';

const store = useStockAnalyticsStore();

const search       = ref('');
const expandedRows = ref<Set<string>>(new Set());

function toggleClient(id: string) {
    if (expandedRows.value.has(id)) expandedRows.value.delete(id);
    else expandedRows.value.add(id);
    expandedRows.value = new Set(expandedRows.value);
}

function isExpanded(id: string): boolean {
    return expandedRows.value.has(id);
}

const filtered = computed(() => {
    const q = search.value.toLowerCase();
    if (!q) return store.groupedSummary;
    return store.groupedSummary.filter(g =>
        g.id_cliente.toLowerCase().includes(q) ||
        g.skus.some(s => s.SKU_NOMBRE.toLowerCase().includes(q))
    );
});

function rowAvg(row: Record<string, string | number>): number {
    const weeks = store.weekColumns;
    if (!weeks.length) return 0;
    const sum = weeks.reduce((acc, w) => acc + (Number(row[String(w)]) || 0), 0);
    return sum / weeks.length;
}

function clientWeekSum(skus: typeof store.selloutSummary, week: number): number {
    return skus.reduce((acc, sku) => acc + (Number(sku[String(week)]) || 0), 0);
}

function clientAvg(skus: typeof store.selloutSummary): number {
    const weeks = store.weekColumns;
    if (!weeks.length) return 0;
    const total = skus.reduce((acc, sku) =>
        acc + weeks.reduce((s, w) => s + (Number(sku[String(w)]) || 0), 0), 0
    );
    return total / weeks.length;
}

const maxWeekValue = computed((): number => {
    let max = 0;
    for (const group of filtered.value) {
        for (const sku of group.skus) {
            for (const w of store.weekColumns) {
                const v = Number(sku[String(w)]) || 0;
                if (v > max) max = v;
            }
        }
    }
    return max || 1;
});

function heatClass(value: number): string {
    const ratio = value / maxWeekValue.value;
    if (ratio === 0)  return 'bg-white text-slate-300';
    if (ratio < 0.15) return 'bg-emerald-50 text-emerald-700';
    if (ratio < 0.35) return 'bg-emerald-100 text-emerald-800';
    if (ratio < 0.55) return 'bg-emerald-200 text-emerald-900';
    if (ratio < 0.75) return 'bg-emerald-300 text-emerald-900 font-medium';
    return                   'bg-emerald-500 text-white font-semibold';
}

function fmtWeek(v: number): string {
    if (v === 0)   return '–';
    if (v >= 1000) return `${(v / 1000).toFixed(2)}K`;
    return v.toFixed(2);
}

function fmtAvg(v: number): string {
    if (v === 0)   return '–';
    if (v >= 1000) return `${(v / 1000).toFixed(2)}K`;
    return v.toFixed(2);
}
</script>

<template>
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 class="text-sm font-semibold text-slate-700">
                <i class="fa-solid fa-table mr-2 text-violet-500"></i>
                Sábana Semanal — Sellout
                <span class="ml-2 text-xs font-normal text-slate-400">
                    Semanas {{ store.activeFilters.startWeek }}–{{ store.activeFilters.endWeek }}
                </span>
            </h3>
            <input
                v-model="search"
                placeholder="Buscar cliente / SKU..."
                class="h-8 w-56 text-xs rounded-lg border border-slate-200 bg-white px-3
                       text-slate-700 placeholder:text-slate-300
                       focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition"
            />
        </div>

        <div class="overflow-auto max-h-[520px]">
            <table class="w-full text-xs min-w-max border-collapse">

                <thead>
                    <tr class="bg-slate-800 text-slate-200">
                        <th class="sticky top-0 left-0 z-30 bg-slate-800 px-4 py-2.5 text-left font-semibold min-w-[200px] border-r border-slate-700 whitespace-nowrap">
                            Cliente / SKU
                        </th>
                        <th class="sticky top-0 left-[200px] z-30 bg-slate-800 px-4 py-2.5 text-left font-semibold min-w-[120px] border-r border-slate-700 whitespace-nowrap">
                            Formato
                        </th>
                        <th
                            v-for="w in store.weekColumns"
                            :key="w"
                            class="sticky top-0 z-20 bg-slate-800 px-3 py-2.5 text-center font-medium min-w-[72px] whitespace-nowrap border-r border-slate-700/40"
                        >
                            S{{ w }}
                        </th>
                        <th class="sticky top-0 right-0 z-30 px-4 py-2.5 text-right font-semibold min-w-[88px] bg-slate-700 whitespace-nowrap">
                            Prom.
                        </th>
                    </tr>
                </thead>

                <tbody>
                    <!-- Loading skeleton -->
                    <template v-if="store.isLoadingData">
                        <tr v-for="i in 6" :key="i" class="border-b border-slate-100">
                            <td class="sticky left-0 bg-white px-4 py-2.5 border-r border-slate-100">
                                <div class="h-3 bg-slate-100 rounded animate-pulse w-32"></div>
                            </td>
                            <td :colspan="(store.weekColumns.length || 6) + 2">
                                <div class="h-3 bg-slate-100 rounded animate-pulse mx-4"></div>
                            </td>
                        </tr>
                    </template>

                    <!-- Empty -->
                    <template v-else-if="!filtered.length">
                        <tr>
                            <td :colspan="store.weekColumns.length + 3" class="text-center py-12 text-slate-400">
                                Sin registros.
                            </td>
                        </tr>
                    </template>

                    <template v-else v-for="group in filtered" :key="group.id_cliente">

                        <!-- Fila cliente colapsable -->
                        <tr
                            class="border-b border-slate-200 bg-slate-50 hover:bg-slate-100/70 cursor-pointer transition-colors"
                            @click="toggleClient(group.id_cliente)"
                        >
                            <td class="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 border-r border-slate-200 font-semibold text-slate-800 whitespace-nowrap min-w-[200px]">
                                <div class="flex items-center gap-2">
                                    <i
                                        class="fa-solid text-slate-400 text-[10px] transition-transform duration-200"
                                        :class="isExpanded(group.id_cliente) ? 'fa-chevron-down' : 'fa-chevron-right'"
                                    ></i>
                                    {{ group.id_cliente }}
                                    <span class="text-[10px] font-normal text-slate-400 ml-1">
                                        {{ group.skus.length }} SKU{{ group.skus.length !== 1 ? 's' : '' }}
                                    </span>
                                </div>
                            </td>
                            <td class="sticky left-[200px] z-10 bg-slate-50 px-4 py-2.5 border-r border-slate-200 text-slate-500 whitespace-nowrap min-w-[120px]">
                                {{ group.skus[0]?.formatoCte ?? '—' }}
                            </td>
                            <td
                                v-for="w in store.weekColumns"
                                :key="w"
                                class="px-3 py-2.5 text-center tabular-nums border-r border-slate-200/60"
                                :class="clientWeekSum(group.skus, w) === 0 ? 'text-slate-300' : 'text-slate-600'"
                            >
                                {{ clientWeekSum(group.skus, w) === 0 ? '—' : fmtWeek(clientWeekSum(group.skus, w)) }}
                            </td>
                            <td class="px-4 py-2.5 text-right tabular-nums font-bold text-slate-700 bg-slate-100/80">
                                {{ fmtAvg(clientAvg(group.skus)) }}
                            </td>
                        </tr>

                        <!-- Filas SKU hijas -->
                        <template v-if="isExpanded(group.id_cliente)">
                            <tr
                                v-for="sku in group.skus"
                                :key="`${group.id_cliente}-${sku.SKU_NOMBRE}`"
                                class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                            >
                                <td class="sticky left-0 z-10 bg-white px-4 py-2 border-r border-slate-100 text-slate-500 pl-9 whitespace-nowrap min-w-[200px] max-w-[200px] truncate">
                                    {{ sku.SKU_NOMBRE }}
                                </td>
                                <td class="sticky left-[200px] z-10 bg-white px-4 py-2 border-r border-slate-100 text-slate-400 whitespace-nowrap min-w-[120px]">
                                    {{ sku.formatoCte ?? '—' }}
                                </td>
                                <td
                                    v-for="w in store.weekColumns"
                                    :key="w"
                                    :class="['px-3 py-2 text-center tabular-nums transition-colors border-r border-slate-100/60',
                                             heatClass(Number(sku[String(w)]) || 0)]"
                                >
                                    {{ fmtWeek(Number(sku[String(w)]) || 0) }}
                                </td>
                                <td class="px-4 py-2 text-right tabular-nums font-semibold text-slate-600 bg-slate-50/50">
                                    {{ fmtAvg(rowAvg(sku)) }}
                                </td>
                            </tr>
                        </template>

                    </template>
                </tbody>
            </table>
        </div>

        <!-- Footer -->
        <div class="px-5 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span class="text-[11px] text-slate-400">
                {{ filtered.length }} clientes
            </span>
            <span class="text-[11px] text-slate-400">
                Heatmap relativo al máximo del rango visible
            </span>
        </div>
    </div>
</template>