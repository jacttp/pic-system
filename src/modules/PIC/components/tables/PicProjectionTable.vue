<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { usePicFilterStore } from '../../stores/picFilterStore';
import { picApi } from '../../services/picApi'; 
import { formatNumber } from '../../utils/formatters';
import type { PicPdfExportConfig, PicPrintBlockKey } from '../../types/picTypes';

const props = defineProps<{
    title: string;
    dimensionKey: string; // La dimensión de ESTA tabla (ej: 'familias')
    initialCollapsed?: boolean;
    isPrintMode?: boolean;
    printConfig?: PicPdfExportConfig | null;
    printBlockId?: PicPrintBlockKey;
    // Si no se pasa esta prop, la tabla no será interactiva (caso Marcas/Gerencia)
    drillDownTarget?: string; 
}>();

const emit = defineEmits<{
    (e: 'update-block-spacing', blockId: PicPrintBlockKey, delta: number): void;
    (e: 'toggle-page-break', blockId: PicPrintBlockKey): void;
    (e: 'reset-block-spacing', blockId: PicPrintBlockKey): void;
}>();

const store = usePicFilterStore();
const isCollapsed = ref(props.initialCollapsed || false);
const projectionSearch = ref('');
const mobileShowAllColumns = ref(false);

// --- ESTADO LOCAL PARA EL DRILL-DOWN ---
// Guardamos los datos de las filas hijas aquí: { "NombreFilaPadre": [datosHijos...] }
const expandedRows = ref<Record<string, any[]>>({});
const loadingRows = ref<Record<string, boolean>>({});

// ⚠️ INVALIDACIÓN DE CACHÉ: Cada vez que cambia cualquier filtro del store,
// limpiamos las filas expandidas para forzar un re-fetch con los filtros nuevos.
watch(
    () => JSON.stringify(store.selected),
    () => {
        expandedRows.value = {};
    }
);

// Acceso al store para datos principales
const tableData = computed(() => store.projectionData[props.dimensionKey as keyof typeof store.projectionData] || []);
const isLoading = computed(() => store.loadingProjections[props.dimensionKey] || false);

// Años (Sincronizados con el store)
const years = computed(() => {
    if (store.selected.Anio.length > 0) return [...store.selected.Anio].sort();
    if (store.options.anios.length > 0) return [...store.options.anios].slice(-3).sort();
    
    const currentYearNum = new Date().getFullYear();
    return [(currentYearNum - 2).toString(), (currentYearNum - 1).toString(), currentYearNum.toString()];
});
const currentYear = computed(() => years.value[years.value.length - 1]);
const prevYear = computed(() => years.value.length > 1 ? years.value[years.value.length - 2] : null);

// --- LÓGICA DE CARGA PRINCIPAL ---
const handleLoad = () => {
    isCollapsed.value = false;
    store.fetchSingleProjection(props.dimensionKey);
};

// --- LÓGICA MATEMÁTICA (Factorizada para reusar en Padre e Hijos) ---
// Esta función calcula crecimientos y diferencias para cualquier array de datos
const processData = (data: any[], totalMarketSize: number) => {
    if (!data || data.length === 0) return [];
    const yCurr = currentYear.value;
    const yPrev = prevYear.value;

    return data.map(row => {
        const valCurr = row[`Venta_${yCurr}`] || 0;
        const valPrev = yPrev ? (row[`Venta_${yPrev}`] || 0) : 0;
        const meta = row[`Meta_${yCurr}`] || 0;
        const difAnual = valCurr - valPrev;
        const difMeta = valCurr - meta;
        
        const crec = valPrev !== 0 ? (difAnual / valPrev) * 100 : 0;
        const varMeta = meta !== 0 ? (valCurr / meta) * 100 : 0;
        
        // La participación siempre es relativa al total que le pasemos
        const share = totalMarketSize !== 0 ? (valCurr / totalMarketSize) * 100 : 0;

        return { ...row, valCurr, valPrev, meta, difAnual, difMeta, crec, varMeta, share };
    });
};

// Procesar filas PADRE (La tabla principal)
const processedRows = computed(() => {
    const yCurr = currentYear.value;
    // El 100% es la suma de toda la tabla actual
    const total = tableData.value.reduce((s, r) => s + (r[`Venta_${yCurr}`] || 0), 0);
    return processData(tableData.value, total);
});

