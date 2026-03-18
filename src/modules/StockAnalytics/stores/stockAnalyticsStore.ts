// src/modules/StockAnalytics/stores/stockAnalyticsStore.ts

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { stockAnalyticsApi } from '../services/stockAnalyticsApi';
import type {
    StockActiveFilters,
    StockFilters,
    WeeklySummaryRecord,
    AverageMetricRecord,
    CurrentInventoryRecord,
    CoverageRecord,
    StockoutsRecord,
} from '../types/stockAnalytics.types';

export const useStockAnalyticsStore = defineStore('stockAnalytics', () => {

    // ─── ESTADO DE FILTROS ────────────────────────────────────────────────────────

    // const activeFilters = ref<StockActiveFilters>({
    //     year: new Date().getFullYear(),
    //     startWeek: 1,
    //     endWeek: 12,
    //     filters: {},
    // });

    function getDefaultWeekRange(): { startWeek: number; endWeek: number } {
        const currentWeek = Math.ceil(
            (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime())
            / (7 * 24 * 60 * 60 * 1000)
        );
        const endWeek = Math.min(currentWeek, 52);
        const startWeek = Math.max(endWeek - 5, 1); // últimas 6 semanas
        return { startWeek, endWeek };
    }

    const activeFilters = ref<StockActiveFilters>({
        year: new Date().getFullYear(),
        ...getDefaultWeekRange(),
        filters: {},
    });

    // Opciones para los comboboxes
    const filterOptions = ref<{
        gerencias: string[];
        marcas: string[];
        skus: string[];
        clients: string[];
    }>({
        gerencias: [],
        marcas: [],
        skus: [],
        clients: [],
    });

    // ─── ESTADO DE DATOS ──────────────────────────────────────────────────────────

    const selloutSummary = ref<WeeklySummaryRecord[]>([]);
    const inventorySummary = ref<WeeklySummaryRecord[]>([]);
    const averageMetrics = ref<AverageMetricRecord[]>([]);
    const currentInventory = ref<CurrentInventoryRecord[]>([]);
    const coverage = ref<CoverageRecord[]>([]);
    const stockouts = ref<StockoutsRecord[]>([]);

    // ─── ESTADO DE CARGA ──────────────────────────────────────────────────────────

    const isLoadingFilters = ref(false);
    const isLoadingData = ref(false);
    const error = ref<string | null>(null);

    // ─── GETTERS ──────────────────────────────────────────────────────────────────

    /** KPI 1: Sellout total acumulado en el rango */
    const totalSelloutKG = computed(() =>
        averageMetrics.value.reduce((acc, r) => acc + r.TotalKG, 0)
    );

    /** KPI 2: Inventario físico total actual */
    const totalCurrentStockKG = computed(() =>
        currentInventory.value.reduce((acc, r) => acc + r.CurrentStockKG, 0)
    );

    /** KPI 3: Cobertura promedio — excluye los 999 (estancados) para no distorsionar */
    const avgCoverageWeeks = computed(() => {
        const valid = coverage.value.filter(r => r.CoverageWeeks !== 999);
        if (!valid.length) return 0;
        return valid.reduce((acc, r) => acc + r.CoverageWeeks, 0) / valid.length;
    });

    /** KPI 4: Total de semanas muertas (oportunidad perdida) */
    const totalZeroSalesWeeks = computed(() =>
        stockouts.value.reduce((acc, r) => acc + r.ZeroSalesWeeks, 0)
    );

    /** Top 20 por ZeroSalesWeeks para la tabla de alertas */
    const top20Stockouts = computed(() =>
        [...stockouts.value]
            .sort((a, b) => b.ZeroSalesWeeks - a.ZeroSalesWeeks)
            .slice(0, 20)
    );

    const weekColumns = computed((): number[] => {
        const first = selloutSummary.value[0];
        if (!first) return [];
        const allWeeks = Object.keys(first)
            .filter(k => !isNaN(Number(k)))
            .map(Number)
            .sort((a, b) => a - b);

        // Filtrar al rango activo, máx 12 semanas
        const { startWeek, endWeek } = activeFilters.value;
        const inRange = allWeeks.filter(w => w >= startWeek && w <= endWeek);
        return inRange.slice(-12);
    });

    /** Columnas semanales para inventario (InvSis) */
    const inventoryWeekColumns = computed((): number[] => {
        const first = inventorySummary.value[0];
        if (!first) return [];
        const allWeeks = Object.keys(first)
            .filter(k => !isNaN(Number(k)))
            .map(Number)
            .sort((a, b) => a - b);

        const { startWeek, endWeek } = activeFilters.value;
        const inRange = allWeeks.filter(w => w >= startWeek && w <= endWeek);
        return inRange.slice(-12);
    });

    /** Registros agrupados por cliente para la tabla colapsable */
    const groupedSummary = computed(() => {
        const map = new Map<string, {
            id_cliente: string;
            skus: typeof selloutSummary.value;
        }>();

        for (const row of selloutSummary.value) {
            if (!map.has(row.id_cliente)) {
                map.set(row.id_cliente, { id_cliente: row.id_cliente, skus: [] });
            }
            map.get(row.id_cliente)!.skus.push(row);
        }

        return Array.from(map.values());
    });

    /** Registros de inventario agrupados por cliente (para la tabla de inventario) */
    const groupedInventorySummary = computed(() => {
        const map = new Map<string, {
            id_cliente: string;
            skus: typeof inventorySummary.value;
        }>();

        for (const row of inventorySummary.value) {
            if (!map.has(row.id_cliente)) {
                map.set(row.id_cliente, { id_cliente: row.id_cliente, skus: [] });
            }
            map.get(row.id_cliente)!.skus.push(row);
        }

        return Array.from(map.values());
    });
    // ─── ACCIONES ─────────────────────────────────────────────────────────────────

    /** Carga las opciones estáticas de los comboboxes al montar la vista */
    async function fetchFilterOptions(): Promise<void> {
        isLoadingFilters.value = true;
        try {
            const [gerenciasRes, marcasRes] = await Promise.all([
                stockAnalyticsApi.getGerencias(),
                stockAnalyticsApi.getMarcas(),
            ]);
            filterOptions.value.gerencias = parseFilterList(gerenciasRes.data);
            filterOptions.value.marcas = parseFilterList(marcasRes.data);
        } catch (e) {
            console.error('[StockAnalytics] Error cargando filtros estáticos:', e);
        } finally {
            isLoadingFilters.value = false;
        }
    }

    /** Busca SKUs por query string usando POST /filters/skus */
    async function searchSKUs(query: string): Promise<void> {
        try {
            const payload: { Marca?: string[]; grupo?: string[]; Categorias?: string[] } = {};
            if (activeFilters.value.filters?.Marca?.length) {
                payload.Marca = activeFilters.value.filters.Marca as string[];
            }
            const { data } = await stockAnalyticsApi.getSKUs(payload);
            const all = parseFilterList(data);
            // Filtro local por el término de búsqueda
            filterOptions.value.skus = query.trim().length >= 2
                ? all.filter(s => s.toLowerCase().includes(query.trim().toLowerCase()))
                : all;
        } catch (e) {
            console.error('[StockAnalytics] Error buscando SKUs:', e);
        }
    }

    /** Busca clientes por query string para el combobox async */
    async function searchClients(query: string): Promise<void> {
        if (query.length < 2) return;
        try {
            const { data } = await stockAnalyticsApi.searchClients(query);
            filterOptions.value.clients = parseFilterList(data);
        } catch (e) {
            console.error('[StockAnalytics] Error buscando clientes:', e);
        }
    }

    /** Dispara los 5 endpoints en paralelo con los filtros activos */
    async function fetchAll(): Promise<void> {
        isLoadingData.value = true;
        error.value = null;

        const { year, startWeek, endWeek, filters } = activeFilters.value;

        const results = await Promise.allSettled([
            // [0] Sellout semanal
            stockAnalyticsApi.getWeeklySummary({ transaction: 'VtaOut', year, filters }),
            // [1] Inventario semanal
            stockAnalyticsApi.getWeeklySummary({ transaction: 'InvSis', year, filters }),
            // [2] Métricas promedio (sellout)
            stockAnalyticsApi.getAverageMetric({ transaction: 'VtaOut', year, startWeek, endWeek, filters }),
            // [3] Inventario actual
            stockAnalyticsApi.getCurrentInventory({ year, endWeek, filters }),
            // [4] Cobertura
            stockAnalyticsApi.getCoverage({ year, startWeek, endWeek, filters }),
            // [5] Stockouts
            stockAnalyticsApi.getStockouts({ year, startWeek, endWeek, filters }),
        ]);

        // Commit selectivo — un endpoint caído no tumba el dashboard
        if (results[0].status === 'fulfilled') selloutSummary.value = results[0].value.data.data ?? [];
        if (results[1].status === 'fulfilled') inventorySummary.value = results[1].value.data.data ?? [];
        if (results[2].status === 'fulfilled') averageMetrics.value = results[2].value.data.data ?? [];
        if (results[3].status === 'fulfilled') currentInventory.value = results[3].value.data.data ?? [];
        if (results[4].status === 'fulfilled') coverage.value = results[4].value.data.data ?? [];
        if (results[5].status === 'fulfilled') stockouts.value = results[5].value.data.data ?? [];

        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) error.value = `${failed} endpoint(s) fallaron. Datos parciales.`;

        isLoadingData.value = false;
    }

    /** Actualiza los filtros y vuelve a disparar fetchAll */
    function applyFilters(newFilters: Partial<StockActiveFilters>): void {
        activeFilters.value = { ...activeFilters.value, ...newFilters };
        fetchAll();
    }

    /** Resetea filtros a defaults */
    // function resetFilters(): void {
    //     activeFilters.value = {
    //         year: new Date().getFullYear(),
    //         startWeek: 1,
    //         endWeek: 12,
    //         filters: {},
    //     };   
    //     fetchAll();
    // }
    function resetFilters(): void {
        activeFilters.value = {
            year: new Date().getFullYear(),
            ...getDefaultWeekRange(),
            filters: {},
        };
        fetchAll();
    }

    // ─── HELPERS PRIVADOS ─────────────────────────────────────────────────────────

    function parseFilterList(data: unknown): string[] {
        if (Array.isArray(data)) return data as string[];
        const d = data as { data?: string[] };
        if (d?.data && Array.isArray(d.data)) return d.data;
        return [];
    }

    // ─── EXPOSE ───────────────────────────────────────────────────────────────────

    return {
        // state
        activeFilters,
        filterOptions,
        selloutSummary,
        inventorySummary,
        averageMetrics,
        currentInventory,
        coverage,
        stockouts,
        isLoadingFilters,
        isLoadingData,
        error,
        // getters
        totalSelloutKG,
        totalCurrentStockKG,
        avgCoverageWeeks,
        totalZeroSalesWeeks,
        top20Stockouts,
        weekColumns,
        inventoryWeekColumns,
        groupedSummary,
        groupedInventorySummary,
        // actions
        fetchFilterOptions,
        searchSKUs,
        searchClients,
        fetchAll,
        applyFilters,
        resetFilters,

    };
});