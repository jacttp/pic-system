<!-- src/modules/StockAnalytics/components/StockKpiStrip.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useStockAnalyticsStore } from '../stores/stockAnalyticsStore';

const store = useStockAnalyticsStore();

const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
    : n.toFixed(1);

const coverageColor = computed(() => {
    const w = store.avgCoverageWeeks;
    if (w < 1) return { text: 'text-red-600',    bg: 'bg-red-50',    label: 'Riesgo quiebre' };
    if (w > 8) return { text: 'text-amber-600',  bg: 'bg-amber-50',  label: 'Sobrestock' };
    return           { text: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Saludable' };
});

const kpis = computed(() => [
    {
        label:     'Sellout Total',
        value:     `${fmt(store.totalSelloutKG)} KG`,
        sub:       'Volumen acumulado en rango',
        icon:      'fa-solid fa-arrow-trend-up',
        iconColor: 'text-violet-500',
        iconBg:    'bg-violet-50',
        valueColor: 'text-slate-800',
    },
    {
        label:     'Inventario Físico Actual',
        value:     `${fmt(store.totalCurrentStockKG)} KG`,
        sub:       'Stock disponible al cierre',
        icon:      'fa-solid fa-warehouse',
        iconColor: 'text-blue-500',
        iconBg:    'bg-blue-50',
        valueColor: 'text-slate-800',
    },
    {
        label:     'Cobertura Promedio',
        value:     `${store.avgCoverageWeeks.toFixed(1)} sem`,
        sub:       coverageColor.value.label,
        icon:      'fa-solid fa-shield-halved',
        iconColor: coverageColor.value.text,
        iconBg:    coverageColor.value.bg,
        valueColor: coverageColor.value.text,
    },
    {
        label:     'Oportunidad Perdida',
        value:     `${fmt(store.totalZeroSalesWeeks)} sem`,
        sub:       'Semanas con cero ventas',
        icon:      'fa-solid fa-circle-exclamation',
        iconColor: 'text-rose-500',
        iconBg:    'bg-rose-50',
        valueColor: 'text-slate-800',
    },
]);
</script>

<template>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
            v-for="kpi in kpis"
            :key="kpi.label"
            class="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex items-start gap-4"
        >
            <div :class="[kpi.iconBg, 'rounded-xl p-3 shrink-0']">
                <i :class="[kpi.icon, kpi.iconColor, 'text-lg w-5 text-center']"></i>
            </div>
            <div class="min-w-0">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate">
                    {{ kpi.label }}
                </p>
                <p :class="['text-2xl font-bold mt-0.5 tabular-nums', kpi.valueColor]">
                    {{ kpi.value }}
                </p>
                <p class="text-xs text-slate-400 mt-0.5 truncate">{{ kpi.sub }}</p>
            </div>
        </div>
    </div>
</template>