// --- NUEVO: LÓGICA DE CLIC EN FILA (DRILL-DOWN) ---
const toggleRow = async (row: any) => {
    // Si no se configuró un objetivo de drilldown, no hacemos nada (ej: Marcas)
    if (!props.drillDownTarget) return;

    const rowId = row.Dimension; // Ej: "ZF-Jamon Pierna"

    // 1. Si ya está abierto, lo cerramos (borramos del estado local)
    if (expandedRows.value[rowId]) {
        delete expandedRows.value[rowId];
        return;
    }

    // 2. Si no, cargamos los datos
    loadingRows.value[rowId] = true;
    try {
        // Construir filtros completos (idénticos a fetchSingleProjection del store)
        // para respetar TODOS los filtros activos: meses, marcas, transacciones, etc.
        // DEBUG: Confirmar valores de mes actuales
        console.log(`[DrillDown] MesInicial=${store.selected.MesInicial} MesFinal=${store.selected.MesFinal}`);
        const mappings: Record<string, string> = {
            'Transaccion': 'TRANSACCION',
            'FormatoCliente': 'formatocte',
            'grupo': 'grupo',
            'Categorias': 'Categorias',
            'SKU': 'SKU_NOMBRE'
        };

        const activeFilters: Record<string, any> = {};

        for (const key in store.selected) {
            const val = store.selected[key as keyof typeof store.selected];
            if (Array.isArray(val) && val.length > 0) {
                const dbKey = mappings[key] || key;
                if (key !== 'MesInicial' && key !== 'MesFinal' && key !== 'Anio') {
                    activeFilters[dbKey] = val;
                }
            }
        }

        // Agregar rango de meses (CRÍTICO: esto faltaba antes)
        activeFilters['MesInicial'] = store.selected.MesInicial;
        activeFilters['MesFinal'] = store.selected.MesFinal;

        // Agregar clientes seleccionados si aplica
        if (store.selectedClients.size > 0) {
            activeFilters['IDCLIENTE'] = Array.from(store.selectedClients.keys());
        }

        // Mapeamos: Si estoy en la tabla 'familias', el filtro de BD es 'grupo'
        const dimensionToFilterMap: Record<string, string> = {
            'familias': 'grupo',
            'zona': 'Zona',
            'canal': 'canal',
            'clientes': 'NOM_CLIENTE',
            'gerencia': 'Gerencia'
        };
        
        const filterKey = dimensionToFilterMap[props.dimensionKey] || props.dimensionKey;
        
        // AGREGAMOS EL FILTRO: "Traeme los artículos DONDE grupo = 'ZF-Jamon Pierna'"
        activeFilters[filterKey] = [row.Dimension]; 

        // DEBUG: Ver payload completo que va al backend
        console.log(`[DrillDown] Payload enviado a /projections:`, JSON.stringify({ dimension: props.drillDownTarget, filters: activeFilters, years: years.value }, null, 2));

        // Llamamos a la API directamente (sin pasar por el store global para no sobrescribir nada)
        const childData = await picApi.getProjection(props.drillDownTarget, activeFilters, years.value);
        
        expandedRows.value[rowId] = childData;

    } catch (e) {
        console.error("Error cargando detalle:", e);
    } finally {
        loadingRows.value[rowId] = false;
    }
};

// Helper para procesar las filas HIJAS (cuando se renderizan)
const getChildRows = (parentId: string) => {
    const data = expandedRows.value[parentId];
    if (!data) return [];
    
    // Para las hijas, el 100% de participación es con respecto a SU PADRE
    const parentRow = processedRows.value.find(p => p.Dimension === parentId);
    const parentTotal = parentRow ? parentRow.valCurr : 1; 

    return processData(data, parentTotal);
};

// Footer (Cálculo de totales generales)
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

const blockSpacingValue = computed(() => {
    if (!props.printBlockId) return 0;
    return Number(props.printConfig?.blockSpacing?.[props.printBlockId] || 0);
});

const blockStyle = computed(() => props.printConfig && props.printBlockId ? { marginTop: `calc(${blockSpacingValue.value}px + var(--pic-print-page-break-offset, 0px))` } : {});
const hasPageBreak = computed(() => Boolean(props.printBlockId && props.printConfig?.pageBreakBefore?.[props.printBlockId]));

