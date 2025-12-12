<script setup lang="ts">
import { computed, ref } from 'vue'; // <--- AGREGAR ref
import { usePicFilterStore } from '../stores/picFilterStore';
import { processChartData, processAnnualData, getChartConfig, CHART_COLORS, CHART_COLORS_GREEN, MONTH_NAMES } from '../utils/picUtils';
import BaseChart from './charts/BaseChart.vue';
import PicDataTable from './tables/PicDataTable.vue';
import PicProjectionTable from './tables/PicProjectionTable.vue';
import KpiCardWidget from './widgets/KpiCardWidget.vue';       
import SimpleTableWidget from './widgets/SimpleTableWidget.vue'; 

const store = usePicFilterStore();
const selectedYears = computed(() => store.selected.Anio.sort());

// <--- NUEVO: Estado para colapsar toda la sección de desglose
const showDesglose = ref(true);

// --- 1. CONFIGURACIÓN PESOS ($) ---
const dataPesos = computed(() => processChartData(store.reportData, selectedYears.value, 'pesos'));
const configPesosMensual = computed(() => {
    const datasets = selectedYears.value.map((year, i) => ({
        label: year,
        data: dataPesos.value.map(d => d[year]),
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
        borderRadius: 4
    }));
    return getChartConfig(MONTH_NAMES, datasets, 'bar');
});

const dataPesosAnual = computed(() => processAnnualData(store.reportData, selectedYears.value, 'pesos'));
const configPesosAnual = computed(() => {
    return getChartConfig(selectedYears.value, [{
        label: 'Total Anual ($)',
        data: dataPesosAnual.value,
        backgroundColor: selectedYears.value.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderRadius: 4
    }], 'bar');
});


// --- 2. CONFIGURACIÓN KILOS (KG) ---
const dataKilos = computed(() => processChartData(store.reportData, selectedYears.value, 'kilos'));
const configKilosMensual = computed(() => {
    const datasets = selectedYears.value.map((year, i) => ({
        label: `KG ${year}`,
        data: dataKilos.value.map(d => d[year]),
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
        borderRadius: 4,
        order: 2
    }));
    const lastYear = selectedYears.value[selectedYears.value.length - 1];
    if (lastYear) {
        datasets.push({
            label: `Meta ${lastYear}`,
            data: dataKilos.value.map(d => d[`meta_${lastYear}`]),
            type: 'line' as any,
            borderColor: '#9333ea', 
            borderWidth: 2,
            pointRadius: 3,
            backgroundColor: 'transparent',
            order: 1
        });
    }
    return getChartConfig(MONTH_NAMES, datasets, 'bar');
});

const dataKilosAnual = computed(() => processAnnualData(store.reportData, selectedYears.value, 'kilos'));
const configKilosAnual = computed(() => {
    return getChartConfig(selectedYears.value, [{
        label: 'Total Anual (KG)',
        data: dataKilosAnual.value,
        backgroundColor: selectedYears.value.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderRadius: 4
    }], 'bar');
});


// --- 3. CONFIGURACIÓN PROMEDIO ($/KG) ---
const dataPromedio = computed(() => processChartData(store.reportData, selectedYears.value, 'promedio'));
const configPromedioMensual = computed(() => {
    const datasets = selectedYears.value.map((year, i) => ({
        label: `Promedio ${year}`,
        data: dataPromedio.value.map(d => d[year]),
        borderColor: CHART_COLORS_GREEN[i % CHART_COLORS_GREEN.length],
        backgroundColor: CHART_COLORS_GREEN[i % CHART_COLORS_GREEN.length],
        borderRadius: 4
       
    }));
    return getChartConfig(MONTH_NAMES, datasets, 'bar');
});

