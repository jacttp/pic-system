<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { usePicChatStore } from '../stores/picChatStore';
import ChatMessage from './ChatMessage.vue';

const store = usePicChatStore();
const userInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

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
    userInput.value = ''; // Limpiar input inmediatamente
    
    await store.sendMessage(text);
    // El focus se mantiene en el input automáticamente
};
</script>

<template>
    <div class="flex flex-col h-full bg-slate-50 border-l border-slate-200 w-full md:w-96 shrink-0 shadow-xl z-30">
        
        <div class="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm">
            <h3 class="font-bold text-slate-700 flex items-center gap-2">
                <i class="fa-solid fa-sparkles text-brand-500"></i> Asistente IA
            </h3>
            <button @click="store.clearChat" class="text-xs text-slate-400 hover:text-red-500 transition-colors" title="Limpiar historial">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>

        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 flex flex-col space-y-2 bg-slate-50/50">
            <ChatMessage 
                v-for="msg in store.messages" 
                :key="msg.id" 
                :message="msg" 
            />
            
            <div v-if="store.isLoading" class="flex items-center gap-2 text-slate-400 text-xs p-2 self-start animate-pulse">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                <span>Analizando solicitud...</span>
            </div>
        </div>

        <div class="p-4 bg-white border-t border-slate-200">
            <div class="relative">
                <input 
                    v-model="userInput" 
                    @keydown.enter.prevent="handleSend"
                    type="text" 
                    placeholder="Pregunta sobre ventas, metas..." 
                    class="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                    :disabled="store.isLoading"
                >
                <button 
                    @click="handleSend"
                    :disabled="!userInput.trim() || store.isLoading"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <i class="fa-solid fa-paper-plane text-xs"></i>
                </button>
            </div>
            <p class="text-[10px] text-center text-slate-400 mt-2">
                La IA puede cometer errores. Verifica los datos importantes.
            </p>
        </div>
    </div>
</template>