const summaryItems = computed(() => {
    if (!footer.value) return [];
    return [
        {
            label: `Venta ${currentYear.value}`,
            value: formatNumber(footer.value[`Venta_${currentYear.value}`] || 0),
            tone: 'main'
        },
        {
            label: `Meta ${currentYear.value}`,
            value: formatNumber(footer.value.meta || 0),
            tone: 'accent'
        },
        {
            label: 'Dif meta',
            value: formatNumber(footer.value.difMeta || 0),
            tone: (footer.value.difMeta || 0) < 0 ? 'danger' : 'success'
        },
        {
            label: 'Cumpl.',
            value: `${(footer.value.varMeta || 0).toFixed(1)}%`,
            tone: (footer.value.varMeta || 0) >= 100 ? 'success' : 'danger'
        }
    ];
});

const isBrandProjection = computed(() => props.dimensionKey === 'marcas');
const visibleProjectionRows = computed(() => {
    const query = projectionSearch.value.trim().toLowerCase();
    if (!query) return processedRows.value;

    return processedRows.value.filter(row =>
        String(row.Dimension || '').toLowerCase().includes(query)
    );
});
const visibleMobileRows = computed(() => visibleProjectionRows.value);

const projectionMobileFmt = (value: number) => {
    const numeric = Number(value || 0);
    const abs = Math.abs(numeric);
    const sign = numeric < 0 ? '-' : '';

    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
    return `${sign}${abs.toFixed(0)}`;
};

const colorClass = (val: number, isPercent = false) => {
    if (val === 0) return 'text-pic-text-muted/70';
    if (isPercent && val >= 100) return 'font-bold text-pic-success';
    if (isPercent) return val >= 0 ? 'text-pic-success' : 'text-pic-danger';
    return val >= 0 ? 'text-pic-success' : 'text-pic-danger';
};
</script>

