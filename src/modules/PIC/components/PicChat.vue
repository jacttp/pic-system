<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { usePicChatStore } from '../stores/picChatStore';
import ChatMessage from './ChatMessage.vue';

const store = usePicChatStore();
const userInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

// Estado local para colapsar/expandir
const isCollapsed = ref(false);

onMounted(() => {
    store.initChat();
    scrollToBottom();
});

// Auto-scroll cuando llegan mensajes nuevos
watch(() => store.messages.length, () => {
    nextTick(() => scrollToBottom());
});

const scrollToBottom = () => {
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
};

const handleSend = async () => {
    if (!userInput.value.trim() || store.isLoading) return;
    
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
                // ESTADO 1: Colapsado (Llamativo, Azul, Icono IA)
                isCollapsed 
                    ? '-left-12 w-12 h-16 bg-brand-600 border-brand-700 text-white rounded-l-2xl hover:bg-brand-700 shadow-brand-500/30' 
                    
                // ESTADO 2: Expandido (Sutil, Blanco, Flecha)
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
                <button @click="store.clearChat" class="text-xs text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-slate-100 rounded-lg" title="Limpiar historial">
                    <i class="fa-solid fa-trash"></i>
                </button>
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
                <div class="relative">
                    <input 
                        v-model="userInput" 
                        @keydown.enter.prevent="handleSend"
                        type="text" 
                        placeholder="Pregunta sobre ventas..." 
                        class="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400"
                        :disabled="store.isLoading"
                    >
                    <button 
                        @click="handleSend"
                        :disabled="!userInput.trim() || store.isLoading"
                        class="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                    >
                        <i class="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped>
/* Animación suave para el ícono de magia */
.animate-pulse-slow {
    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .7; }
}
</style>