<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePicFilterStore } from '../../stores/picFilterStore';
import { usePicChatStore } from '../../stores/picChatStore';
import { calculateTableData, formatCurrency, formatNumber } from '../../utils/picUtils';

const props = defineProps<{
    title: string;
    type: 'pesos' | 'kilos' | 'promedio';
    processedData: any[]; 
    years: string[];
}>();

const store = usePicFilterStore();
const chatStore = usePicChatStore();
const tableSearch = ref('');
const mobileShowAllColumns = ref(false);

const tableData = computed(() => {
    return calculateTableData(
        props.processedData, 
        props.years, 
        props.type, 
        store.isComparisonFrozen
    );
});

// --- FILTRO DE MESES FUTUROS ---
const visibleRows = computed(() => {
    const query = tableSearch.value.trim().toLowerCase();
    const rows = rangedRows.value;
    if (!query) return rows;

    return rows.filter((row: any) =>
        String(row.nombre || '').toLowerCase().includes(query)
    );
});

const rangedRows = computed(() => {
    if (!store.selected.usarRangoMeses) {
        return tableData.value.rows;
    }

    const start = Math.max(1, parseInt(store.selected.MesInicial));
    let end = parseInt(store.selected.MesFinal);

    if (start > end) return tableData.value.rows;

    return tableData.value.rows.filter((row: any) => row.mesIndex >= start && row.mesIndex <= end);
});

// --- FOOTER RECALCULADO SOBRE FILAS VISIBLES ---
const visibleFooter = computed(() => {
    const rows = visibleRows.value;
    const { sortedYears, currentYear, prevYear } = tableData.value;

    // Sumar columnas de años y metas solo sobre filas visibles
    const totals: Record<string, number> = {};
    sortedYears.forEach(y => { totals[y] = 0; });
    if (props.type === 'kilos' && currentYear) totals[`meta_${currentYear}`] = 0;

    rows.forEach(row => {
        sortedYears.forEach(y => { totals[y] += (row[y] || 0); });
        if (props.type === 'kilos' && currentYear) totals[`meta_${currentYear}`] += (row[`meta_${currentYear}`] || 0);
    });

    // Para promedio: promediar en lugar de sumar
    if (props.type === 'promedio') {
        sortedYears.forEach(y => {
            const count = rows.filter(r => (r[y] || 0) > 0).length;
            totals[y] = count > 0 ? (totals[y] || 0) / count : 0;
        });
    }

    const footer: any = { ...totals };

    if (prevYear && currentYear) {
        const totalCurr = footer[currentYear] || 0;
        const totalPrev = footer[prevYear] || 0;
        footer.diff = totalCurr - totalPrev;
        footer.growth = totalPrev !== 0 ? (footer.diff / totalPrev) * 100 : 0;

        if (props.type === 'kilos') {
            const totalMeta = footer[`meta_${currentYear}`] || 0;
            footer.diffMeta = totalCurr - totalMeta;
            footer.varMeta = totalMeta !== 0 ? (totalCurr / totalMeta) * 100 : 0;
        }
    }

    return footer;
});

const getDiffClass = (val: number) => val < 0 ? 'text-pic-danger' : 'text-pic-success';
const fmt = (val: number) => props.type === 'kilos' ? formatNumber(val) : formatCurrency(val);
const mobileFmt = (val: number) => {
    const value = Number(val || 0);

    if (props.type === 'pesos') {
        const abs = Math.abs(value);
        const sign = value < 0 ? '-' : '';
        if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
        if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
        if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
        return `${sign}$${abs.toFixed(0)}`;
    }

    if (props.type === 'kilos') {
        const abs = Math.abs(value);
        const sign = value < 0 ? '-' : '';
        if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
        if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
        return `${sign}${abs.toFixed(0)}`;
    }

    return formatCurrency(value).replace('$', '');
};

const currentLabel = computed(() => tableData.value.currentYear || props.years[props.years.length - 1] || '');
const prevLabel = computed(() => tableData.value.prevYear || '');
const primaryMetricLabel = computed(() => {
    if (props.type === 'kilos') return 'Volumen';
    if (props.type === 'promedio') return 'Precio prom.';
    return 'Facturacion';
});

