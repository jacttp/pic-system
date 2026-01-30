<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useCannibalizationStore } from '../stores/cannibalizationStore';
import AnalysisConfigPanel from '../../Shared/components/config/AnalysisConfigPanel.vue';
import SuspectsTable from '../../Shared/components/tables/SuspectsTable.vue';
import SubstitutionChart from '../components/charts/SubstitutionChart.vue';
import GeneralEvolutionChart from '../components/charts/GeneralEvolutionChart.vue';
import type { DetectedCannibalization } from '../types/cannibalizationTypes';
import AnalysisSummaryCard from '../components/cards/AnalysisSummaryCard.vue';
import ExportModal from '../components/modals/ExportModal.vue'; 
// import GeneralEvolutionChart from '../components/charts/GeneralEvolutionChart.vue';
import CoverageStatsCard from '../components/cards/CoverageStatsCard.vue';

const store = useCannibalizationStore();

// --- ESTADO LOCAL ---
const selectedCase = ref<DetectedCannibalization | null>(null);
const selectedVictimVector = ref<number[]>([]);
const selectedCannibalVector = ref<number[]>([]);

// Filtros de API
const selectedYear = ref('2025');
const selectedFamily = ref('');

// Estado visual (replicando PIC)
const isCollapsed = ref(true); 
const overflowVisible = ref(true);

// Helper para formato visual de porcentaje
const toPct = (val: number) => `${(val * 100).toFixed(0)}%`;

// --- ACCIONES ---

const onCaseSelected = (item: DetectedCannibalization) => {
    selectedCase.value = item;
    
    // Buscar los datos crudos para el gráfico
    const client = store.rawData.find(c => c.name === item.clientName);
    if (client) {
        const family = client.families.find(f => f.name === item.family);
        if (family) {
            const victim = family.skus.find(s => s.name === item.victimSku);
            const cannibal = family.skus.find(s => s.name === item.cannibalSku);
            
            if (victim && cannibal) {
                selectedVictimVector.value = victim.salesVector;
                selectedCannibalVector.value = cannibal.salesVector;
            }
        }
    }
};

const loadData = () => {
    selectedCase.value = null;
    const filters: any = {};
    
    if (selectedFamily.value) {
        filters.grupo = selectedFamily.value;
    }
    
    // Fetch Data trae los datos y ejecuta analyze() internamente
    store.fetchData(selectedYear.value, filters);
};

// --- AGREGACIÓN PARA GRÁFICO GENERAL ---
const generalEvolutionData = computed(() => {
    // 12 meses
    const totalVictim = new Array(12).fill(0);
    const totalCannibal = new Array(12).fill(0);
    const clientSets = Array.from({ length: 12 }, () => new Set<string>());

    if (store.detectedCases.length === 0) {
        return { victim: totalVictim, cannibal: totalCannibal, clients: new Array(12).fill(0) };
    }

    // Iteramos sobre los casos detectados para sumar sus vectores
    store.detectedCases.forEach(item => {
        // Buscar vectores en rawData
        const client = store.rawData.find(c => c.name === item.clientName);
        if (!client) return;
        
        const family = client.families.find(f => f.name === item.family);
        if (!family) return;

        const victim = family.skus.find(s => s.name === item.victimSku);
        const cannibal = family.skus.find(s => s.name === item.cannibalSku);

        if (victim && cannibal) {
            for (let i = 0; i < 12; i++) {
                const vVol = (victim.salesVector[i] || 0);
                const cVol = (cannibal.salesVector[i] || 0);
                
                // Sumar a los acumuladores respectivos
                totalVictim[i] += vVol;
                totalCannibal[i] += cVol;

                // Si hubo venta (actividad) en este mes para este caso, contamos al cliente
                // Usamos el ID del cliente (Matriz) para contar únicos
                if ((vVol + cVol) > 0) {
                    clientSets[i].add(client.matriz);
                }
            }
        }
    });

    const totalClients = clientSets.map(s => s.size);

    return {
        victim: totalVictim,
        cannibal: totalCannibal,
        clients: totalClients
    };
});

const showExportModal = ref(false);

const handleExport = () => {
    showExportModal.value = true;
};
// --- WATCHERS (PIC STYLE) ---
watch(isCollapsed, (newVal) => {
    if (newVal) {
        overflowVisible.value = false; 
    } else {
        setTimeout(() => {
            overflowVisible.value = true; 
        }, 350); 
    }
});

// --- CICLO DE VIDA ---

