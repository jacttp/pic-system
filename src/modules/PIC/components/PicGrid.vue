<script setup lang="ts">
import { computed } from 'vue';
import { usePicFilterStore } from '../stores/picFilterStore';
import { processChartData, getChartConfig, CHART_COLORS, CHART_COLORS_GREEN, MONTH_NAMES } from '../utils/picUtils';
import BaseChart from './charts/BaseChart.vue';
import PicDataTable from './tables/PicDataTable.vue'; // <--- Importar

const store = usePicFilterStore();

// Años seleccionados (para etiquetas y series)
const selectedYears = computed(() => store.selected.Anio.sort());

// --- PROCESAMIENTO DE DATOS ---

// 1. Ventas Pesos ($)
const dataPesos = computed(() => processChartData(store.reportData, selectedYears.value, 'pesos'));
const configPesos = computed(() => {
    const datasets = selectedYears.value.map((year, i) => ({
        label: year,
        data: dataPesos.value.map(d => d[year]),
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
        borderRadius: 4
    }));
    return getChartConfig(MONTH_NAMES, datasets, 'bar');
});

// 2. Ventas Kilos (KG)
const dataKilos = computed(() => processChartData(store.reportData, selectedYears.value, 'kilos'));
const configKilos = computed(() => {
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

// 3. Precio Promedio
const dataPromedio = computed(() => processChartData(store.reportData, selectedYears.value, 'promedio'));
const configPromedio = computed(() => {
    const datasets = selectedYears.value.map((year, i) => ({
        label: `Promedio ${year}`,
        data: dataPromedio.value.map(d => d[year]),
        borderColor: CHART_COLORS_GREEN[i % CHART_COLORS_GREEN.length],
        backgroundColor: CHART_COLORS_GREEN[i % CHART_COLORS_GREEN.length],
        type: 'line' as any,
        tension: 0.3,
        pointRadius: 3
    }));
    return getChartConfig(MONTH_NAMES, datasets, 'line');
});

</script>

<template>
    <div class="space-y-8 pb-20">
        
        <div class="grid grid-cols-1 gap-6">
            <BaseChart :config="configPesos" title="Facturación Mensual ($)" />
            <PicDataTable 
                title="Detalle Facturación ($)" 
                type="pesos" 
                :processed-data="dataPesos" 
                :years="selectedYears"
            />
        </div>

        <div class="border-t border-slate-200"></div>

        <div class="grid grid-cols-1 gap-6">
            <BaseChart :config="configKilos" title="Venta vs Metas (KG)" />
            <PicDataTable 
                title="Detalle Volumen (KG)" 
                type="kilos" 
                :processed-data="dataKilos" 
                :years="selectedYears"
            />
        </div>

        <div class="border-t border-slate-200"></div>

        <div class="grid grid-cols-1 gap-6">
            <BaseChart :config="configPromedio" title="Precio Promedio Histórico ($/KG)" />
            <PicDataTable 
                title="Detalle Precio Promedio" 
                type="promedio" 
                :processed-data="dataPromedio" 
                :years="selectedYears"
            />
        </div>

    </div>
</template>