const summaryItems = computed(() => {
    const current = currentLabel.value;
    const prev = prevLabel.value;
    const items = [
        {
            label: `${primaryMetricLabel.value} ${current}`,
            value: current ? mobileFmt(visibleFooter.value[current] || 0) : '-',
            tone: 'main'
        }
    ];

    if (props.type === 'kilos' && current) {
        items.push({
            label: `Meta ${current}`,
            value: mobileFmt(visibleFooter.value[`meta_${current}`] || 0),
            tone: 'accent'
        });
    }

    if (prev) {
        items.push({
            label: `Dif vs ${prev}`,
            value: mobileFmt(visibleFooter.value.diff || 0),
            tone: (visibleFooter.value.diff || 0) < 0 ? 'danger' : 'success'
        });
        items.push({
            label: 'Crecimiento',
            value: `${(visibleFooter.value.growth || 0).toFixed(1)}%`,
            tone: (visibleFooter.value.growth || 0) < 0 ? 'danger' : 'success'
        });
    }

    return items;
});

const mobileSummaryItems = computed(() => {
    const current = currentLabel.value;
    const prev = prevLabel.value;
    const monthsLabel = visibleRows.value.length === 1 ? '1 mes' : `${visibleRows.value.length} meses`;
    const items = [
        {
            label: `${primaryMetricLabel.value} ${current}`,
            value: current ? fmt(visibleFooter.value[current] || 0) : '-',
            tone: 'main'
        }
    ];

    if (props.type === 'kilos' && current) {
        items.push({
            label: `Meta ${current}`,
            value: fmt(visibleFooter.value[`meta_${current}`] || 0),
            tone: 'accent'
        });
    }

    if (prev) {
        items.push({
            label: `Dif vs ${prev}`,
            value: fmt(visibleFooter.value.diff || 0),
            tone: (visibleFooter.value.diff || 0) < 0 ? 'danger' : 'success'
        });
        items.push({
            label: 'Crecimiento',
            value: `${(visibleFooter.value.growth || 0).toFixed(1)}%`,
            tone: (visibleFooter.value.growth || 0) < 0 ? 'danger' : 'success'
        });
    }

    if (props.type === 'kilos' && current) {
        items.push({
            label: 'Var % meta',
            value: `${(visibleFooter.value.varMeta || 0).toFixed(1)}%`,
            tone: (visibleFooter.value.varMeta || 0) >= 100 ? 'success' : 'danger'
        });
    }

    items.push({
        label: 'Periodo',
        value: monthsLabel,
        tone: 'main'
    });

    return items.slice(0, 6);
});

const visibleMobileRows = computed(() => visibleRows.value);

const mobilePrimaryYear = computed(() => tableData.value.currentYear || tableData.value.sortedYears[tableData.value.sortedYears.length - 1]);
const showMobileYearColumn = (year: string) => {
    if (mobileShowAllColumns.value) return true;
    if (props.type === 'kilos') return year === mobilePrimaryYear.value;
    return true;
};
const showMobileMetaDiffColumns = computed(() => props.type === 'kilos' && mobileShowAllColumns.value);

// ACCIÓN: Enviar datos de la tabla al chat
const handleAnalyze = () => {
    const contextData = {
        rows: visibleRows.value,
        totals: visibleFooter.value,
        years: tableData.value.sortedYears
    };
    chatStore.setContext(props.title, contextData, 'table');
};
</script>

