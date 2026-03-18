<!-- src/modules/StockAnalytics/views/StockAnalyticsView.vue -->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useStockAnalyticsStore } from '../stores/stockAnalyticsStore';
import StockFilterBar from '../components/StockFilterBar.vue';
import StockKpiStrip from '../components/StockKpiStrip.vue';
import StockSelloutInventoryChart from '../components/StockSelloutInventoryChart.vue';
import StockCoverageScatterChart from '../components/StockCoverageScatterChart.vue';
import StockWeeklySummaryTable from '../components/StockWeeklySummaryTable.vue';
import StockInventoryWeeklyTable from '../components/StockInventoryWeeklyTable.vue';
import StockEarlyAlertsTable from '../components/StockEarlyAlertsTable.vue';

const store = useStockAnalyticsStore();

onMounted(async () => {
    await store.fetchFilterOptions();
    await store.fetchAll();
});
</script>

<template>
    <div class="w-full flex flex-col">

        <!-- FilterBar: fuera del padding, de borde a borde -->
        <StockFilterBar />

        <!-- Contenido del dashboard con padding y separación para el botón pill -->
        <div class="flex flex-col gap-5 p-5 pt-10">

            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <i class="fa-solid fa-boxes-stacked text-brand-500"></i>
                        Stock Analytics
                    </h1>
                    <p class="text-xs text-slate-400 mt-0.5">
                        Inventario · Sellout · Cobertura · Quiebres
                    </p>
                </div>
                <div v-if="store.error"
                    class="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg"
                >
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    {{ store.error }}
                </div>
            </div>

            <StockKpiStrip />

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <StockSelloutInventoryChart />
                <StockCoverageScatterChart />
            </div>

            <StockWeeklySummaryTable />
            <StockInventoryWeeklyTable />
            <StockEarlyAlertsTable />

        </div>
    </div>
</template>