onMounted(async () => {
    // Solo cargamos los catálogos (Años y Familias)
    // Asumimos que loadMetadata existe en tu store completo (aunque no aparecía en el snippet provisto)
    if (store.loadMetadata) {
        await store.loadMetadata();
    }
    
    // Seleccionar año más reciente por defecto visualmente, pero SIN cargar datos
    if (store.availableYears && store.availableYears.length > 0) {
        if (!store.availableYears.includes(selectedYear.value)) {
            selectedYear.value = store.availableYears[0];
        }
    }

    // ELIMINADO: loadData(); 
    // Ahora el usuario debe hacer clic explícitamente en "ANALIZAR"
});


</script>

<template>
    <div class="h-full flex flex-col p-6 gap-6 bg-slate-50 overflow-hidden">
        
        <!-- HEADER: PANEL FILTROS (Estilo PIC) -->
        <div class="relative z-40 bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 ease-in-out mb-2">
            
            <div 
                class="transition-all duration-300 ease-in-out"
                :class="[
                    isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[800px] opacity-100',
                    overflowVisible && !isCollapsed ? 'overflow-visible' : 'overflow-hidden'
                ]"
            >
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                        <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                            <div class="p-1.5 bg-brand-50 rounded text-brand-600">
                                <i class="fa-solid fa-sliders"></i>
                            </div>
                            Configuración de Análisis
                        </h2>
                        <div class="flex gap-3">
                            <button 
                                @click="loadData" 
                                :disabled="store.isLoading"
                                class="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
                            >
                                <i v-if="store.isLoading" class="fa-solid fa-circle-notch fa-spin"></i>
                                <span v-else class="flex items-center gap-2">
                                    <i class="fa-solid fa-rotate"></i> Actualizar
                                </span>
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                        
                        <!-- GRUPO 1: ORIGEN DE DATOS -->
                        <div class="space-y-4">
                            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                                <i class="fa-solid fa-database mr-1"></i> Origen de Datos
                            </h3>
                            
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Año Fiscal</label>
                                <div class="relative">
                                    <select v-model="selectedYear" class="w-full text-xs font-medium border border-slate-200 rounded-lg pl-2 pr-6 h-[38px] bg-white appearance-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none cursor-pointer hover:border-slate-300">
                                        <option v-for="year in store.availableYears" :key="year" :value="year">{{ year }}</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Familia</label>
                                <div class="relative">
                                    <select v-model="selectedFamily" class="w-full text-xs font-medium border border-slate-200 rounded-lg pl-2 pr-6 h-[38px] bg-white appearance-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none cursor-pointer hover:border-slate-300">
                                        <option value="">-- Todas --</option>
                                        <option v-for="fam in store.availableFamilies" :key="fam" :value="fam">{{ fam }}</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                                </div>
                            </div>
                        </div>

                        <!-- GRUPO 2: PARÁMETROS -->
                        <div class="space-y-4">
                            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                                <i class="fa-solid fa-gears mr-1"></i> Parámetros
                            </h3>
                            
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Mes Corte</label>
                                <div class="relative">
                                    <select v-model.number="store.rules.splitMonth" @change="store.analyze()" class="w-full text-xs font-medium border border-slate-200 rounded-lg pl-2 pr-6 h-[38px] bg-white appearance-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none cursor-pointer hover:border-slate-300">
                                        <option :value="1">Enero</option>
                                        <option :value="6">Junio</option>
                                        <option :value="7">Julio</option>
                                        <option :value="8">Agosto</option>
                                        <option :value="9">Septiembre</option>
                                        <option :value="10">Octubre</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                                </div>
                            </div>

                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Vol. Min (Kg)</label>
                                <input 
                                    type="number" 
                                    v-model.number="store.rules.minVolume"
                                    @input="store.analyze()"
                                    class="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 h-[38px] bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none transition-shadow"
                                />
                            </div>
                        </div>

                        <!-- GRUPO 3: SENSIBILIDAD -->
                        <div class="space-y-4">
                            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                                <i class="fa-solid fa-chart-line mr-1"></i> Sensibilidad
                            </h3>
                            
                            <div class="space-y-4 pt-2">
                                <div>
                                    <div class="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-2">
                                        <span>Umbral Caída</span>
                                        <span class="text-rose-600 bg-rose-50 px-1.5 rounded">{{ toPct(store.rules.dropThreshold) }}</span>
                                    </div>
                                    <input 
                                        type="range" min="0.1" max="0.9" step="0.05" 
                                        v-model.number="store.rules.dropThreshold"
                                        @change="store.analyze()"
                                        class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-600 transition-colors"
                                    />
                                </div>
                                <div>
                                     <div class="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-2">
                                        <span>Umbral Subida</span>
                                        <span class="text-emerald-600 bg-emerald-50 px-1.5 rounded">{{ toPct(store.rules.growthThreshold) }}</span>
                                    </div>
                                    <input 
                                        type="range" min="0.1" max="2.0" step="0.1" 
                                        v-model.number="store.rules.growthThreshold"
                                        @change="store.analyze()"
                                        class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-600 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- BUTTON TOGGLE (Colgando) -->
            <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full z-50">
                <button 
                    @click="isCollapsed = !isCollapsed"
                    class="flex items-center gap-2 px-6 py-1.5 rounded-b-xl shadow-md border-x border-b border-t-0 transition-all duration-300 group"
                    :class="[
                        isCollapsed 
                            ? 'bg-brand-600 border-brand-700 text-white hover:bg-brand-700 hover:pt-3' 
                            : 'bg-white border-slate-200 text-slate-300 hover:text-brand-600 hover:bg-slate-50'
                    ]"
                    :title="isCollapsed ? 'Mostrar Filtros' : 'Ocultar Filtros'"
                >
                    <i 
                        class="fa-solid transition-transform duration-300"
                        :class="isCollapsed ? 'fa-filter' : 'fa-chevron-up group-hover:-translate-y-0.5'"
                    ></i>
                    <span v-if="isCollapsed" class="text-xs font-bold tracking-wide uppercase">
                        Filtros
                    </span>
                </button>
            </div>

        </div>

        <div class="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-6 min-h-0 overflow-hidden transition-all duration-500 ease-in-out">
            
            <div class="lg:col-span-7 h-1/3 lg:h-full min-h-0 flex flex-col">
                <SuspectsTable @select="onCaseSelected"/>
            </div>
            <div class="lg:col-span-5 h-2/3 lg:h-full flex flex-col overflow-y-auto gap-4 pr-1">
                
                <div class="shrink-0">
                    <div v-if="selectedCase" class="flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                        
                         <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm shrink-0 flex justify-between items-center">
                            <div class="min-w-0">
                                <h3 class="font-bold text-slate-800 text-sm truncate">{{ selectedCase.clientName }}</h3>
                                <div class="flex gap-2 text-[10px] text-slate-500 mt-0.5">
                                    <span class="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">{{ selectedCase.matriz }}</span>
                                    <span>{{ selectedCase.route }}</span>
                                    <span class="font-semibold text-brand-600">| {{ selectedCase.family }}</span>
                                </div>
                            </div>
                             <div class="flex gap-4 text-right">
                                <div>
                                    <div class="text-[9px] text-slate-400 uppercase font-bold">Neto</div>
                                    <div :class="selectedCase.netBalance >= 0 ? 'text-green-600' : 'text-red-600'" class="text-base font-bold">
                                        {{ selectedCase.netBalance > 0 ? '+' : '' }}{{ selectedCase.netBalance.toFixed(0) }}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="h-[350px] relative bg-white rounded-lg border border-slate-200 p-3 shadow-sm"> 
                            <SubstitutionChart 
                                :victim-name="selectedCase.victimSku"
                                :victim-vector="selectedVictimVector"
                                :cannibal-name="selectedCase.cannibalSku"
                                :cannibal-vector="selectedCannibalVector"
                                :split-month="store.rules.splitMonth"
                            />
                        </div>
                    </div>

                    <div v-else class="h-[430px] bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 p-8 text-center gap-4">
                         <div class="bg-white p-4 rounded-full shadow-sm">
                            <i class="fa-solid fa-chart-line text-2xl text-slate-300"></i>
                        </div>
                        <div>
                            <h3 class="font-medium text-slate-600">Detalle Individual</h3>
                            <p class="text-xs text-slate-400 mt-1">Selecciona un caso de la tabla izquierda.</p>
                        </div>
                    </div>
                </div>

                <div class="shrink-0">
                    <AnalysisSummaryCard @export="handleExport" />
                </div>

                <div class="shrink-0 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div class="h-[400px]"> 
                        <GeneralEvolutionChart 
                            :victim-vector="generalEvolutionData.victim"
                            :cannibal-vector="generalEvolutionData.cannibal"
                            :client-count-vector="generalEvolutionData.clients"
                        />
                    </div>
                </div>

                <div class="shrink-0 pb-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <CoverageStatsCard />
                </div>
            </div>            
        </div>    
        <ExportModal v-model="showExportModal" />
    </div>
</template>