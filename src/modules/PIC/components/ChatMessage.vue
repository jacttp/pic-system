<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage } from '../stores/picChatStore';

const props = defineProps<{
    message: ChatMessage;
}>();

const isUser = computed(() => props.message.role === 'user');
const isSystem = computed(() => props.message.role === 'system');

const bubbleClass = computed(() => {
    if (isSystem.value) return 'bg-red-50 text-red-600 border border-red-100 text-center w-full';
    if (isUser.value) return 'bg-brand-600 text-white self-end rounded-br-none';
    return 'bg-white border border-slate-200 text-slate-700 self-start rounded-bl-none shadow-sm';
});
</script>

<template>
    <div class="flex flex-col mb-4 max-w-[85%] animate-fade-in" :class="isUser ? 'items-end self-end' : 'items-start self-start'">
        
        <span v-if="!isSystem" class="text-[10px] text-slate-400 mb-1 px-1">
            {{ isUser ? 'Tú' : 'PIC Assistant' }}
        </span>

        <div class="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap" :class="bubbleClass">
            {{ message.text }}
        </div>

        <div v-if="message.chartConfig" class="mt-2 text-xs text-brand-600 font-medium bg-brand-50 px-2 py-1 rounded border border-brand-100 flex items-center gap-1 self-start">
            <i class="fa-solid fa-chart-bar"></i> Datos visuales disponibles
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