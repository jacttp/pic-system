<script setup lang="ts">
import { computed, ref } from 'vue'; // <--- AGREGAR ref
import { usePicFilterStore } from '../stores/picFilterStore';
import { processChartData, processAnnualData, getChartConfig, CHART_COLORS, CHART_COLORS_GREEN, MONTH_NAMES } from '../utils/picUtils';
import BaseChart from './charts/BaseChart.vue';
import PicDataTable from './tables/PicDataTable.vue';
import PicProjectionTable from './tables/PicProjectionTable.vue';

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

</script>

<template>
    <div class="space-y-8 pb-20">
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2">
                <BaseChart 
                :config="configPesosMensual" 
                title="Facturación Mensual ($)" 
                :enable-switch="true"/>
            </div>
            <div class="lg:col-span-1">
                <BaseChart :config="configPesosAnual" title="Facturación Anual ($)" />
            </div>
        </div>
        <PicDataTable title="Detalle Facturación ($)" type="pesos" :processed-data="dataPesos" :years="selectedYears" />

        <div class="border-t border-slate-200 my-8"></div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2">
                <BaseChart 
                :config="configKilosMensual" 
                title="Venta vs Metas (KG)" 
                :enable-switch="true"
                />
            </div>
            <div class="lg:col-span-1">
                <BaseChart :config="configKilosAnual" title="Facturación Anual (KG)" />
            </div>
        </div>
        <PicDataTable title="Detalle Volumen (KG)" type="kilos" 
        :processed-data="dataKilos" 
        :years="selectedYears" />

        <div class="border-t border-slate-200 my-8"></div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2">
                <BaseChart 
                :config="configPromedioMensual" 
                title="Precio Promedio Mensual ($/KG)"
                :enable-switch="true" />
            </div>
            <div class="lg:col-span-1">
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
                
                <PicProjectionTable 
                    title="Proyección por Marcas" 
                    dimensionKey="marcas" 
                />
                
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <PicProjectionTable title="Proyección por Gerencia" dimensionKey="gerencia" />
                    <PicProjectionTable 
                        title="Proyección por Zona" 
                        dimensionKey="zona"
                        drill-down-target="articulos" 
                    />
                </div>

                <PicProjectionTable 
                    title="Proyección por Canal" 
                    dimensionKey="canal" 
                    drill-down-target="articulos"
                />
                <PicProjectionTable 
                    title="Proyección por Familias" 
                    dimensionKey="familias" 
                    drill-down-target="articulos"
                />
                
                <PicProjectionTable 
                    title="Proyección por Clientes (Top)" 
                    dimensionKey="clientes" 
                    drill-down-target="articulos"
                    :initial-collapsed="true"
                />
                <PicProjectionTable 
                    title="Proyección por Artículos" 
                    dimensionKey="articulos" 
                    :initial-collapsed="true"
                />
            </div>
        </div>

    </div>
</template>