<template>
    <div class="pic-report-table group flex flex-col overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm transition-shadow hover:shadow-md">
        
        <div class="flex items-center justify-between border-b border-pic-border bg-pic-muted-surface/50 p-4">
            <h3 class="flex items-center gap-2 text-sm font-bold text-pic-text-main">
                <i class="fa-solid fa-table text-pic-text-muted"></i> {{ title }}
            </h3>
            
            <div class="flex items-center gap-3">
                <button 
                    @click="handleAnalyze"
                    class="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-pic-text-muted transition-colors hover:bg-pic-brand-soft hover:text-pic-brand"
                    title="Analizar esta tabla con IA"
                >
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Analizar
                </button>

                <button 
                    v-if="tableData.prevYear"
                    @click="store.toggleComparisonLock()"
                    class="text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1"
                    :class="store.isComparisonFrozen ? 'border-pic-border bg-pic-muted-surface text-pic-text-muted' : 'border-pic-warning/30 bg-pic-warning/10 text-pic-warning'"
                    title="Bloquear/Desbloquear comparación del mes actual"
                >
                    <i class="fa-solid" :class="store.isComparisonFrozen ? 'fa-lock' : 'fa-lock-open'"></i>
                    <span class="hidden sm:inline">{{ store.isComparisonFrozen ? 'Mes Actual Bloqueado' : 'Comparar Mes Actual' }}</span>
                </button>
            </div>
        </div>

        <div class="hidden border-b border-pic-border bg-pic-surface px-4 py-3 md:block">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                    <span
                        v-for="item in summaryItems"
                        :key="item.label"
                        class="rounded-lg border px-2.5 py-1.5 text-xs"
                        :class="{
                            'border-pic-border bg-pic-muted-surface text-pic-text-main': item.tone === 'main',
                            'border-pic-success/25 bg-pic-success/10 text-pic-success': item.tone === 'success',
                            'border-pic-danger/25 bg-pic-danger/10 text-pic-danger': item.tone === 'danger',
                            'border-pic-accent-purple/25 bg-pic-accent-purple-soft text-pic-accent-purple': item.tone === 'accent'
                        }"
                    >
                        <span class="mr-1 text-pic-text-muted">{{ item.label }}</span>
                        <span class="font-bold tabular-nums">{{ item.value }}</span>
                    </span>
                    <span class="rounded-lg border border-pic-border bg-pic-muted-surface px-2.5 py-1.5 text-xs font-medium text-pic-text-muted">
                        {{ visibleRows.length }} meses
                    </span>
                </div>

                <label class="relative w-full max-w-xs">
                    <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i>
                    <input
                        v-model="tableSearch"
                        type="search"
                        class="h-9 w-full rounded-lg border border-pic-border bg-pic-muted-surface pl-8 pr-3 text-xs font-medium text-pic-text-main outline-none transition focus:border-pic-brand focus:bg-pic-surface focus:ring-2 focus:ring-pic-brand-soft"
                        placeholder="Buscar mes..."
                    />
                </label>
            </div>
        </div>

        <div class="space-y-2.5 border-b border-pic-border bg-pic-surface p-2.5 md:hidden">
            <div class="grid grid-cols-2 gap-2">
                <div
                    v-for="item in mobileSummaryItems"
                    :key="item.label"
                    class="min-h-[56px] rounded-lg border px-2.5 py-1.5 text-center shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                    :class="{
                        'border-pic-border bg-pic-muted-surface/55 text-pic-text-main': item.tone === 'main',
                        'border-pic-success/20 bg-pic-success/10 text-pic-success': item.tone === 'success',
                        'border-pic-danger/20 bg-pic-danger/10 text-pic-danger': item.tone === 'danger',
                        'border-pic-accent-purple/20 bg-pic-accent-purple-soft text-pic-accent-purple': item.tone === 'accent'
                    }"
                >
                    <p class="text-[10px] font-semibold leading-tight text-pic-text-muted">{{ item.label }}</p>
                    <p class="mt-1 break-words font-mono text-[12px] font-extrabold leading-tight tabular-nums">{{ item.value }}</p>
                </div>
            </div>

            <div class="flex items-center gap-2" v-if="type === 'kilos' && mobileShowAllColumns">
                <label class="relative min-w-0 flex-1">
                    <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pic-text-muted"></i>
                    <input
                        v-model="tableSearch"
                        type="search"
                        class="h-9 w-full rounded-lg border border-pic-border bg-pic-surface pl-8 pr-3 text-xs text-pic-text-main outline-none transition focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-soft"
                        placeholder="Buscar en esta vista..."
                    />
                </label>
                <button
                    type="button"
                    class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-pic-border bg-pic-muted-surface text-pic-text-muted transition hover:border-pic-brand/40 hover:text-pic-brand"
                    title="Alternar columnas visibles"
                    @click="mobileShowAllColumns = !mobileShowAllColumns"
                >
                    <i class="fa-solid" :class="mobileShowAllColumns ? 'fa-compress' : 'fa-table-columns'"></i>
                </button>
            </div>

            <div class="overflow-hidden rounded-lg border border-pic-border bg-pic-surface shadow-sm">
                <div class="overflow-x-auto custom-scrollbar" :class="mobileShowAllColumns ? '' : 'overflow-x-hidden'">
                    <table class="w-full table-fixed border-collapse text-left text-[10px]" :class="mobileShowAllColumns ? 'min-w-[760px]' : ''">
                        <thead class="bg-pic-nav text-[9px] font-black uppercase tracking-normal text-pic-nav-text">
                            <tr>
                                <th class="sticky left-0 z-20 w-[112px] border-r border-pic-nav-muted bg-pic-nav-muted px-2 py-2.5 shadow-[4px_0_10px_rgba(15,23,42,0.14)]">Mes</th>
                                <th
                                    v-for="y in tableData.sortedYears"
                                    v-show="showMobileYearColumn(y)"
                                    :key="y"
                                    class="px-1.5 py-2.5 text-right"
                                    :class="y === mobilePrimaryYear ? 'text-pic-nav-text' : 'text-pic-nav-text-muted'"
                                >
                                    {{ type === 'kilos' ? 'Vol.' : (type === 'pesos' ? '' : 'Prom.') }} {{ y }}
                                </th>

                                <th v-if="type === 'kilos'" class="px-1.5 py-2.5 text-right text-pic-accent-purple">
                                    Meta
                                </th>

                                <template v-if="tableData.prevYear">
                                    <th class="px-1.5 py-2.5 text-right text-pic-nav-text-muted">Dif vs {{ tableData.prevYear }}</th>
                                    <th class="px-1.5 py-2.5 text-right text-pic-nav-text-muted">{{ type === 'kilos' ? 'Var % meta' : 'Crec %' }}</th>

                                    <template v-if="showMobileMetaDiffColumns">
                                        <th class="px-1.5 py-2.5 text-right text-pic-nav-text-muted">Dif meta</th>
                                    </template>
                                </template>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-pic-border">
                            <tr
                                v-for="row in visibleMobileRows"
                                :key="row.mesIndex"
                                class="odd:bg-pic-surface even:bg-pic-muted-surface/35"
                            >
                                <td class="sticky left-0 z-10 border-r border-pic-border bg-pic-surface px-2 py-2.5 font-bold leading-tight text-pic-text-main shadow-[4px_0_10px_rgba(15,23,42,0.08)]">
                                    {{ row.nombre }}
                                </td>

                                <td
                                    v-for="y in tableData.sortedYears"
                                    v-show="showMobileYearColumn(y)"
                                    :key="y"
                                    class="px-1.5 py-2.5 text-right font-mono font-semibold tabular-nums"
                                    :class="y === mobilePrimaryYear ? 'text-pic-text-main' : 'text-pic-text-muted'"
                                >
                                    {{ mobileFmt(row[y]) }}
                                </td>

                                <td v-if="type === 'kilos'" class="px-1.5 py-2.5 text-right font-mono font-bold tabular-nums text-pic-accent-purple">
                                    {{ mobileFmt(row[`meta_${tableData.currentYear}`]) }}
                                </td>

                                <template v-if="tableData.prevYear">
                                    <td class="px-1.5 py-2.5 text-right font-mono font-bold tabular-nums" :class="row.diff !== null ? getDiffClass(row.diff) : 'text-pic-text-muted/60'">
                                        {{ row.diff !== null ? mobileFmt(row.diff) : '-' }}
                                    </td>
                                    <td class="px-1.5 py-2.5 text-right font-mono font-bold tabular-nums" :class="type === 'kilos' ? (row.varMeta !== null ? (row.varMeta >= 100 ? 'text-pic-success' : 'text-pic-danger') : 'text-pic-text-muted/60') : (row.growth !== null ? getDiffClass(row.growth) : 'text-pic-text-muted/60')">
                                        {{ type === 'kilos' ? (row.varMeta !== null ? row.varMeta.toFixed(1) + '%' : '-') : (row.growth !== null ? row.growth.toFixed(1) + '%' : '-') }}
                                    </td>

                                    <template v-if="showMobileMetaDiffColumns">
                                        <td class="px-1.5 py-2.5 text-right font-mono font-bold tabular-nums" :class="row.diffMeta !== null ? getDiffClass(row.diffMeta) : 'text-pic-text-muted/60'">
                                            {{ row.diffMeta !== null ? mobileFmt(row.diffMeta) : '-' }}
                                        </td>
                                    </template>
                                </template>
                            </tr>
                        </tbody>
                        <tfoot class="border-t border-pic-border bg-pic-muted-surface font-bold text-pic-text-main">
                            <tr>
                                <td class="sticky left-0 z-10 border-r border-pic-border bg-pic-muted-surface px-2 py-2.5 shadow-[4px_0_10px_rgba(15,23,42,0.08)]">TOTAL</td>

                                <td
                                    v-for="y in tableData.sortedYears"
                                    v-show="showMobileYearColumn(y)"
                                    :key="y"
                                    class="px-1.5 py-2.5 text-right font-mono tabular-nums"
                                    :class="y === mobilePrimaryYear ? 'text-pic-text-main' : 'text-pic-text-muted'"
                                >
                                    {{ mobileFmt(visibleFooter[y] || 0) }}
                                </td>

                                <td v-if="type === 'kilos'" class="px-1.5 py-2.5 text-right font-mono tabular-nums text-pic-accent-purple">
                                    {{ mobileFmt(visibleFooter[`meta_${tableData.currentYear}`] || 0) }}
                                </td>

                                <template v-if="tableData.prevYear">
                                    <td class="px-1.5 py-2.5 text-right font-mono tabular-nums" :class="getDiffClass(visibleFooter.diff || 0)">
                                        {{ mobileFmt(visibleFooter.diff || 0) }}
                                    </td>
                                    <td class="px-1.5 py-2.5 text-right font-mono tabular-nums" :class="type === 'kilos' ? ((visibleFooter.varMeta || 0) >= 100 ? 'text-pic-success' : 'text-pic-danger') : getDiffClass(visibleFooter.growth || 0)">
                                        {{ type === 'kilos' ? (visibleFooter.varMeta || 0).toFixed(1) + '%' : (visibleFooter.growth || 0).toFixed(1) + '%' }}
                                    </td>

                                    <template v-if="showMobileMetaDiffColumns">
                                        <td class="px-1.5 py-2.5 text-right font-mono tabular-nums" :class="getDiffClass(visibleFooter.diffMeta || 0)">
                                            {{ mobileFmt(visibleFooter.diffMeta || 0) }}
                                        </td>
                                    </template>
                                </template>
                            </tr>
                        </tfoot>
                    </table>
                    <div v-if="!visibleMobileRows.length" class="px-4 py-6 text-center text-sm text-pic-text-muted">
                        No hay meses que coincidan con la busqueda.
                    </div>
                </div>

                <button
                    v-if="type === 'kilos'"
                    type="button"
                    class="flex h-11 w-full items-center justify-center gap-2 border-t border-pic-border bg-pic-muted-surface text-xs font-bold text-pic-text-muted transition hover:text-pic-brand"
                    @click="mobileShowAllColumns = !mobileShowAllColumns"
                >
                    <span>{{ mobileShowAllColumns ? 'Ver columnas principales' : 'Ver todas las columnas' }}</span>
                    <i class="fa-solid" :class="mobileShowAllColumns ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
            </div>
        </div>

        <div class="pic-report-table-scroll hidden overflow-x-auto custom-scrollbar md:block">
            <table class="w-full min-w-[860px] border-collapse text-left text-xs lg:text-sm">
                <thead class="sticky top-0 z-10 bg-pic-nav text-xs font-semibold uppercase text-pic-nav-text shadow-sm">
                    <tr>
                        <th class="sticky left-0 z-20 border-r border-pic-nav-muted bg-pic-nav-muted px-4 py-3 shadow-[4px_0_10px_rgba(15,23,42,0.14)]">Mes</th>
                        <th v-for="y in tableData.sortedYears" :key="y" class="px-4 py-3 text-right font-medium">
                            {{ type === 'kilos' ? 'Venta KG' : (type === 'pesos' ? 'Venta $' : 'Promedio') }} {{ y }}
                        </th>
                        
                        <th v-if="type === 'kilos'" class="bg-pic-nav-muted px-4 py-3 text-right text-pic-accent-purple">
                            Meta {{ tableData.currentYear }}
                        </th>

                        <template v-if="tableData.prevYear">
                            <th class="px-4 py-3 text-right font-medium text-pic-nav-text-muted">DIF vs {{ tableData.prevYear }}</th>
                            <th class="px-4 py-3 text-right font-medium text-pic-nav-text-muted">Crec %</th>
                            
                            <template v-if="type === 'kilos'">
                                <th class="px-4 py-3 text-right font-medium text-pic-nav-text-muted">DIF vs Meta</th>
                                <th class="px-4 py-3 text-right font-medium text-pic-nav-text-muted">Var % Meta</th>
                            </template>
                        </template>
                    </tr>
                </thead>
               <tbody class="divide-y divide-pic-border">
               <tr v-for="row in visibleRows" :key="row.mesIndex" class="transition-colors odd:bg-pic-surface even:bg-pic-muted-surface/35 hover:bg-pic-brand-soft/60">
                        <td class="sticky left-0 border-r border-pic-border bg-pic-surface px-4 py-3 font-medium text-pic-text-main shadow-[4px_0_10px_rgba(15,23,42,0.06)]">{{ row.nombre }}</td>
                        
                        <td v-for="y in tableData.sortedYears" :key="y" class="px-4 py-3 text-right font-mono tabular-nums text-pic-text-muted">
                            {{ fmt(row[y]) }}
                        </td>

                        <td v-if="type === 'kilos'" class="px-4 py-3 text-right font-mono font-medium tabular-nums text-pic-accent-purple">
                            {{ fmt(row[`meta_${tableData.currentYear}`]) }}
                        </td>

                        <template v-if="tableData.prevYear">
                            <td class="px-4 py-3 text-right font-mono font-medium tabular-nums" :class="row.diff !== null ? getDiffClass(row.diff) : 'text-pic-text-muted/60'">
                                {{ row.diff !== null ? fmt(row.diff) : '—' }}
                            </td>
                            <td class="px-4 py-3 text-right font-mono font-bold tabular-nums" :class="row.growth !== null ? getDiffClass(row.growth) : 'text-pic-text-muted/60'">
                                {{ row.growth !== null ? row.growth.toFixed(1) + '%' : '—' }}
                            </td>

                            <template v-if="type === 'kilos'">
                                <td class="px-4 py-3 text-right font-mono tabular-nums" :class="row.diffMeta !== null ? getDiffClass(row.diffMeta) : 'text-pic-text-muted/60'">
                                    {{ row.diffMeta !== null ? fmt(row.diffMeta) : '—' }}
                                </td>
                                <td class="px-4 py-3 text-right font-mono font-bold tabular-nums" :class="row.varMeta !== null ? (row.varMeta >= 100 ? 'text-pic-success' : 'text-pic-danger') : 'text-pic-text-muted/60'">
                                    {{ row.varMeta !== null ? row.varMeta.toFixed(1) + '%' : '—' }}
                                </td>
                            </template>
                        </template>
                    </tr>
                </tbody>
                <tfoot class="border-t border-pic-border bg-pic-muted-surface font-bold text-pic-text-main">
                    <tr>
                        <td class="sticky left-0 border-r border-pic-border bg-pic-muted-surface px-4 py-3 shadow-[4px_0_10px_rgba(15,23,42,0.06)]">TOTAL</td>
                        
                        <td v-for="y in tableData.sortedYears" :key="y" class="px-4 py-3 text-right tabular-nums font-mono">
                            {{ fmt(visibleFooter[y] || 0) }}
                        </td>
                        
                        <td v-if="type === 'kilos'" class="px-4 py-3 text-right font-mono tabular-nums text-pic-accent-purple">
                            {{ fmt(visibleFooter[`meta_${tableData.currentYear}`] || 0) }}
                        </td>

                        <template v-if="tableData.prevYear">
                            <td class="px-4 py-3 text-right tabular-nums font-mono" :class="getDiffClass(visibleFooter.diff || 0)">
                                {{ fmt(visibleFooter.diff || 0) }}
                            </td>
                            <td class="px-4 py-3 text-right tabular-nums font-mono" :class="getDiffClass(visibleFooter.growth || 0)">
                                {{ (visibleFooter.growth || 0).toFixed(1) }}%
                            </td>

                            <template v-if="type === 'kilos'">
                                <td class="px-4 py-3 text-right tabular-nums font-mono" :class="getDiffClass(visibleFooter.diffMeta || 0)">
                                    {{ fmt(visibleFooter.diffMeta || 0) }}
                                </td>
                                <td class="px-4 py-3 text-right font-mono tabular-nums" :class="(visibleFooter.varMeta || 0) >= 100 ? 'text-pic-success' : 'text-pic-danger'">
                                    {{ (visibleFooter.varMeta || 0).toFixed(1) }}%
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
.custom-scrollbar::-webkit-scrollbar-track { background: hsl(var(--pic-muted-surface)); }
.custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--pic-border)); border-radius: 4px; }
</style>
