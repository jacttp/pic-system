<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCannibalizationStore } from '@/modules/Cannibalization/stores/cannibalizationStore';
import type { DetectedCannibalization } from '@/modules/Cannibalization/types/cannibalizationTypes';

const store = useCannibalizationStore();
const props = defineProps<{
    selectedId?: string;
}>();

const emit = defineEmits<{
    (e: 'select', item: DetectedCannibalization): void
}>();

// --- FILTROS LOCALES ---
const searchTerm = ref('');
const filterStatus = ref<'all' | 'negative' | 'positive'>('all');
const filterVictim = ref('');   // Nuevo
const filterCannibal = ref(''); // Nuevo

// --- LISTAS DINÁMICAS PARA LOS SELECTS (NUEVO) ---
// Extraemos valores únicos y los ordenamos alfabéticamente
const uniqueVictims = computed(() => {
    const victims = new Set(store.detectedCases.map(c => c.victimSku));
    return Array.from(victims).sort();
});

const uniqueCannibals = computed(() => {
    const cannibals = new Set(store.detectedCases.map(c => c.cannibalSku));
    return Array.from(cannibals).sort();
});

// --- FILTRADO MAESTRO ---
const filteredData = computed(() => {
    let data = store.detectedCases;

    // 1. Filtro Texto (Cliente o Ruta)
    if (searchTerm.value) {
        const term = searchTerm.value.toLowerCase();
        data = data.filter(item => 
            item.clientName.toLowerCase().includes(term) || 
            item.route.toLowerCase().includes(term)
        );
    }

    // 2. Filtro Estado (Neto)
    if (filterStatus.value === 'negative') {
        data = data.filter(item => item.netBalance < 0);
    } else if (filterStatus.value === 'positive') {
        data = data.filter(item => item.netBalance >= 0);
    }

    // 3. Filtro Víctima (NUEVO)
    if (filterVictim.value) {
        data = data.filter(item => item.victimSku === filterVictim.value);
    }

    // 4. Filtro Caníbal (NUEVO)
    if (filterCannibal.value) {
        data = data.filter(item => item.cannibalSku === filterCannibal.value);
    }

    return data;
});



// --- KPI EN TIEMPO REAL ---
const totalRedCases = computed(() => {
    // Calculamos sobre los datos FILTRADOS para que el KPI refleje lo que ves
    return filteredData.value.filter(c => c.netBalance < 0).length;
});

const selectItem = (item: DetectedCannibalization) => {
    emit('select', item);
};

// Reset rápido
const clearFilters = () => {
    searchTerm.value = '';
    filterStatus.value = 'all';
    filterVictim.value = '';
    filterCannibal.value = '';
};
</script>

