<script setup lang="ts">
import { computed, ref } from 'vue'; // <--- AGREGAR ref
import { usePicFilterStore } from '../stores/picFilterStore';
import { processChartData, processAnnualData, getEChartConfig, CHART_COLORS, CHART_COLORS_GREEN, MONTH_NAMES } from '../utils/picUtils';
import PicEChart from './charts/PicEChart.vue';
import BaseChart from './charts/BaseChart.vue'; // Mantener para widgets dinámicos de IA
import PicDataTable from './tables/PicDataTable.vue';
import PicProjectionTable from './tables/PicProjectionTable.vue';
import KpiCardWidget from './widgets/KpiCardWidget.vue';       
import SimpleTableWidget from './widgets/SimpleTableWidget.vue'; 

const store = usePicFilterStore();
const selectedYears = computed(() => store.selected.Anio.sort());

// <--- NUEVO: Estado para colapsar toda la sección de desglose
const showDesglose = ref(true);

const hasAnyProjectionLoaded = computed(() => {
    return Object.values(store.projectionData).some(data => data && data.length > 0);
});

// --- LÓGICA DE MESES VISIBLES ---
const visibleMonthRange = computed(() => {
    if (!store.selected.usarRangoMeses) {
        return { start: 0, end: 12 };
    }

    const start = Math.max(0, parseInt(store.selected.MesInicial) - 1); // 0-indexed
    let end = parseInt(store.selected.MesFinal);

    // Seguridad extra
    if (start >= end) return { start: 0, end: 12 }; // Fallback
    
    return { start, end };
});

// --- 1. CONFIGURACIÓN PESOS ($) ---
const dataPesos = computed(() => processChartData(store.reportData, selectedYears.value, 'pesos'));
const configPesosMensual = computed(() => {
    const { start, end } = visibleMonthRange.value;
    const labels = MONTH_NAMES.slice(start, end);
    const datasets = selectedYears.value.map((year, i) => ({
        label: year,
        data: dataPesos.value.slice(start, end).map(d => d[year]),
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
        borderRadius: 4
    }));
    return getEChartConfig(labels, datasets, 'bar');
});

const dataPesosAnual = computed(() => processAnnualData(store.reportData, selectedYears.value, 'pesos'));
const configPesosAnual = computed(() => {
    return getEChartConfig(selectedYears.value, [{
        label: 'Total Anual ($)',
        data: dataPesosAnual.value,
        backgroundColor: selectedYears.value.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderRadius: 4
    }], 'bar');
});


// --- 2. CONFIGURACIÓN KILOS (KG) ---
const dataKilos = computed(() => processChartData(store.reportData, selectedYears.value, 'kilos'));
const configKilosMensual = computed(() => {
    const { start, end } = visibleMonthRange.value;
    const labels = MONTH_NAMES.slice(start, end);
    const datasets = selectedYears.value.map((year, i) => ({
        label: `KG ${year}`,
        data: dataKilos.value.slice(start, end).map(d => d[year]),
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
        borderRadius: 4,
        order: 2
    }));
    const lastYear = selectedYears.value[selectedYears.value.length - 1];
    if (lastYear) {
        datasets.push({
            label: `Meta ${lastYear}`,
            data: dataKilos.value.slice(start, end).map(d => d[`meta_${lastYear}`]),
            type: 'line' as any,
            borderColor: 'hsl(var(--pic-accent-purple))', 
            borderWidth: 2,
            pointRadius: 3,
            backgroundColor: 'transparent',
            order: 1
        });
    }
    return getEChartConfig(labels, datasets, 'bar');
});

const dataKilosAnual = computed(() => processAnnualData(store.reportData, selectedYears.value, 'kilos'));
const configKilosAnual = computed(() => {
    return getEChartConfig(selectedYears.value, [{
        label: 'Total Anual (KG)',
        data: dataKilosAnual.value,
        backgroundColor: selectedYears.value.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderRadius: 4
    }], 'bar');
});


// --- 3. CONFIGURACIÓN PROMEDIO ($/KG) ---
const dataPromedio = computed(() => processChartData(store.reportData, selectedYears.value, 'promedio'));
const configPromedioMensual = computed(() => {
    const { start, end } = visibleMonthRange.value;
    const labels = MONTH_NAMES.slice(start, end);
    const datasets = selectedYears.value.map((year, i) => ({
        label: `Promedio ${year}`,
        data: dataPromedio.value.slice(start, end).map(d => d[year]),
        borderColor: CHART_COLORS_GREEN[i % CHART_COLORS_GREEN.length],
        backgroundColor: CHART_COLORS_GREEN[i % CHART_COLORS_GREEN.length],
        borderRadius: 4
    }));
    return getEChartConfig(labels, datasets, 'bar');
});

const dataPromedioAnual = computed(() => processAnnualData(store.reportData, selectedYears.value, 'promedio'));
const configPromedioAnual = computed(() => {
    return getEChartConfig(selectedYears.value, [{
        label: 'Promedio Anual ($/KG)',
        data: dataPromedioAnual.value,
        backgroundColor: selectedYears.value.map((_, i) => CHART_COLORS_GREEN[i % CHART_COLORS_GREEN.length]),
        borderRadius: 4
    }], 'bar');
});

// Helper para eliminar widgets
const removeWidget = (id: string) => {
    store.removeDynamicWidget(id);
};
</script>

