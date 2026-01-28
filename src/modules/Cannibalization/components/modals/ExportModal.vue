<script setup lang="ts">
import { ref, computed } from 'vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import { useCannibalizationStore } from '../../stores/cannibalizationStore';
import { useCannibalizationExport } from '../../composables/useCannibalizationExport';
import PdfReportTemplate from '@/modules/Cannibalization/reports/PdfReportTemplate.vue';
import type { DetectedCannibalization } from '@/modules/Cannibalization/types/cannibalizationTypes';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(['update:modelValue']);
const store = useCannibalizationStore();
const { downloadCSV, generatePDF, isExporting } = useCannibalizationExport();

// --- CONFIGURACIÓN DE EXPORTACIÓN ---
const exportMode = ref<'standard' | 'custom'>('standard');
const customSearch = ref('');
const selectedCustomIds = ref<Set<string>>(new Set());
const includeCustomTable = ref(true); 

const close = () => emit('update:modelValue', false);

// --- 1. HIDRATACIÓN DE DATOS (VINCULAR VECTORES PARA GRÁFICOS) ---
// Cruzamos los casos detectados con la data cruda para obtener los arrays de venta mensual
const hydrateCases = (cases: DetectedCannibalization[]) => {
    return cases.map(item => {
        let vVec: number[] = new Array(12).fill(0);
        let cVec: number[] = new Array(12).fill(0);

        // Buscamos los vectores originales en el store
        const client = store.rawData.find(c => c.name === item.clientName);
        if (client) {
            const family = client.families.find(f => f.name === item.family);
            if (family) {
                const victim = family.skus.find(s => s.name === item.victimSku);
                const cannibal = family.skus.find(s => s.name === item.cannibalSku);
                if (victim) vVec = victim.salesVector;
                if (cannibal) cVec = cannibal.salesVector;
            }
        }
        return { ...item, victimVector: vVec, cannibalVector: cVec };
    });
};

// --- 2. LÓGICA DE SELECCIÓN DE DATOS ---
const reportPayload = computed(() => {
    let visualItems: DetectedCannibalization[] = [];
    let tableItems: DetectedCannibalization[] = [];

    if (exportMode.value === 'standard') {
        // === MODO ESTÁNDAR (Lógica de Negocio) ===
        // 1. Filtramos SOLO los casos con impacto negativo (Ineficientes)
        const negativeCases = store.detectedCases.filter(c => c.netBalance < 0);
        
        // 2. Visual: Top 5 de mayor impacto (ordenados por Score)
        // Nota: store.detectedCases ya viene ordenado por impactScore desde el engine, pero aseguramos.
        visualItems = [...negativeCases]
            .sort((a,b) => b.impactScore - a.impactScore)
            .slice(0, 5);

        // 3. Tabla: TODOS los casos negativos (para auditoría completa)
        tableItems = negativeCases;

    } else {
        // === MODO PERSONALIZADO ===
        // Visual: Lo que el usuario seleccionó manualmente
        visualItems = store.detectedCases.filter(c => selectedCustomIds.value.has(c.id));
        
        // Tabla: Si el usuario activó el check, mostramos los datos de su selección
        if (includeCustomTable.value) {
            tableItems = visualItems;
        }
    }

    return {
        visual: hydrateCases(visualItems),
        table: hydrateCases(tableItems)
    };
});

// --- UI HELPERS ---
const filteredCustomOptions = computed(() => {
    const term = customSearch.value.toLowerCase();
    // Filtramos sobre store.detectedCases para que el usuario elija de lo que ya analizó
    return store.detectedCases.filter(c => 
        !term || 
        c.clientName.toLowerCase().includes(term) || 
        c.victimSku.toLowerCase().includes(term)
    );
});

// Resumen Global para el Header del PDF
const summaryStats = computed(() => {
    const data = store.detectedCases;
    if (data.length === 0) return null;
    const loss = data.reduce((a, c) => a + c.volumeLost, 0);
    const gain = data.reduce((a, c) => a + c.volumeGained, 0);
    return {
        netBalance: gain - loss,
        substitutionRate: loss > 0 ? (gain / loss) * 100 : 0,
        redCases: data.filter(c => c.netBalance < 0).length
    };
});