<template>
    <div class="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col h-full min-h-0 shadow-sm transition-all">
        
        <div class="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-3 shrink-0">
            
            <div class="flex justify-between items-center">
                <h3 class="font-bold text-slate-700 text-xs uppercase tracking-wide flex items-center gap-2">
                    <i class="fa-solid fa-list-ul text-slate-400"></i> Casos Detectados
                </h3>
                
                <div class="flex items-center gap-2 text-[10px] font-medium">
                    <button 
                        v-if="filterVictim || filterCannibal || searchTerm || filterStatus !== 'all'"
                        @click="clearFilters"
                        class="text-slate-400 hover:text-brand-600 mr-2 transition-colors"
                        title="Limpiar filtros"
                    >
                        <i class="fa-solid fa-filter-circle-xmark"></i>
                    </button>

                    <span class="bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200" title="Casos con Pérdida Neta (Vista Actual)">
                        <i class="fa-solid fa-triangle-exclamation mr-1"></i> {{ totalRedCases }}
                    </span>
                    <span class="bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-300">
                        {{ filteredData.length }} / {{ store.detectedCases.length }}
                    </span>
                </div>
            </div>

            <div class="flex gap-2">
                <div class="relative flex-1">
                    <i class="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input 
                        v-model="searchTerm"
                        type="text" 
                        placeholder="Buscar Cliente o Ruta..." 
                        class="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white shadow-sm"
                    >
                </div>
                <select 
                    v-model="filterStatus"
                    class="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-brand-500 outline-none cursor-pointer shadow-sm min-w-[100px]"
                >
                    <option value="all">Estado: Todos</option>
                    <option value="negative">🔴 Negativos</option>
                    <option value="positive">🟢 Positivos</option>
                </select>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                
                <div class="relative group">
                    <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-400 text-[10px] pointer-events-none">
                        <i class="fa-solid fa-arrow-trend-down"></i>
                    </div>
                    <select 
                        v-model="filterVictim"
                        class="w-full pl-7 pr-4 py-1 text-[11px] border border-transparent bg-red-50/50 hover:bg-red-50 text-slate-600 rounded-md focus:ring-1 focus:ring-red-200 focus:bg-white outline-none cursor-pointer transition-colors appearance-none truncate font-medium"
                    >
                        <option value="">Todas las Víctimas</option>
                        <option v-for="sku in uniqueVictims" :key="sku" :value="sku">{{ sku }}</option>
                    </select>
                    <i class="fa-solid fa-caret-down absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-red-200 group-hover:text-red-300 pointer-events-none"></i>
                </div>

                <div class="relative group">
                    <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-green-500 text-[10px] pointer-events-none">
                        <i class="fa-solid fa-arrow-trend-up"></i>
                    </div>
                    <select 
                        v-model="filterCannibal"
                        class="w-full pl-7 pr-4 py-1 text-[11px] border border-transparent bg-green-50/50 hover:bg-green-50 text-slate-600 rounded-md focus:ring-1 focus:ring-green-200 focus:bg-white outline-none cursor-pointer transition-colors appearance-none truncate font-medium"
                    >
                        <option value="">Todos los Caníbales</option>
                        <option v-for="sku in uniqueCannibals" :key="sku" :value="sku">{{ sku }}</option>
                    </select>
                    <i class="fa-solid fa-caret-down absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-green-200 group-hover:text-green-300 pointer-events-none"></i>
                </div>

            </div>
        </div>

        <div class="flex-1 overflow-y-auto relative custom-scrollbar">
            <table class="w-full text-xs text-left border-collapse">
                <thead class="text-[10px] text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                    <tr>
                        <th class="px-3 py-2 bg-slate-50">Cliente / Ruta</th>
                        <th class="px-3 py-2 bg-slate-50 text-red-600 border-l border-slate-100">Víctima</th>
                        <th class="px-3 py-2 bg-slate-50 text-green-600 border-l border-slate-100">Caníbal</th>
                        <th class="px-3 py-2 bg-slate-50 text-center border-l border-slate-100">Neto</th>
                        <th class="px-3 py-2 bg-slate-50 text-center border-l border-slate-100">Score</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr 
                        v-for="item in filteredData" 
                        :key="item.id"
                        @click="selectItem(item)"
                        class="cursor-pointer transition-colors border-l-4 group hover:bg-slate-50"
                        :class="[
                            item.id === selectedId 
                                ? 'bg-indigo-50 border-brand-500' 
                                : 'border-transparent'
                        ]"
                    >
                        <td class="px-3 py-2 max-w-[180px]">
                            <div class="font-bold text-slate-700 truncate" :title="item.clientName">{{ item.clientName }}</div>
                            <div class="text-[10px] text-slate-400 flex items-center gap-1">
                                <span class="bg-slate-100 px-1 rounded">{{ item.matriz }}</span>
                                <span>{{ item.route }}</span>
                            </div>
                        </td>
                        
                        <td class="px-3 py-2 border-l border-slate-50">
                            <div class="text-slate-600 truncate max-w-[120px]" :title="item.victimSku">{{ item.victimSku }}</div>
                            <div class="text-[10px] font-bold text-red-500">-{{ item.volumeLost.toFixed(1) }}</div>
                        </td>
                        
                        <td class="px-3 py-2 border-l border-slate-50">
                            <div class="text-slate-600 truncate max-w-[120px]" :title="item.cannibalSku">{{ item.cannibalSku }}</div>
                            <div class="text-[10px] font-bold text-green-500">+{{ item.volumeGained.toFixed(1) }}</div>
                        </td>
                        
                        <td class="px-3 py-2 text-center border-l border-slate-50">
                            <span 
                                :class="item.netBalance >= 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'"
                                class="px-2 py-0.5 rounded border text-[10px] font-bold block w-fit mx-auto"
                            >
                                {{ item.netBalance > 0 ? '+' : '' }}{{ item.netBalance.toFixed(1) }}
                            </span>
                        </td>
                        
                        <td class="px-3 py-2 text-center font-mono text-slate-400 border-l border-slate-50 group-hover:text-slate-600">
                            {{ item.impactScore.toFixed(0) }}
                        </td>
                    </tr>
                    
                    <tr v-if="filteredData.length === 0">
                        <td colspan="5" class="px-4 py-12 text-center text-slate-400">
                            <div class="flex flex-col items-center gap-2">
                                <i class="fa-solid fa-filter opacity-30 text-2xl"></i>
                                <span v-if="store.isLoading" class="animate-pulse">Analizando datos...</span>
                                <span v-else-if="store.detectedCases.length > 0">
                                    No hay coincidencias.<br>
                                    <button @click="clearFilters" class="text-brand-600 underline text-[10px] mt-1">Limpiar filtros</button>
                                </span>
                                <span v-else>No se detectaron casos con los parámetros actuales.</span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>