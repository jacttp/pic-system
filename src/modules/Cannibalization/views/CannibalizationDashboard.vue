<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCannibalizationStore } from '../stores/cannibalizationStore';
import AnalysisConfigPanel from '../../Shared/components/config/AnalysisConfigPanel.vue';
import SuspectsTable from '../../Shared/components/tables/SuspectsTable.vue';
import SubstitutionChart from '../components/charts/SubstitutionChart.vue';
import type { DetectedCannibalization } from '../types/cannibalizationTypes';

const store = useCannibalizationStore();

// Estado local para el gráfico de detalle
const selectedCase = ref<DetectedCannibalization | null>(null);
const selectedVictimVector = ref<number[]>([]);
const selectedCannibalVector = ref<number[]>([]);

// Estado para carga inicial
const selectedYear = ref('2025');
const selectedFamily = ref('ZF-Chorizos Corona'); 

// Acción al seleccionar una fila de la tabla
const onCaseSelected = (item: DetectedCannibalization) => {
    selectedCase.value = item;
    
    // Buscar los vectores en los datos crudos (RawData)
    // El ID del item es "Matriz-Familia". Necesitamos buscar por Cliente y Familia.
    // Nota: item.id no es suficiente para buscar directo si no tenemos un mapa, así que iteramos o buscamos.
    
    const client = store.rawData.find(c => c.name === item.clientName); // Ojo: Idealmente usar ID, pero item tiene clientName
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
    store.fetchData(selectedYear.value, { grupo: selectedFamily.value });
};

    // onMounted eliminado para carga manual

</script>

<template>
    <div class="h-full flex flex-col p-6 gap-6 bg-slate-50 overflow-hidden">
        
        <!-- Header & Config Zone -->
        <div class="flex flex-col gap-4">
             <!-- Filtros Principales -->
            <div class="flex justify-between items-end bg-white p-4 rounded-lg border border-slate-200">
                <div class="flex gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Año Fiscal</label>
                        <select v-model="selectedYear" class="border-slate-300 rounded text-sm px-3 py-1.5">
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Familia de Productos</label>
                        <select v-model="selectedFamily" class="border-slate-300 rounded text-sm px-3 py-1.5 w-64">
                            <option value="ZF-Chorizos Corona">ZF-Chorizos Corona</option>
                            <option value="ZF-Salchichas">ZF-Salchichas</option>
                            </select>
                    </div>
                </div>
                <button 
                    @click="loadData" 
                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"
                    :disabled="store.isLoading"
                >
                    <span v-if="store.isLoading" class="animate-spin">↻</span>
                    {{ store.isLoading ? 'Cargando...' : 'Cargar Datos' }}
                </button>
            </div>

            <!-- Panel de Variables de Detección (Horizontal) -->
            <AnalysisConfigPanel />
        </div>

        <!-- Main Content Grid -->
        <div class="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-1 gap-6 min-h-0 overflow-hidden">
            
            <!-- Tabla de Resultados -->
            <div class="lg:col-span-7 h-1/3 lg:h-full min-h-0 flex flex-col">
                <SuspectsTable 
                    @select="onCaseSelected" 
                    :selected-id="selectedCase?.id"
                />
            </div>

            <!-- Gráfico de Detalle -->
            <div class="lg:col-span-5 h-2/3 lg:h-full flex flex-col min-h-0">
                <div v-if="selectedCase" class="h-full flex flex-col gap-3">
                    
                    <!-- Tarjeta de Información Compacta -->
                    <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm shrink-0">
                        <div class="flex justify-between items-start">
                             <div class="min-w-0 flex-1 mr-4">
                                <h3 class="font-bold text-slate-800 text-sm truncate" :title="selectedCase.clientName">
                                    {{ selectedCase.clientName }}
                                </h3>
                                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500 mt-1">
                                    <span class="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">{{ selectedCase.matriz }}</span>
                                    <span class="truncate">{{ selectedCase.route }}</span>
                                </div>
                            </div>
                            
                            <!-- KPI Compactos -->
                            <div class="flex gap-2 text-right shrink-0">
                                <div>
                                    <div class="text-[10px] text-slate-400">Sustitución</div>
                                    <div class="font-bold text-slate-700">{{ selectedCase.substitutionRate }}%</div>
                                </div>
                                <div class="w-px bg-slate-100 my-1"></div>
                                <div>
                                    <div class="text-[10px] text-slate-400">Neto</div>
                                    <div :class="selectedCase.netBalance >= 0 ? 'text-green-600' : 'text-red-600'" class="font-bold">
                                        {{ selectedCase.netBalance > 0 ? '+' : '' }}{{ selectedCase.netBalance.toFixed(0) }}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Segunda fila de detalles -->
                         <div class="flex gap-4 text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-50">
                             <div class="truncate"><span class="font-semibold">Ger:</span> {{ selectedCase.gerencia }}</div>
                             <div class="truncate"><span class="font-semibold">Jef:</span> {{ selectedCase.jefatura }}</div>
                        </div>
                    </div>

                    <div class="flex-1 min-h-0 relative bg-white rounded-lg border border-slate-200 p-2"> <!-- Container blanca para el gráfico -->
                        <SubstitutionChart 
                            :victim-name="selectedCase.victimSku"
                            :victim-vector="selectedVictimVector"
                            :cannibal-name="selectedCase.cannibalSku"
                            :cannibal-vector="selectedCannibalVector"
                            :split-month="store.rules.splitMonth"
                        />
                    </div>
                </div>
                
                <div v-else class="h-full bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 p-8 text-center text-sm">
                    Selecciona un caso para ver detalles
                </div>
            </div>
        </div>
    </div>
</template>