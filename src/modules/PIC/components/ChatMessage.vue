<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage } from '../types/picTypes';
import { usePicChatStore } from '../stores/picChatStore';

const props = defineProps<{
    message: ChatMessage;
}>();

const store = usePicChatStore();
const isUser = computed(() => props.message.role === 'user');
const isSystem = computed(() => props.message.role === 'system');

const bubbleClass = computed(() => {
    if (isSystem.value) return 'w-full border border-pic-danger/25 bg-pic-danger/10 text-center text-pic-danger';
    if (isUser.value) return 'self-end rounded-br-none bg-pic-brand text-white';
    return 'self-start rounded-bl-none border border-pic-border bg-pic-surface text-pic-text-main shadow-sm';
});

// Función para activar la visualización
const handleVisualize = () => {
    store.visualizeData(props.message.id);
};
</script>

<template>
    <div class="flex flex-col mb-4 max-w-[85%] animate-fade-in" :class="isUser ? 'items-end self-end' : 'items-start self-start'">
        
        <span v-if="!isSystem" class="mb-1 px-1 text-[10px] text-pic-text-muted">
            {{ isUser ? 'Tú' : 'PIC Assistant' }}
        </span>

        <div class="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm" :class="bubbleClass">
            {{ message.text }}<span v-if="message.isTyping" class="typing-cursor">|</span>
        </div>

        <div v-if="message.chartConfig" class="mt-2 flex flex-col gap-2 self-start w-full">
            
            <button 
                @click="handleVisualize"
                class="group flex w-full items-center gap-3 rounded-xl border border-pic-brand-border bg-pic-surface p-3 text-left transition-all hover:border-pic-brand hover:shadow-md"
            >
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-pic-brand-soft text-pic-brand transition-transform group-hover:scale-110">
                    <i class="fa-solid fa-chart-column text-lg"></i>
                </div>
                <div>
                    <p class="text-xs font-bold text-pic-text-main group-hover:text-pic-brand">Visualizar Datos</p>
                    <p class="text-[10px] text-pic-text-muted">Clic para generar gráfico en el tablero</p>
                </div>
                <i class="fa-solid fa-chevron-right ml-auto text-pic-text-muted group-hover:text-pic-brand"></i>
            </button>

            </div>
        
        <span class="mt-1 px-1 text-[10px] text-pic-text-muted/70">
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

.typing-cursor {
    display: inline-block;
    margin-left: 1px;
    font-weight: 300;
    animation: blink 0.7s step-end infinite;
    opacity: 1;
}
@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
</style>