const currentFilters = computed(() => {
    // Intentamos recuperar el nombre de la familia de varios posibles lugares para asegurar que no salga "Todas" erróneamente
    const rawFamily = store.lastFetchParams?.filters?.family 
                   || store.lastFetchParams?.filters?.grupo 
                   || store.lastFetchParams?.family; // Por si está en el nivel raíz
                   
    return {
        year: store.lastFetchParams?.year || '2025',
        // Si rawFamily es string vacío o null, ponemos 'Todas', si no, el valor real
        family: rawFamily ? rawFamily : 'Todas',
        rules: store.rules 
    };
});

// --- ACCIONES ---
const toggleCustomSelection = (id: string) => {
    if (selectedCustomIds.value.has(id)) {
        selectedCustomIds.value.delete(id);
    } else {
        if (selectedCustomIds.value.size >= 10) return; // Límite duro de 10 gráficos
        selectedCustomIds.value.add(id);
    }
};

const handlePdf = async () => {
    if (exportMode.value === 'custom' && selectedCustomIds.value.size === 0) {
        // Pequeña validación UX
        return; 
    }
    // Enviamos el payload ya procesado (visual + table separados)
    await generatePDF(reportPayload.value, 'mixed'); 
    close();
};

const handleCsv = () => { downloadCSV(store.detectedCases); close(); };
</script>

