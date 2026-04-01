<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { usePicFilterStore } from '../../stores/picFilterStore';
import { picApi } from '../../services/picApi'; 
import { formatNumber } from '../../utils/formatters';

const props = defineProps<{
    title: string;
    dimensionKey: string; // La dimensión de ESTA tabla (ej: 'familias')
    initialCollapsed?: boolean;
    // Si no se pasa esta prop, la tabla no será interactiva (caso Marcas/Gerencia)
    drillDownTarget?: string; 
}>();

const store = usePicFilterStore();
const isCollapsed = ref(props.initialCollapsed || false);

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

const colorClass = (val: number, isPercent = false) => {
    if (val === 0) return 'text-slate-400';
    if (isPercent && val >= 100) return 'text-emerald-700 font-bold';
    if (isPercent) return val >= 0 ? 'text-emerald-700' : 'text-red-600';
    return val >= 0 ? 'text-emerald-700' : 'text-red-600';
};
</script>

<template>
    <div 
        class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full transition-all duration-300"
        :data-html2canvas-ignore="tableData.length === 0 ? 'true' : undefined"
    >
        
        <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
            <h3 class="font-bold text-slate-700 text-xs uppercase tracking-wide flex items-center gap-2">
                <i class="fa-solid fa-chart-gantt text-slate-400"></i>
                {{ title }}
            </h3>
            
            <button v-if="tableData.length > 0" @click="isCollapsed = !isCollapsed" class="text-[10px] uppercase font-bold text-slate-400 hover:text-brand-600">
                {{ isCollapsed ? 'Mostrar' : 'Ocultar' }}
            </button>
        </div>

        <div v-if="tableData.length === 0 && !isLoading" class="p-6 flex flex-col items-center justify-center bg-slate-50/50 min-h-[150px]">
            <p class="text-xs text-slate-500 mb-3">Análisis disponible bajo demanda</p>
            <button 
                @click="handleLoad"
                class="bg-white border border-slate-300 hover:border-brand-400 hover:text-brand-600 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2"
            >
                <i class="fa-solid fa-bolt"></i> Generar Tabla
            </button>
        </div>

        <div v-else-if="isLoading" class="p-8 text-center text-slate-500 min-h-[150px] flex items-center justify-center">
            <div class="flex flex-col items-center gap-2">
                <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-500"></i>
                <span class="text-xs font-medium">Procesando datos...</span>
            </div>
        </div>

        <div v-else-if="!isCollapsed" class="overflow-x-auto custom-scrollbar animate-fade-in">
            <table class="w-full text-xs text-left border-collapse whitespace-nowrap">
                <thead class="bg-slate-800 text-white font-semibold uppercase sticky top-0 z-10">
                    <tr>
                        <th class="px-3 py-2 text-left bg-slate-900 border-r border-slate-700 min-w-[180px] sticky left-0 z-20">
                            Concepto
                        </th>
                        <th v-for="y in years" :key="y" class="px-3 py-2 text-right">Venta {{ y }}</th>
                        <th class="px-3 py-2 text-right bg-slate-700">Meta {{ currentYear }}</th>
                        <th class="px-3 py-2 text-right">Dif (Año)</th>
                        <th class="px-3 py-2 text-right">Dif (Meta)</th>
                        <th class="px-3 py-2 text-right">Crec %</th>
                        <th class="px-3 py-2 text-right">Cumpl %</th>
                        <th class="px-3 py-2 text-right bg-slate-900/50">Part %</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <template v-for="(row, idx) in processedRows" :key="row.Dimension">
                        
                        <tr 
                            class="transition-colors group border-l-4 border-transparent"
                            :class="[
                                drillDownTarget ? 'cursor-pointer hover:bg-yellow-50' : 'hover:bg-slate-50',
                                expandedRows[row.Dimension] ? 'bg-slate-50 border-l-brand-500' : ''
                            ]"
                            @click="toggleRow(row)"
                        >
                            <td class="px-3 py-2 font-bold text-slate-700 sticky left-0 bg-inherit border-r border-slate-100 truncate max-w-[200px]" :title="row.Dimension">
                                <div class="flex items-center gap-2">
                                    <i v-if="drillDownTarget" 
                                       class="fa-solid text-[10px] text-slate-400 transition-transform duration-200"
                                       :class="expandedRows[row.Dimension] || loadingRows[row.Dimension] ? 'fa-chevron-down' : 'fa-chevron-right'">
                                    </i>
                                    {{ row.Dimension }}
                                </div>
                            </td>

                            <td v-for="y in years" :key="y" class="px-3 py-2 text-right text-slate-600 font-mono">{{ formatNumber(row[`Venta_${y}`]) }}</td>
                            <td class="px-3 py-2 text-right text-emerald-700 font-mono bg-emerald-50/30">{{ formatNumber(row.meta) }}</td>
                            <td class="px-3 py-2 text-right font-mono" :class="colorClass(row.difAnual)">{{ formatNumber(row.difAnual) }}</td>
                            <td class="px-3 py-2 text-right font-mono" :class="colorClass(row.difMeta)">{{ formatNumber(row.difMeta) }}</td>
                            
                            <td class="px-3 py-2 text-right font-bold font-mono" :class="colorClass(row.crec)">{{ row.crec.toFixed(1) }}%</td>
                            <td class="px-3 py-2 text-right font-bold font-mono" :class="colorClass(row.varMeta, true)">{{ row.varMeta.toFixed(1) }}%</td>
                            <td class="px-3 py-2 text-right text-slate-800 font-bold bg-slate-50 font-mono">{{ row.share.toFixed(1) }}%</td>
                        </tr>

                        <tr v-if="loadingRows[row.Dimension]">
                            <td :colspan="8 + years.length" class="bg-slate-50 p-2 text-center text-slate-400 text-[10px]">
                                <i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Cargando detalle...
                            </td>
                        </tr>

                        <template v-if="expandedRows[row.Dimension]">
                            <tr v-for="child in getChildRows(row.Dimension)" :key="child.Dimension" class="bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors text-[11px] text-slate-600 shadow-inner group">
                                <td class="px-3 py-1.5 font-medium truncate max-w-[200px] text-slate-500 sticky left-0 bg-slate-50 group-hover:bg-slate-100 border-r border-slate-100 pl-8" :title="child.Dimension">
                                    {{ child.Dimension }}
                                </td>
                                
                                <td v-for="y in years" :key="y" class="px-3 py-1.5 text-right font-mono text-slate-500">
                                    {{ formatNumber(child[`Venta_${y}`]) }}
                                </td>
                                <td class="px-3 py-1.5 text-right text-emerald-700/70 font-mono">{{ formatNumber(child.meta) }}</td>
                                
                                <td class="px-3 py-1.5 text-right font-mono" :class="colorClass(child.difAnual)">{{ formatNumber(child.difAnual) }}</td>
                                <td class="px-3 py-1.5 text-right font-mono" :class="colorClass(child.difMeta)">{{ formatNumber(child.difMeta) }}</td>
                                <td class="px-3 py-1.5 text-right font-mono" :class="colorClass(child.crec)">{{ child.crec.toFixed(1) }}%</td>
                                <td class="px-3 py-1.5 text-right font-mono" :class="colorClass(child.varMeta, true)">{{ child.varMeta.toFixed(1) }}%</td>
                                
                                <td class="px-3 py-1.5 text-right font-bold text-brand-700 bg-brand-50/20 font-mono">
                                    {{ child.share.toFixed(1) }}%
                                </td>
                            </tr>
                        </template>

                    </template>
                </tbody>
                <tfoot v-if="footer" class="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                    <tr>
                        <td class="px-3 py-2 sticky left-0 bg-slate-100 border-r border-slate-200">TOTAL</td>
                        <td v-for="y in years" :key="y" class="px-3 py-2 text-right font-mono">{{ formatNumber(footer[`Venta_${y}`]) }}</td>
                        <td class="px-3 py-2 text-right font-mono text-emerald-800">{{ formatNumber(footer.meta) }}</td>
                        <td class="px-3 py-2 text-right font-mono" :class="colorClass(footer.difAnual)">{{ formatNumber(footer.difAnual) }}</td>
                        <td class="px-3 py-2 text-right font-mono" :class="colorClass(footer.difMeta)">{{ formatNumber(footer.difMeta) }}</td>
                        <td class="px-3 py-2 text-right font-mono"  :class="colorClass(footer.crec)">{{ footer.crec.toFixed(1) }}%</td>
                        <td class="px-3 py-2 text-right font-mono" :class="colorClass(footer.varMeta, true)">{{ footer.varMeta.toFixed(1) }}%</td>
                        <td class="px-3 py-2 text-right bg-slate-200 font-mono">100%</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.animate-fade-in { animation: fadeIn 0.3s ease-in; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>