<template>
    <div class="space-y-5 pb-20 @container md:space-y-7">
        
        <div v-if="store.dynamicWidgets.length > 0" class="mb-8 animate-fade-in rounded-2xl border border-pic-brand-border bg-pic-brand-soft/50 p-6 shadow-inner">
            <div class="mb-4 flex items-center justify-between border-b border-pic-brand-border pb-3">
                <h3 class="flex items-center gap-2 text-sm font-bold text-pic-brand">
                    <div class="rounded-md bg-pic-surface p-1.5 text-pic-brand shadow-sm">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    Insights Generados por IA
                </h3>
                <button @click="store.clearDynamicWidgets()" class="flex items-center gap-1 text-xs font-medium text-pic-text-muted transition-colors hover:text-pic-danger">
                    <i class="fa-regular fa-trash-can"></i> Limpiar zona
                </button>
            </div>

            <div class="pic-chart-row grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div 
                    v-for="widget in store.dynamicWidgets" 
                    :key="widget.id" 
                    class="pic-chart-cell group relative rounded-xl border border-pic-border bg-pic-surface p-1 shadow-sm transition-all hover:shadow-md"
                >
                    <div class="h-80 w-full overflow-hidden rounded-lg"> 
                        
                        <KpiCardWidget 
                            v-if="widget.type === 'kpi'" 
                            :config="widget.config" 
                        />

                        <SimpleTableWidget 
                            v-else-if="widget.type === 'table'" 
                            :config="widget.config" 
                        />

                        <BaseChart 
                            v-else 
                            :config="widget.config" 
                            :title="widget.title" 
                            :enable-switch="widget.type !== 'pie' && widget.type !== 'doughnut'" 
                        />
                    </div>

                    <button 
                        @click="removeWidget(widget.id)"
                        class="absolute right-3 top-3 z-20 scale-90 rounded-lg border border-pic-border bg-pic-surface p-1.5 text-pic-text-muted opacity-0 shadow-md transition-all hover:scale-100 hover:bg-pic-danger/10 hover:text-pic-danger group-hover:opacity-100"
                        title="Eliminar este elemento"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
        </div>

       <div class="pic-chart-row grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div class="pic-chart-cell min-w-0">
                <PicEChart
                :option="configKilosAnual"
                title="Facturación Anual (KG)" />
            </div>
            <div class="pic-chart-cell min-w-0">
                <PicEChart
                :option="configKilosMensual"
                title="Venta vs Metas (KG)"
                :enable-switch="true" />
            </div>
        </div>
        <PicDataTable title="Detalle Volumen (KG)" type="kilos" :processed-data="dataKilos" :years="selectedYears" />

        <div class="my-5 border-t border-pic-border md:my-7"></div>

        <div class="pic-chart-row grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div class="pic-chart-cell min-w-0">
                <PicEChart
                :option="configPesosMensual"
                title="Facturación Mensual ($)"
                :enable-switch="true" />
            </div>
            <div class="pic-chart-cell min-w-0">
                <PicEChart :option="configPesosAnual" title="Facturación Anual ($)" />
            </div>
        </div>
        <PicDataTable title="Detalle Facturación ($)" type="pesos" :processed-data="dataPesos" :years="selectedYears" />

        <div class="my-5 border-t border-pic-border md:my-7"></div>

        <div class="pic-chart-row grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div class="pic-chart-cell min-w-0">
                <PicEChart
                :option="configPromedioMensual"
                title="Precio Promedio Mensual ($/KG)"
                :enable-switch="true" />
            </div>
            <div class="pic-chart-cell min-w-0">
                <PicEChart :option="configPromedioAnual" title="Precio Promedio Anual ($/KG)" />
            </div>
        </div>
        <PicDataTable title="Detalle Precio Promedio" type="promedio" :processed-data="dataPromedio" :years="selectedYears" />

        <div 
            class="mt-12 border-t-2 border-dashed border-pic-border pt-8"
            :data-html2canvas-ignore="!hasAnyProjectionLoaded ? 'true' : undefined"
        >
            <button 
                @click="showDesglose = !showDesglose"
                class="w-full flex justify-between items-center mb-6 group focus:outline-none"
            >
                <div class="flex items-center gap-2">
                    <h2 class="flex items-center gap-2 px-1 text-xl font-bold text-pic-text-main transition-colors group-hover:text-pic-brand">
                        <i class="fa-solid fa-layer-group text-pic-brand"></i>
                        Desglose Operativo
                    </h2>
                    <span class="rounded-full border border-pic-border bg-pic-muted-surface px-2 py-0.5 text-xs font-medium text-pic-text-muted">
                        {{ showDesglose ? 'Visible' : 'Oculto' }}
                    </span>
                </div>
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-pic-muted-surface text-pic-text-muted transition-all group-hover:bg-pic-brand-soft group-hover:text-pic-brand">
                    <i class="fa-solid fa-chevron-down transition-transform duration-300" :class="{'rotate-180': !showDesglose}"></i>
                </div>
            </button>

            <div v-show="showDesglose" class="space-y-6 transition-all duration-500 ease-in-out">
                <PicProjectionTable title="Proyección por Marcas" dimensionKey="marcas" />
                <PicProjectionTable title="Proyección por Gerencia" dimensionKey="gerencia" />
                <PicProjectionTable title="Proyección por Zona" dimensionKey="zona" drill-down-target="articulos" />
                <PicProjectionTable title="Proyección por Canal" dimensionKey="canal" drill-down-target="articulos"/>
                <PicProjectionTable title="Proyección por Familias" dimensionKey="familias" drill-down-target="articulos"/>
                <PicProjectionTable title="Proyección por Clientes (Top 150)" dimensionKey="clientes" drill-down-target="articulos" :initial-collapsed="true"/>
                <PicProjectionTable title="Proyección por Artículos" dimensionKey="articulos" :initial-collapsed="true"/>
            </div>
        </div>

    </div>
</template>