<template>
    <ModalDialog :model-value="modelValue" title="Generar Reporte de Resultados" size="lg" @close="close">
        
        <div style="position: fixed; left: -9999px; top: 0;">
            <PdfReportTemplate 
                :visual-data="reportPayload.visual"
                :table-data="reportPayload.table"
                :filters="currentFilters"
                :summary="summaryStats"
            />
        </div>

        <div class="p-2 h-[500px] flex flex-col">
            
            <div class="flex gap-2 p-1 bg-slate-100 rounded-lg mb-6 shrink-0">
                <button 
                    @click="exportMode = 'standard'"
                    class="flex-1 py-2.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2"
                    :class="exportMode === 'standard' ? 'bg-white text-brand-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'"
                >
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Reporte Estándar
                </button>
                <button 
                    @click="exportMode = 'custom'"
                    class="flex-1 py-2.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2"
                    :class="exportMode === 'custom' ? 'bg-white text-brand-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'"
                >
                    <i class="fa-solid fa-hand-pointer"></i> Selección Manual
                </button>
            </div>

            <div v-if="exportMode === 'standard'" class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-xl border border-slate-200 border-dashed animate-in fade-in duration-300">
                
                <div class="mb-6 relative">
                    <div class="absolute inset-0 bg-brand-200 rounded-full blur-xl opacity-20"></div>
                    <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 relative z-10 mx-auto">
                        <i class="fa-solid fa-file-invoice-dollar text-4xl text-brand-500"></i>
                    </div>
                </div>

                <h3 class="font-bold text-slate-800 text-lg mb-2">Resumen Ejecutivo Automático</h3>
                <p class="text-xs text-slate-500 max-w-[280px] mx-auto mb-8 leading-relaxed">
                    Genera un documento profesional optimizado para la toma de decisiones, basado en los filtros actuales.
                </p>

                <div class="w-full max-w-sm bg-white rounded-lg border border-slate-200 shadow-sm divide-y divide-slate-100 text-left">
                    <div class="p-4 flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <i class="fa-solid fa-chart-line text-lg"></i>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-slate-700">Top 5 Casos Críticos</p>
                            <p class="text-[10px] text-slate-400">Gráficos detallados de sustitución.</p>
                        </div>
                    </div>
                    <div class="p-4 flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                            <i class="fa-solid fa-table-list text-lg"></i>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-slate-700">Anexo: Tabla de Ineficiencias</p>
                            <p class="text-[10px] text-slate-400">Listado completo de casos con pérdida neta.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else class="flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
                
                <div class="flex justify-between items-center mb-3 px-1">
                    <div class="relative w-1/2">
                        <i class="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                        <input 
                            v-model="customSearch" 
                            type="text" 
                            placeholder="Buscar caso..." 
                            class="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-500 outline-none bg-slate-50 focus:bg-white transition-colors"
                        >
                    </div>
                    <div class="text-[10px] font-bold" :class="selectedCustomIds.size >= 10 ? 'text-amber-600' : 'text-slate-500'">
                        <span class="bg-slate-100 px-2 py-1 rounded">{{ selectedCustomIds.size }} / 10 Gráficos</span>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white relative custom-scrollbar">
                    <div v-if="filteredCustomOptions.length === 0" class="p-8 text-center text-slate-400 text-xs">
                        No hay coincidencias.
                    </div>

                    <div 
                        v-for="item in filteredCustomOptions" 
                        :key="item.id" 
                        @click="toggleCustomSelection(item.id)"
                        class="flex items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer group transition-colors"
                        :class="{'bg-indigo-50/50': selectedCustomIds.has(item.id)}"
                    >
                        <div 
                            class="w-4 h-4 rounded border flex items-center justify-center mr-3 transition-all shrink-0"
                            :class="selectedCustomIds.has(item.id) 
                                ? 'bg-indigo-500 border-indigo-500 shadow-sm' 
                                : 'border-slate-300 bg-white group-hover:border-indigo-400'"
                        >
                            <i v-if="selectedCustomIds.has(item.id)" class="fa-solid fa-check text-white text-[9px]"></i>
                        </div>

                        <div class="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
                            <div class="col-span-6">
                                <div class="font-bold text-xs text-slate-700 truncate" :title="item.clientName">{{ item.clientName }}</div>
                                <div class="text-[9px] text-slate-400 flex items-center gap-1">
                                    <span class="bg-slate-100 px-1 rounded">{{ item.matriz }}</span>
                                    <span>{{ item.route }}</span>
                                </div>
                            </div>
                            <div class="col-span-4 flex flex-col text-[9px]">
                                <span class="text-rose-600 truncate" :title="item.victimSku"><i class="fa-solid fa-arrow-down mr-0.5"></i> {{ item.victimSku }}</span>
                                <span class="text-emerald-600 truncate" :title="item.cannibalSku"><i class="fa-solid fa-arrow-up mr-0.5"></i> {{ item.cannibalSku }}</span>
                            </div>
                            <div class="col-span-2 text-right">
                                <span 
                                    class="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                                    :class="item.netBalance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'"
                                >
                                    {{ item.netBalance > 0 ? '+' : '' }}{{ item.netBalance.toFixed(0) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-3 shrink-0">
                    <input type="checkbox" id="incTable" v-model="includeCustomTable" class="w-4 h-4 accent-brand-600 cursor-pointer rounded">
                    <label for="incTable" class="text-xs text-slate-600 cursor-pointer select-none font-medium">
                        Incluir tabla de datos al final del reporte
                    </label>
                </div>
            </div>

            <div class="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 shrink-0">
                <button 
                    @click="handleCsv" 
                    class="flex items-center justify-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 py-2.5 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                    <i class="fa-solid fa-file-csv text-emerald-600"></i> Exportar CSV
                </button>
                
                <button 
                    @click="handlePdf" 
                    :disabled="isExporting || (exportMode === 'custom' && selectedCustomIds.size === 0)"
                    class="flex items-center justify-center gap-2 text-xs font-bold text-white bg-brand-600 py-2.5 rounded-lg hover:bg-brand-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    <i v-if="isExporting" class="fa-solid fa-circle-notch fa-spin"></i>
                    <span v-else><i class="fa-solid fa-file-pdf"></i> Generar Reporte</span>
                </button>
            </div>

        </div>
    </ModalDialog>
</template>