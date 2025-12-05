<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage } from '../stores/picChatStore';
import { usePicChatStore } from '../stores/picChatStore';

const props = defineProps<{
    message: ChatMessage;
}>();

const store = usePicChatStore();
const isUser = computed(() => props.message.role === 'user');
const isSystem = computed(() => props.message.role === 'system');

const bubbleClass = computed(() => {
    if (isSystem.value) return 'bg-red-50 text-red-600 border border-red-100 text-center w-full';
    if (isUser.value) return 'bg-brand-600 text-white self-end rounded-br-none';
    return 'bg-white border border-slate-200 text-slate-700 self-start rounded-bl-none shadow-sm';
});

// Función para activar la visualización
const handleVisualize = () => {
    store.visualizeData(props.message.id);
};
</script>

<template>
    <div class="flex flex-col mb-4 max-w-[85%] animate-fade-in" :class="isUser ? 'items-end self-end' : 'items-start self-start'">
        
        <span v-if="!isSystem" class="text-[10px] text-slate-400 mb-1 px-1">
            {{ isUser ? 'Tú' : 'PIC Assistant' }}
        </span>

        <div class="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm" :class="bubbleClass">
            {{ message.text }}
        </div>

        <div v-if="message.chartConfig" class="mt-2 flex flex-col gap-2 self-start w-full">
            
            <button 
                @click="handleVisualize"
                class="group flex items-center gap-3 bg-white border border-brand-200 hover:border-brand-400 hover:shadow-md p-3 rounded-xl transition-all w-full text-left"
            >
                <div class="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform">
                    <i class="fa-solid fa-chart-column text-lg"></i>
                </div>
                <div>
                    <p class="text-xs font-bold text-slate-700 group-hover:text-brand-700">Visualizar Datos</p>
                    <p class="text-[10px] text-slate-400">Clic para generar gráfico en el tablero</p>
                </div>
                <i class="fa-solid fa-chevron-right text-slate-300 ml-auto group-hover:text-brand-500"></i>
            </button>

            </div>
        
        <span class="text-[10px] text-slate-300 mt-1 px-1">
            {{ message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
        </span>
    </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>