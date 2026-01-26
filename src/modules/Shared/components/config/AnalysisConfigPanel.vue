<script setup lang="ts">
import { useCannibalizationStore } from '@/modules/Cannibalization/stores/cannibalizationStore';
import { storeToRefs } from 'pinia';

const store = useCannibalizationStore();
const { rules, isLoading } = storeToRefs(store);

// Función auxiliar para formatear porcentaje
const toPct = (val: number) => `${(val * 100).toFixed(0)}%`;
</script>

<template>
    <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div class="flex items-start gap-6">
            <!-- Header & Action -->
            <div class="min-w-[140px] pt-1">
                <h2 class="text-sm font-bold text-slate-800 mb-2">Variables de Detección</h2>
                <button 
                    @click="store.analyze()" 
                    class="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded hover:bg-indigo-100 font-medium flex items-center gap-1 transition-colors"
                >
                    <span>↻</span> Re-Analizar
                </button>
            </div>

            <!-- Controls Grid -->
            <div class="flex-1 grid grid-cols-4 gap-6 border-l border-slate-100 pl-6">
                <!-- Drop Threshold -->
                <div>
                    <div class="flex justify-between text-xs mb-1.5">
                        <label class="font-medium text-slate-600">Umbral Caída</label>
                        <span class="text-red-600 font-bold">{{ toPct(rules.dropThreshold) }}</span>
                    </div>
                    <input 
                        type="range" min="0.1" max="0.9" step="0.05" 
                        v-model.number="rules.dropThreshold"
                        class="w-full accent-red-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        @change="store.analyze()" 
                    />
                    <p class="text-[10px] text-slate-400 mt-1 truncate" title="Mínima caída % requerida">Mínima caída % requerida</p>
                </div>

                <!-- Growth Threshold -->
                <div>
                    <div class="flex justify-between text-xs mb-1.5">
                        <label class="font-medium text-slate-600">Umbral Crecimiento</label>
                        <span class="text-green-600 font-bold">{{ toPct(rules.growthThreshold) }}</span>
                    </div>
                    <input 
                        type="range" min="0.1" max="2.0" step="0.1" 
                        v-model.number="rules.growthThreshold"
                        class="w-full accent-green-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        @change="store.analyze()" 
                    />
                    <p class="text-[10px] text-slate-400 mt-1 truncate" title="Mínimo crecimiento % requerido">Mínimo crecimiento % requerido</p>
                </div>

                <!-- Split Month -->
                <div>
                    <label class="block text-xs font-medium text-slate-600 mb-1.5">Mes de Corte</label>
                    <select 
                        v-model.number="rules.splitMonth" 
                        @change="store.analyze()"
                        class="w-full border-slate-300 rounded text-xs py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option :value="1">Enero</option>
                        <option :value="6">Junio</option>
                        <option :value="7">Julio</option>
                        <option :value="8">Agosto</option>
                        <option :value="9">Septiembre</option>
                        <option :value="10">Octubre</option>
                    </select>
                    <p class="text-[10px] text-slate-400 mt-1 truncate">Inicio de estrategia</p>
                </div>
                
                <!-- Min Volume -->
                 <div>
                    <label class="block text-xs font-medium text-slate-600 mb-1.5">Volumen Mínimo</label>
                    <div class="relative">
                        <input 
                            type="number" 
                            v-model.number="rules.minVolume"
                            class="w-full border-slate-300 rounded text-xs py-1 px-2 pr-8"
                            @input="store.analyze()"
                        />
                        <span class="absolute right-2 top-1 text-xs text-slate-400">Kg</span>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1 truncate">Filtro de ruido</p>
                </div>
            </div>
        </div>
    </div>
</template>