const dataPromedioAnual = computed(() => processAnnualData(store.reportData, selectedYears.value, 'promedio'));
const configPromedioAnual = computed(() => {
    return getChartConfig(selectedYears.value, [{
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
    <div class="space-y-8 pb-20 @container">
        
        <div v-if="store.dynamicWidgets.length > 0" class="bg-brand-50/50 rounded-2xl p-6 border border-brand-100 shadow-inner animate-fade-in mb-8">
            <div class="flex items-center justify-between border-b border-brand-200 pb-3 mb-4">
                <h3 class="text-sm font-bold text-brand-700 flex items-center gap-2">
                    <div class="p-1.5 bg-white rounded-md shadow-sm text-brand-600">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    Insights Generados por IA
                </h3>
                <button @click="store.clearDynamicWidgets()" class="text-xs font-medium text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1">
                    <i class="fa-regular fa-trash-can"></i> Limpiar zona
                </button>
            </div>

            <div class="grid grid-cols-1 @3xl:grid-cols-2 gap-6">
                <div 
                    v-for="widget in store.dynamicWidgets" 
                    :key="widget.id" 
                    class="relative group bg-white rounded-xl shadow-sm border border-slate-200 p-1 transition-all hover:shadow-md"
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
                        class="absolute top-3 right-3 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg shadow-md border border-slate-100 transition-all opacity-0 group-hover:opacity-100 z-20 scale-90 hover:scale-100"
                        title="Eliminar este elemento"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
        </div>

       <div class="grid grid-cols-1 @split:grid-cols-3 gap-6">
            <div class="@split:col-span-2">
                <BaseChart 
                :config="configPesosMensual" 
                title="Facturación Mensual ($)" 
                :enable-switch="true"/>
            </div>
            <div class="@split:col-span-1">
                <BaseChart :config="configPesosAnual" title="Facturación Anual ($)" />
            </div>
        </div>
        <PicDataTable title="Detalle Facturación ($)" type="pesos" :processed-data="dataPesos" :years="selectedYears" />

        <div class="border-t border-slate-200 my-8"></div>

        <div class="grid grid-cols-1 @split:grid-cols-3 gap-6">
            <div class="@split:col-span-2">
                <BaseChart 
                :config="configKilosMensual" 
                title="Venta vs Metas (KG)" 
                :enable-switch="true"
                />
            </div>
            <div class="@split:col-span-1">
                <BaseChart :config="configKilosAnual" title="Facturación Anual (KG)" />
            </div>
        </div>
        <PicDataTable title="Detalle Volumen (KG)" type="kilos" 
        :processed-data="dataKilos" 
        :years="selectedYears" />

        <div class="border-t border-slate-200 my-8"></div>

        <div class="grid grid-cols-1 @4xl:grid-cols-3 gap-6">
            <div class="@split:col-span-2">
                <BaseChart 
                :config="configPromedioMensual" 
                title="Precio Promedio Mensual ($/KG)"
                :enable-switch="true" />
            </div>
            <div class="@split:col-span-1">
                <BaseChart :config="configPromedioAnual" title="Precio Promedio Anual ($/KG)" />
            </div>
        </div>
        <PicDataTable title="Detalle Precio Promedio" type="promedio" :processed-data="dataPromedio" :years="selectedYears" />

        <div class="pt-8 border-t-2 border-slate-200 border-dashed mt-12">
            <button 
                @click="showDesglose = !showDesglose"
                class="w-full flex justify-between items-center mb-6 group focus:outline-none"
            >
                <div class="flex items-center gap-2">
                    <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2 px-1 group-hover:text-brand-600 transition-colors">
                        <i class="fa-solid fa-layer-group text-brand-500"></i>
                        Desglose Operativo
                    </h2>
                    <span class="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        {{ showDesglose ? 'Visible' : 'Oculto' }}
                    </span>
                </div>
                <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-all">
                    <i class="fa-solid fa-chevron-down transition-transform duration-300" :class="{'rotate-180': !showDesglose}"></i>
                </div>
            </button>

            <div v-show="showDesglose" class="space-y-6 transition-all duration-500 ease-in-out">
                <PicProjectionTable title="Proyección por Marcas" dimensionKey="marcas" />
                <div class="grid grid-cols-1 @split:grid-cols-2 gap-6">
                    <PicProjectionTable title="Proyección por Gerencia" dimensionKey="gerencia" />
                    <PicProjectionTable title="Proyección por Zona" dimensionKey="zona" drill-down-target="articulos" />
                </div>
                <PicProjectionTable title="Proyección por Canal" dimensionKey="canal" drill-down-target="articulos"/>
                <PicProjectionTable title="Proyección por Familias" dimensionKey="familias" drill-down-target="articulos"/>
                <PicProjectionTable title="Proyección por Clientes (Top)" dimensionKey="clientes" drill-down-target="articulos" :initial-collapsed="true"/>
                <PicProjectionTable title="Proyección por Artículos" dimensionKey="articulos" :initial-collapsed="true"/>
            </div>
        </div>

    </div>
</template>