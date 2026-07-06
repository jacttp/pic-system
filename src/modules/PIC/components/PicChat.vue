<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { usePicChatStore } from '../stores/picChatStore';
import { usePicFilterStore } from '../stores/picFilterStore';
import ChatMessage from './ChatMessage.vue';
import AiModelSelector from './AiModelSelector.vue';

const props = withDefaults(defineProps<{
    mode?: 'desktop' | 'mobile';
}>(), {
    mode: 'desktop'
});

const store = usePicChatStore();
const filterStore = usePicFilterStore();

const userInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const isCollapsed = ref(true);
const isMobileMode = computed(() => props.mode === 'mobile');

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

watch(() => store.messages, () => {
    nextTick(() => scrollToBottom());
}, { deep: true });

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
    <button
        v-if="isMobileMode && isCollapsed"
        @click="isCollapsed = false"
        class="fixed bottom-5 right-5 z-[10000] flex h-14 w-14 items-center justify-center rounded-full bg-pic-brand text-white shadow-xl shadow-pic-brand/30 transition-all hover:bg-pic-brand/90 active:scale-95"
        title="Abrir Asistente IA"
    >
        <i class="fa-solid fa-wand-magic-sparkles text-xl"></i>
    </button>

    <div
        v-if="isMobileMode && !isCollapsed"
        class="fixed inset-0 z-[9998] bg-pic-nav/35 backdrop-blur-[2px]"
        @click="isCollapsed = true"
    ></div>

    <div 
        class="border-l border-pic-border bg-pic-background shadow-xl transition-all duration-300 ease-in-out"
        :class="[
            isMobileMode
                ? 'fixed inset-y-0 right-0 z-[9999] h-full max-w-[420px]'
                : 'relative z-30 h-full flex-shrink-0',
            isCollapsed ? 'w-0' : 'w-full md:w-96'
        ]"
    >
        <button
            @click="isCollapsed = !isCollapsed"
            class="absolute flex items-center justify-center border-l border-y shadow-lg transition-all duration-300 z-50 focus:outline-none"
            :class="[
                isMobileMode
                    ? 'left-4 top-4 h-10 w-10 rounded-xl border-pic-border bg-pic-surface text-pic-text-muted hover:bg-pic-muted-surface hover:text-pic-brand'
                    : 'top-1/2 -translate-y-1/2',
                !isMobileMode && isCollapsed 
                    ? '-left-12 h-16 w-12 rounded-l-2xl border-pic-brand bg-pic-brand text-white shadow-pic-brand/30 hover:bg-pic-brand/90' 
                    : !isMobileMode
                        ? '-left-5 h-12 w-5 rounded-l-lg border-pic-border bg-pic-surface text-pic-text-muted hover:bg-pic-muted-surface hover:text-pic-brand'
                        : ''
            ]"
            :title="isCollapsed ? 'Abrir Asistente IA' : 'Ocultar Chat'"
        >
            <i 
                class="fa-solid transition-all duration-300" 
                :class="[
                    isMobileMode ? 'fa-xmark text-sm' : (isCollapsed ? 'fa-wand-magic-sparkles text-xl animate-pulse-slow' : 'fa-chevron-right text-xs'),
                    isCollapsed ? 'scale-100' : 'group-hover:scale-110'
                ]"
            ></i>
        </button>

        <div class="flex h-full w-screen max-w-[420px] flex-col overflow-hidden bg-pic-background md:w-96">
            
            <div class="flex flex-shrink-0 items-center justify-between border-b border-pic-border bg-pic-surface p-4 shadow-sm" :class="{ 'pl-16': isMobileMode }">
                <h3 class="flex items-center gap-2 font-bold text-pic-text-main">
                    <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-pic-brand-soft text-pic-brand">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    Asistente IA
                </h3>

                <!-- GRUPO DE CONTROLES: SELECTOR + BASURA -->
                <div class="flex items-center gap-2">
                   

                    <!-- 2. BOTÓN LIMPIAR (Existente) -->
                    <button @click="store.clearChat" class="rounded-lg p-2 text-xs text-pic-text-muted transition-colors hover:bg-pic-muted-surface hover:text-pic-danger" title="Limpiar historial">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>

            <div ref="messagesContainer" class="flex flex-1 flex-col space-y-3 overflow-y-auto bg-pic-muted-surface/40 p-4">
                <ChatMessage 
                    v-for="msg in store.messages" 
                    :key="msg.id" 
                    :message="msg" 
                />
                
                <div v-if="store.isLoading" class="flex w-fit animate-pulse items-center gap-2 self-start rounded-xl border border-pic-border bg-pic-surface p-3 text-xs text-pic-text-muted shadow-sm">
                    <i class="fa-solid fa-circle-notch fa-spin text-pic-brand"></i>
                    <span class="font-medium">Analizando...</span>
                </div>
            </div>

            <div class="flex-shrink-0 border-t border-pic-border bg-pic-surface p-4 shadow-[0_-4px_6px_-1px_rgba(15,23,42,0.05)]">
                
                <div v-if="store.activeContext" class="animate-in fade-in slide-in-from-bottom-2 mb-2 flex items-center justify-between rounded-lg border border-pic-brand-border bg-pic-brand-soft px-3 py-2 duration-300">
                    <div class="flex items-center gap-2 overflow-hidden">
                        <i class="fa-solid fa-eye text-xs text-pic-brand"></i>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-pic-brand">Analizando</span>
                            <span class="max-w-[200px] truncate text-xs font-medium text-pic-text-main" :title="store.activeContext.title">
                                {{ store.activeContext.title }}
                            </span>
                        </div>
                    </div>
                    <button @click="store.clearContext" class="rounded-md p-1 text-pic-brand transition-colors hover:bg-pic-surface hover:text-pic-text-main">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>

                <div v-if="filterStore.reportData.length === 0" class="mb-2 flex items-center gap-2 rounded-lg border border-pic-warning/25 bg-pic-warning/10 px-3 py-2 text-[10px] text-pic-warning">
                    <i class="fa-solid fa-circle-info"></i>
                    <span>Primero genera el reporte con los filtros.</span>
                </div>

                  <!-- BARRA UNIFICADA: SELECTOR + INPUT + BOTÓN -->
                <div class="flex items-center gap-2 rounded-xl border border-pic-border bg-pic-muted-surface p-1 transition-all focus-within:border-pic-brand focus-within:ring-2 focus-within:ring-pic-brand-border">
                    
                    <!-- 1. El Selector de Modelos (Izquierda) -->
                    <AiModelSelector />

                    <div class="mx-1 h-6 w-px bg-pic-border"></div>

                    <!-- 2. El Input de Texto (Centro) -->
                    <input 
                        v-model="userInput" 
                        @keydown.enter.prevent="handleSend"
                        type="text" 
                        :placeholder="inputPlaceholder"
                        class="min-w-0 flex-1 border-none bg-transparent py-2.5 text-sm text-pic-text-main outline-none placeholder:text-pic-text-muted"
                        :disabled="!isChatEnabled"
                    >

                    <!-- 3. El Botón Enviar (Derecha) -->
                    <button 
                        @click="handleSend"
                        :disabled="!userInput.trim() || !isChatEnabled"
                        class="mr-1 flex-shrink-0 rounded-lg bg-pic-brand p-2 text-white shadow-sm transition-all hover:bg-pic-brand/90 disabled:cursor-not-allowed disabled:bg-pic-text-muted disabled:opacity-50"
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
