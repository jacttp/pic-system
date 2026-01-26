<script setup lang="ts">
import { useCannibalizationStore } from '@/modules/Cannibalization/stores/cannibalizationStore';
import type { DetectedCannibalization } from '@/modules/Cannibalization/types/cannibalizationTypes';

const store = useCannibalizationStore();
const props = defineProps<{
    selectedId?: string;
}>();

const emit = defineEmits<{
    (e: 'select', item: DetectedCannibalization): void
}>();

const selectItem = (item: DetectedCannibalization) => {
    emit('select', item);
};
</script>

<template>
    <div class="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col h-full min-h-0">
        <div class="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <h3 class="font-bold text-slate-700 text-xs uppercase tracking-wide">Casos Detectados</h3>
            <span class="text-[10px] font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-600">
                {{ store.detectedCases.length }}
            </span>
        </div>

        <div class="flex-1 overflow-y-auto relative custom-scrollbar">
            <table class="w-full text-xs text-left">
                <thead class="text-[10px] text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="px-3 py-2">Cliente / Ruta</th>
                        <th class="px-3 py-2">Familia</th>
                        <th class="px-3 py-2 text-red-600">Víctima</th>
                        <th class="px-3 py-2 text-green-600">Caníbal</th>
                        <th class="px-3 py-2 text-center">Neto</th>
                        <th class="px-3 py-2 text-center">Score</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr 
                        v-for="item in store.detectedCases" 
                        :key="item.id"
                        @click="selectItem(item)"
                        class="cursor-pointer transition-colors border-l-4"
                        :class="[
                            item.id === selectedId 
                                ? 'bg-indigo-50 border-brand-500' 
                                : 'hover:bg-slate-50 border-transparent'
                        ]"
                    >
                        <td class="px-4 py-3">
                            <div class="font-medium text-slate-800">{{ item.clientName }}</div>
                            <div class="text-xs text-slate-500">{{ item.route }}</div>
                        </td>
                        <td class="px-4 py-3 text-slate-600">{{ item.family }}</td>
                        <td class="px-4 py-3">
                            <div class="text-slate-700">{{ item.victimSku }}</div>
                            <div class="text-xs font-bold text-red-500">-{{ item.volumeLost.toFixed(1) }} Kg</div>
                        </td>
                        <td class="px-4 py-3">
                            <div class="text-slate-700">{{ item.cannibalSku }}</div>
                            <div class="text-xs font-bold text-green-500">+{{ item.volumeGained.toFixed(1) }} Kg</div>
                        </td>
                        <td class="px-4 py-3 text-center">
                            <span 
                                :class="item.netBalance >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                                class="px-2 py-1 rounded-full text-xs font-bold"
                            >
                                {{ item.netBalance > 0 ? '+' : '' }}{{ item.netBalance.toFixed(1) }}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-center font-mono text-slate-400">
                            {{ item.impactScore.toFixed(0) }}
                        </td>
                    </tr>
                    
                    <tr v-if="store.detectedCases.length === 0">
                        <td colspan="6" class="px-4 py-12 text-center text-slate-400">
                            <span v-if="store.isLoading">Analizando datos...</span>
                            <span v-else>No se detectaron casos con los parámetros actuales.</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>