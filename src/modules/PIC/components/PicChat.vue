<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { usePicChatStore } from '../stores/picChatStore';
import { usePicFilterStore } from '../stores/picFilterStore';
import ChatMessage from './ChatMessage.vue';
import AiModelSelector from './AiModelSelector.vue';

const store = usePicChatStore();
const filterStore = usePicFilterStore();

const userInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const isCollapsed = ref(false);

const isChatEnabled = computed(() => {
    return filterStore.reportData.length > 0 && !store.isLoading;
});

const inputPlaceholder = computed(() => {
    if (store.isLoading) return 'Pensando...';
    if (filterStore.reportData.length === 0) return 'Genera el reporte para activar el chat 🔒';
    // Cambiamos el placeholder si hay contexto
    if (store.activeContext) return `Pregunta sobre "${store.activeContext.title}"...`;
    return 'Pregunta sobre los datos (ej: Ventas de Corona)...';
});

onMounted(() => {
    store.initChat();
    scrollToBottom();
});

watch(() => store.messages.length, () => {
    nextTick(() => scrollToBottom());
});

const scrollToBottom = () => {
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
};

const handleSend = async () => {
    if (!userInput.value.trim() || !isChatEnabled.value) return;
    const text = userInput.value;
    userInput.value = ''; 
    await store.sendMessage(text);
};
</script>

<template>
    <div 
        class="relative z-30 flex-shrink-0 transition-all duration-300 ease-in-out h-full border-l border-slate-200 shadow-xl bg-slate-50"
        :class="isCollapsed ? 'w-0' : 'w-full md:w-96'"
    >
        <button
            @click="isCollapsed = !isCollapsed"
            class="absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-300 z-50 focus:outline-none shadow-lg border-y border-l"
            :class="[
                isCollapsed 
                    ? '-left-12 w-12 h-16 bg-brand-600 border-brand-700 text-white rounded-l-2xl hover:bg-brand-700 shadow-brand-500/30' 
                    : '-left-5 w-5 h-12 bg-white border-slate-200 text-slate-300 rounded-l-lg hover:text-brand-600 hover:bg-slate-50'
            ]"
            :title="isCollapsed ? 'Abrir Asistente IA' : 'Ocultar Chat'"
        >
            <i 
                class="fa-solid transition-all duration-300" 
                :class="[
                    isCollapsed ? 'fa-wand-magic-sparkles text-xl animate-pulse-slow' : 'fa-chevron-right text-xs',
                    isCollapsed ? 'scale-100' : 'group-hover:scale-110'
                ]"
            ></i>
        </button>

        <div class="h-full flex flex-col overflow-hidden w-96 bg-slate-50">
            
            <div class="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm flex-shrink-0">
                <h3 class="font-bold text-slate-700 flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    Asistente IA
                </h3>

                <!-- GRUPO DE CONTROLES: SELECTOR + BASURA -->
                <div class="flex items-center gap-2">
                   

                    <!-- 2. BOTÓN LIMPIAR (Existente) -->
                    <button @click="store.clearChat" class="text-xs text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-slate-100 rounded-lg" title="Limpiar historial">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>

            <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 flex flex-col space-y-3 bg-slate-50/50">
                <ChatMessage 
                    v-for="msg in store.messages" 
                    :key="msg.id" 
                    :message="msg" 
                />
                
                <div v-if="store.isLoading" class="flex items-center gap-2 text-slate-400 text-xs p-3 bg-white rounded-xl border border-slate-100 shadow-sm self-start w-fit animate-pulse">
                    <i class="fa-solid fa-circle-notch fa-spin text-brand-500"></i>
                    <span class="font-medium">Analizando...</span>
                </div>
            </div>

            <div class="p-4 bg-white border-t border-slate-200 flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                
                <div v-if="store.activeContext" class="mb-2 flex items-center justify-between px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <div class="flex items-center gap-2 overflow-hidden">
                        <i class="fa-solid fa-eye text-indigo-500 text-xs"></i>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Analizando</span>
                            <span class="text-xs font-medium text-indigo-700 truncate max-w-[200px]" :title="store.activeContext.title">
                                {{ store.activeContext.title }}
                            </span>
                        </div>
                    </div>
                    <button @click="store.clearContext" class="text-indigo-400 hover:text-indigo-600 p-1 rounded-md hover:bg-indigo-100 transition-colors">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>

                <div v-if="filterStore.reportData.length === 0" class="mb-2 px-3 py-2 bg-yellow-50 border border-yellow-100 rounded-lg text-[10px] text-yellow-700 flex items-center gap-2">
                    <i class="fa-solid fa-circle-info"></i>
                    <span>Primero genera el reporte con los filtros.</span>
                </div>

                  <!-- BARRA UNIFICADA: SELECTOR + INPUT + BOTÓN -->
                <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                    
                    <!-- 1. El Selector de Modelos (Izquierda) -->
                    <AiModelSelector />

                    <div class="h-6 w-px bg-slate-200 mx-1"></div>

                    <!-- 2. El Input de Texto (Centro) -->
                    <input 
                        v-model="userInput" 
                        @keydown.enter.prevent="handleSend"
                        type="text" 
                        :placeholder="inputPlaceholder"
                        class="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-slate-400 py-2.5 min-w-0"
                        :disabled="!isChatEnabled"
                    >

                    <!-- 3. El Botón Enviar (Derecha) -->
                    <button 
                        @click="handleSend"
                        :disabled="!userInput.trim() || !isChatEnabled"
                        class="p-2 mr-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
                    >
                        <i class="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped>
.animate-pulse-slow {
    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .7; }
}
</style>