<template>
    <div 
        v-if="tableData.length > 0 || !props.isPrintMode"
        class="pic-report-table pic-print-adjustable-block flex h-full flex-col overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm transition-all duration-300"
        data-pic-print-block="true"
        :data-pic-print-block-id="printBlockId"
        data-pic-print-table="true"
        data-pic-print-projection-table="true"
        :class="[
            { 'pic-print-page-break-before': hasPageBreak, 'is-print-expanded': props.isPrintMode },
            props.isPrintMode ? '!h-auto !overflow-visible' : ''
        ]"
        :style="blockStyle"
        :data-html2canvas-ignore="tableData.length === 0 ? 'true' : undefined"
    >
        <div v-if="printConfig && printBlockId" class="pic-print-block-controls">
            <span>{{ title }}</span>
            <button type="button" title="Reducir espacio antes" @click="emit('update-block-spacing', printBlockId, -8)"><i class="fa-solid fa-minus"></i></button>
            <strong>{{ blockSpacingValue }}px</strong>
            <button type="button" title="Aumentar espacio antes" @click="emit('update-block-spacing', printBlockId, 8)"><i class="fa-solid fa-plus"></i></button>
            <button type="button" title="Forzar salto de pagina antes" :class="{ 'is-active': hasPageBreak }" @click="emit('toggle-page-break', printBlockId)"><i class="fa-solid fa-file-arrow-down"></i></button>
            <button type="button" title="Resetear este bloque" @click="emit('reset-block-spacing', printBlockId)"><i class="fa-solid fa-rotate-left"></i></button>
        </div>
        
        <div class="flex shrink-0 items-center justify-between border-b border-pic-border bg-pic-muted-surface px-4 py-3">
            <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-pic-text-main">
                <i class="fa-solid fa-chart-gantt text-pic-text-muted"></i>
                {{ title }}
            </h3>
            
            <button data-pic-print-control="true" v-if="tableData.length > 0" @click="isCollapsed = !isCollapsed" class="text-[10px] font-bold uppercase text-pic-text-muted hover:text-pic-brand">
                {{ isCollapsed ? 'Mostrar' : 'Ocultar' }}
            </button>
        </div>

        <div v-if="tableData.length === 0 && !isLoading" class="flex min-h-[150px] flex-col items-center justify-center bg-pic-muted-surface/50 p-6">
            <p class="mb-3 text-xs text-pic-text-muted">Análisis disponible bajo demanda</p>
            <button 
                data-pic-print-control="true"
                @click="handleLoad"
                class="flex items-center gap-2 rounded-lg border border-pic-border bg-pic-surface px-4 py-2 text-xs font-bold text-pic-text-muted shadow-sm transition-all hover:border-pic-brand hover:text-pic-brand"
            >
                <i class="fa-solid fa-bolt"></i> Generar Tabla
            </button>
        </div>

        <div v-else-if="isLoading" class="flex min-h-[150px] items-center justify-center p-8 text-center text-pic-text-muted">
            <div class="flex flex-col items-center gap-2">
                <i class="fa-solid fa-circle-notch fa-spin text-2xl text-pic-brand"></i>
                <span class="text-xs font-medium">Procesando datos...</span>
            </div>
        </div>

        <div v-else-if="!isCollapsed || isPrintMode" :class="{ 'animate-fade-in': !props.isPrintMode }">
            <div data-pic-print-control="true" class="border-b border-pic-border bg-pic-surface px-4 py-3">
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div class="flex flex-wrap items-center gap-2">
                        <span
                            v-for="item in summaryItems"
                            :key="item.label"
                            class="rounded-lg border px-2.5 py-1.5 text-xs"
                            :class="{
                                'border-pic-border bg-pic-muted-surface text-pic-text-main': item.tone === 'main',
                                'border-pic-accent-purple/25 bg-pic-accent-purple-soft text-pic-accent-purple': item.tone === 'accent',
                                'border-pic-success/25 bg-pic-success/10 text-pic-success': item.tone === 'success',
                                'border-pic-danger/25 bg-pic-danger/10 text-pic-danger': item.tone === 'danger'
                            }"
                        >
                            <span class="mr-1 text-pic-text-muted">{{ item.label }}</span>
                            <span class="font-bold tabular-nums">{{ item.value }}</span>
                        </span>
                        <span class="rounded-lg border border-pic-border bg-pic-muted-surface px-2.5 py-1.5 text-xs font-medium text-pic-text-muted">
                            {{ visibleProjectionRows.length }} filas
                        </span>
                    </div>

                    <label class="relative hidden w-full max-w-xs md:block">
                        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i>
                        <input
                            v-model="projectionSearch"
                            type="search"
                            class="h-9 w-full rounded-lg border border-pic-border bg-pic-muted-surface pl-8 pr-3 text-xs text-pic-text-main outline-none transition focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-soft"
                            placeholder="Buscar concepto..."
                        />
                    </label>
                </div>
            </div>

            <div data-pic-print-control="true" class="p-2.5 md:hidden">
                <div v-if="isBrandProjection" class="space-y-3">
                    <article
                        v-for="row in visibleProjectionRows"
                        :key="row.Dimension"
                        class="rounded-xl border border-pic-border bg-pic-muted-surface/45 p-3"
                        @click="toggleRow(row)"
                    >
                        <div class="mb-3 flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <h4 class="truncate font-bold text-pic-text-main" :title="row.Dimension">{{ row.Dimension }}</h4>
                                <p class="mt-1 text-xs text-pic-text-muted">Part. {{ row.share.toFixed(1) }}%</p>
                            </div>
                            <span class="rounded-full px-2 py-0.5 text-xs font-bold" :class="colorClass(row.varMeta, true)">
                                {{ row.varMeta.toFixed(1) }}%
                            </span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div v-for="y in years" :key="y" class="rounded-lg bg-pic-surface p-2">
                                <p class="text-pic-text-muted">Venta {{ y }}</p>
                                <p class="mt-1 font-mono font-bold tabular-nums text-pic-text-main">{{ formatNumber(row[`Venta_${y}`]) }}</p>
                            </div>
                            <div class="rounded-lg bg-pic-success/10 p-2">
                                <p class="text-pic-success">Meta</p>
                                <p class="mt-1 font-mono font-bold tabular-nums text-pic-success">{{ formatNumber(row.meta) }}</p>
                            </div>
                            <div class="rounded-lg bg-pic-surface p-2">
                                <p class="text-pic-text-muted">Dif meta</p>
                                <p class="mt-1 font-mono font-bold tabular-nums" :class="colorClass(row.difMeta)">{{ formatNumber(row.difMeta) }}</p>
                            </div>
                        </div>
                    </article>
                </div>

                <div v-else class="space-y-2.5">
                    <div v-if="mobileShowAllColumns" class="flex items-center gap-2">
                        <label class="relative min-w-0 flex-1">
                            <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pic-text-muted"></i>
                            <input
                                v-model="projectionSearch"
                                type="search"
                                class="h-9 w-full rounded-lg border border-pic-border bg-pic-surface pl-8 pr-3 text-xs text-pic-text-main outline-none transition focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-soft"
                                placeholder="Buscar en esta tabla..."
                            />
                        </label>
                        <button
                            type="button"
                            class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-pic-border bg-pic-muted-surface text-pic-text-muted transition hover:border-pic-brand/40 hover:text-pic-brand"
                            title="Ver columnas principales"
                            @click="mobileShowAllColumns = false"
                        >
                            <i class="fa-solid fa-compress"></i>
                        </button>
                    </div>

                    <div class="overflow-hidden rounded-lg border border-pic-border bg-pic-surface shadow-sm">
                        <div class="overflow-x-auto custom-scrollbar" :class="mobileShowAllColumns ? '' : 'overflow-x-hidden'">
                            <table class="w-full table-fixed border-collapse text-left text-[10px]" :class="mobileShowAllColumns ? 'min-w-[860px]' : ''">
                                <thead class="bg-pic-nav text-[9px] font-black uppercase tracking-normal text-pic-nav-text">
                                    <tr>
                                        <th class="sticky left-0 z-20 w-[168px] border-r border-pic-nav-muted bg-pic-nav-muted px-2 py-2.5 text-left shadow-[4px_0_10px_rgba(15,23,42,0.14)]">Concepto</th>
                                        <th
                                            v-for="y in years"
                                            v-show="mobileShowAllColumns || y === currentYear"
                                            :key="y"
                                            class="px-1.5 py-2.5 text-right"
                                            :class="y === currentYear ? 'text-pic-nav-text' : 'text-pic-nav-text-muted'"
                                        >
                                            Venta {{ y }}
                                        </th>
                                        <th class="px-1.5 py-2.5 text-right text-pic-success">Meta</th>
                                        <th v-if="mobileShowAllColumns" class="px-1.5 py-2.5 text-right text-pic-nav-text-muted">Dif año</th>
                                        <th class="px-1.5 py-2.5 text-right text-pic-nav-text-muted">Dif meta</th>
                                        <th class="px-1.5 py-2.5 text-right text-pic-nav-text-muted">Cumpl %</th>
                                        <th v-if="mobileShowAllColumns" class="px-1.5 py-2.5 text-right text-pic-nav-text-muted">Part %</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-pic-border">
                                    <template v-for="row in visibleMobileRows" :key="row.Dimension">
                                        <tr
                                            class="odd:bg-pic-surface even:bg-pic-muted-surface/35"
                                            :class="drillDownTarget ? 'cursor-pointer' : ''"
                                            @click="toggleRow(row)"
                                        >
                                            <td class="sticky left-0 z-10 border-r border-pic-border bg-pic-surface px-2 py-2.5 font-bold text-pic-text-main shadow-[4px_0_10px_rgba(15,23,42,0.08)]">
                                                <div class="flex min-w-0 items-start gap-1.5">
                                                    <i
                                                        v-if="drillDownTarget"
                                                        class="fa-solid mt-0.5 shrink-0 text-[8px] text-pic-text-muted"
                                                        :class="expandedRows[row.Dimension] || loadingRows[row.Dimension] ? 'fa-chevron-down' : 'fa-chevron-right'"
                                                    ></i>
                                                    <span class="whitespace-normal break-words leading-tight" :title="row.Dimension">{{ row.Dimension }}</span>
                                                </div>
                                            </td>
                                            <td
                                                v-for="y in years"
                                                v-show="mobileShowAllColumns || y === currentYear"
                                                :key="y"
                                                class="px-1.5 py-2.5 text-right font-mono font-semibold tabular-nums"
                                                :class="y === currentYear ? 'text-pic-text-main' : 'text-pic-text-muted'"
                                            >
                                                {{ projectionMobileFmt(row[`Venta_${y}`]) }}
                                            </td>
                                            <td class="px-1.5 py-2.5 text-right font-mono font-bold tabular-nums text-pic-success">
                                                {{ projectionMobileFmt(row.meta) }}
                                            </td>
                                            <td v-if="mobileShowAllColumns" class="px-1.5 py-2.5 text-right font-mono font-bold tabular-nums" :class="colorClass(row.difAnual)">
                                                {{ projectionMobileFmt(row.difAnual) }}
                                            </td>
                                            <td class="px-1.5 py-2.5 text-right font-mono font-bold tabular-nums" :class="colorClass(row.difMeta)">
                                                {{ projectionMobileFmt(row.difMeta) }}
                                            </td>
                                            <td class="px-1.5 py-2.5 text-right font-mono font-bold tabular-nums" :class="colorClass(row.varMeta, true)">
                                                {{ row.varMeta.toFixed(1) }}%
                                            </td>
                                            <td v-if="mobileShowAllColumns" class="px-1.5 py-2.5 text-right font-mono font-bold tabular-nums text-pic-text-main">
                                                {{ row.share.toFixed(1) }}%
                                            </td>
                                        </tr>

                                        <tr v-if="loadingRows[row.Dimension]">
                                            <td :colspan="mobileShowAllColumns ? 8 + years.length : 5" class="bg-pic-muted-surface px-2 py-2 text-center text-[10px] text-pic-text-muted">
                                                <i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Cargando detalle...
                                            </td>
                                        </tr>

                                        <template v-if="expandedRows[row.Dimension]">
                                            <tr
                                                v-for="child in getChildRows(row.Dimension)"
                                                :key="child.Dimension"
                                                class="bg-pic-muted-surface text-[9px] text-pic-text-muted"
                                            >
                                                <td class="sticky left-0 z-10 border-r border-pic-border bg-pic-muted-surface px-2 py-2 pl-5 font-medium shadow-[4px_0_10px_rgba(15,23,42,0.08)]">
                                                    <span class="whitespace-normal break-words leading-tight" :title="child.Dimension">{{ child.Dimension }}</span>
                                                </td>
                                                <td
                                                    v-for="y in years"
                                                    v-show="mobileShowAllColumns || y === currentYear"
                                                    :key="y"
                                                    class="px-1.5 py-2 text-right font-mono tabular-nums"
                                                >
                                                    {{ projectionMobileFmt(child[`Venta_${y}`]) }}
                                                </td>
                                                <td class="px-1.5 py-2 text-right font-mono tabular-nums text-pic-success">{{ projectionMobileFmt(child.meta) }}</td>
                                                <td v-if="mobileShowAllColumns" class="px-1.5 py-2 text-right font-mono tabular-nums" :class="colorClass(child.difAnual)">{{ projectionMobileFmt(child.difAnual) }}</td>
                                                <td class="px-1.5 py-2 text-right font-mono tabular-nums" :class="colorClass(child.difMeta)">{{ projectionMobileFmt(child.difMeta) }}</td>
                                                <td class="px-1.5 py-2 text-right font-mono tabular-nums" :class="colorClass(child.varMeta, true)">{{ child.varMeta.toFixed(1) }}%</td>
                                                <td v-if="mobileShowAllColumns" class="px-1.5 py-2 text-right font-mono tabular-nums">{{ child.share.toFixed(1) }}%</td>
                                            </tr>
                                        </template>
                                    </template>
                                </tbody>
                                <tfoot v-if="footer" class="border-t border-pic-border bg-pic-muted-surface font-bold text-pic-text-main">
                                    <tr>
                                        <td class="sticky left-0 z-10 border-r border-pic-border bg-pic-muted-surface px-2 py-2.5 shadow-[4px_0_10px_rgba(15,23,42,0.08)]">TOTAL</td>
                                        <td
                                            v-for="y in years"
                                            v-show="mobileShowAllColumns || y === currentYear"
                                            :key="y"
                                            class="px-1.5 py-2.5 text-right font-mono tabular-nums"
                                        >
                                            {{ projectionMobileFmt(footer[`Venta_${y}`]) }}
                                        </td>
                                        <td class="px-1.5 py-2.5 text-right font-mono tabular-nums text-pic-success">{{ projectionMobileFmt(footer.meta) }}</td>
                                        <td v-if="mobileShowAllColumns" class="px-1.5 py-2.5 text-right font-mono tabular-nums" :class="colorClass(footer.difAnual)">{{ projectionMobileFmt(footer.difAnual) }}</td>
                                        <td class="px-1.5 py-2.5 text-right font-mono tabular-nums" :class="colorClass(footer.difMeta)">{{ projectionMobileFmt(footer.difMeta) }}</td>
                                        <td class="px-1.5 py-2.5 text-right font-mono tabular-nums" :class="colorClass(footer.varMeta, true)">{{ footer.varMeta.toFixed(1) }}%</td>
                                        <td v-if="mobileShowAllColumns" class="px-1.5 py-2.5 text-right font-mono tabular-nums">100%</td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div v-if="!visibleMobileRows.length" class="px-4 py-6 text-center text-sm text-pic-text-muted">
                                No hay registros que coincidan con la busqueda.
                            </div>
                        </div>

                        <button
                            type="button"
                            class="flex h-11 w-full items-center justify-center gap-2 border-t border-pic-border bg-pic-muted-surface text-xs font-bold text-pic-text-muted transition hover:text-pic-brand"
                            @click="mobileShowAllColumns = !mobileShowAllColumns"
                        >
                            <span>{{ mobileShowAllColumns ? 'Ver columnas principales' : 'Ver todas las columnas' }}</span>
                            <i class="fa-solid" :class="mobileShowAllColumns ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div
                class="pic-report-table-scroll hidden max-h-[560px] overflow-auto custom-scrollbar md:block"
                :class="[
                    { 'is-print-expanded': props.isPrintMode },
                    props.isPrintMode ? '!block !max-h-none !overflow-visible !overflow-x-visible !overflow-y-visible' : ''
                ]"
            >
            <table class="w-full min-w-[980px] border-collapse text-left text-xs whitespace-nowrap">
                <thead class="sticky top-0 z-10 bg-pic-nav font-semibold uppercase text-pic-nav-text">
                    <tr>
                        <th class="sticky left-0 z-20 min-w-[180px] border-r border-pic-nav-muted bg-pic-nav-muted px-3 py-2 text-left shadow-[4px_0_10px_rgba(15,23,42,0.14)]">
                            Concepto
                        </th>
                        <th v-for="y in years" :key="y" class="px-3 py-2 text-right">Venta {{ y }}</th>
                        <th class="bg-pic-nav-muted px-3 py-2 text-right">Meta {{ currentYear }}</th>
                        <th class="px-3 py-2 text-right">Dif (Año)</th>
                        <th class="px-3 py-2 text-right">Dif (Meta)</th>
                        <th class="px-3 py-2 text-right">Crec %</th>
                        <th class="px-3 py-2 text-right">Cumpl %</th>
                        <th class="bg-pic-nav-muted px-3 py-2 text-right">Part %</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-pic-border">
                    <template v-for="row in visibleProjectionRows" :key="row.Dimension">
                        
                        <tr 
                            class="transition-colors group border-l-4 border-transparent"
                            :class="[
                                drillDownTarget ? 'cursor-pointer hover:bg-pic-accent-yellow-soft' : 'hover:bg-pic-muted-surface',
                                expandedRows[row.Dimension] ? 'border-l-pic-brand bg-pic-muted-surface' : ''
                            ]"
                            @click="toggleRow(row)"
                        >
                            <td class="sticky left-0 max-w-[200px] truncate border-r border-pic-border bg-pic-surface px-3 py-2 font-bold text-pic-text-main shadow-[4px_0_10px_rgba(15,23,42,0.06)]" :title="row.Dimension">
                                <div class="flex items-center gap-2">
                                    <i v-if="drillDownTarget" 
                                       class="fa-solid text-[10px] text-pic-text-muted transition-transform duration-200"
                                       :class="expandedRows[row.Dimension] || loadingRows[row.Dimension] ? 'fa-chevron-down' : 'fa-chevron-right'">
                                    </i>
                                    {{ row.Dimension }}
                                </div>
                            </td>

                            <td v-for="y in years" :key="y" class="px-3 py-2 text-right font-mono text-pic-text-muted">{{ formatNumber(row[`Venta_${y}`]) }}</td>
                            <td class="bg-pic-success/10 px-3 py-2 text-right font-mono text-pic-success">{{ formatNumber(row.meta) }}</td>
                            <td class="px-3 py-2 text-right font-mono" :class="colorClass(row.difAnual)">{{ formatNumber(row.difAnual) }}</td>
                            <td class="px-3 py-2 text-right font-mono" :class="colorClass(row.difMeta)">{{ formatNumber(row.difMeta) }}</td>
                            
                            <td class="px-3 py-2 text-right font-bold font-mono" :class="colorClass(row.crec)">{{ row.crec.toFixed(1) }}%</td>
                            <td class="px-3 py-2 text-right font-bold font-mono" :class="colorClass(row.varMeta, true)">{{ row.varMeta.toFixed(1) }}%</td>
                            <td class="bg-pic-muted-surface px-3 py-2 text-right font-mono font-bold text-pic-text-main">{{ row.share.toFixed(1) }}%</td>
                        </tr>

                        <tr v-if="loadingRows[row.Dimension]">
                            <td :colspan="8 + years.length" class="bg-pic-muted-surface p-2 text-center text-[10px] text-pic-text-muted">
                                <i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Cargando detalle...
                            </td>
                        </tr>

                        <template v-if="expandedRows[row.Dimension]">
                            <tr v-for="child in getChildRows(row.Dimension)" :key="child.Dimension" class="group border-b border-pic-border bg-pic-muted-surface text-[11px] text-pic-text-muted shadow-inner transition-colors hover:bg-pic-brand-soft">
                                <td class="sticky left-0 max-w-[200px] truncate border-r border-pic-border bg-pic-muted-surface px-3 py-1.5 pl-8 font-medium text-pic-text-muted shadow-[4px_0_10px_rgba(15,23,42,0.06)] group-hover:bg-pic-brand-soft" :title="child.Dimension">
                                    {{ child.Dimension }}
                                </td>
                                
                                <td v-for="y in years" :key="y" class="px-3 py-1.5 text-right font-mono text-pic-text-muted">
                                    {{ formatNumber(child[`Venta_${y}`]) }}
                                </td>
                                <td class="px-3 py-1.5 text-right font-mono text-pic-success/80">{{ formatNumber(child.meta) }}</td>
                                
                                <td class="px-3 py-1.5 text-right font-mono" :class="colorClass(child.difAnual)">{{ formatNumber(child.difAnual) }}</td>
                                <td class="px-3 py-1.5 text-right font-mono" :class="colorClass(child.difMeta)">{{ formatNumber(child.difMeta) }}</td>
                                <td class="px-3 py-1.5 text-right font-mono" :class="colorClass(child.crec)">{{ child.crec.toFixed(1) }}%</td>
                                <td class="px-3 py-1.5 text-right font-mono" :class="colorClass(child.varMeta, true)">{{ child.varMeta.toFixed(1) }}%</td>
                                
                                <td class="bg-pic-brand-soft/50 px-3 py-1.5 text-right font-mono font-bold text-pic-brand">
                                    {{ child.share.toFixed(1) }}%
                                </td>
                            </tr>
                        </template>

                    </template>
                </tbody>
                <tfoot v-if="footer" class="border-t-2 border-pic-border bg-pic-muted-surface font-bold text-pic-text-main">
                    <tr>
                        <td class="sticky left-0 border-r border-pic-border bg-pic-muted-surface px-3 py-2 shadow-[4px_0_10px_rgba(15,23,42,0.06)]">TOTAL</td>
                        <td v-for="y in years" :key="y" class="px-3 py-2 text-right font-mono">{{ formatNumber(footer[`Venta_${y}`]) }}</td>
                        <td class="px-3 py-2 text-right font-mono text-pic-success">{{ formatNumber(footer.meta) }}</td>
                        <td class="px-3 py-2 text-right font-mono" :class="colorClass(footer.difAnual)">{{ formatNumber(footer.difAnual) }}</td>
                        <td class="px-3 py-2 text-right font-mono" :class="colorClass(footer.difMeta)">{{ formatNumber(footer.difMeta) }}</td>
                        <td class="px-3 py-2 text-right font-mono"  :class="colorClass(footer.crec)">{{ footer.crec.toFixed(1) }}%</td>
                        <td class="px-3 py-2 text-right font-mono" :class="colorClass(footer.varMeta, true)">{{ footer.varMeta.toFixed(1) }}%</td>
                        <td class="bg-pic-border/50 px-3 py-2 text-right font-mono">100%</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: hsl(var(--pic-muted-surface)); }
.custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--pic-border)); border-radius: 4px; }
.pic-report-table.is-print-expanded {
    height: auto !important;
    overflow: visible !important;
}

.pic-report-table.is-print-expanded .animate-fade-in {
    height: auto !important;
    overflow: visible !important;
    animation: none !important;
    opacity: 1 !important;
}

.pic-report-table-scroll.is-print-expanded {
    display: block !important;
    max-height: none !important;
    overflow: visible !important;
}

.pic-report-table-scroll.is-print-expanded table {
    min-width: 0 !important;
    table-layout: auto;
    overflow: visible !important;
}

.pic-report-table-scroll.is-print-expanded thead {
    position: static !important;
}
.animate-fade-in { animation: fadeIn 0.3s ease-in; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
