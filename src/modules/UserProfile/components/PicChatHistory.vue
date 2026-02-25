<!-- src/modules/UserProfile/components/PicChatHistory.vue -->
<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { usePicChatStore } from '@/modules/PIC/stores/picChatStore';

const chatStore = usePicChatStore();

// Últimas N conversaciones (solo del asistente, excluyendo system)
const recentMessages = computed(() => {
   return chatStore.messages
      .filter(m => m.role !== 'system')
      .slice(-10)
      .reverse();
});

const hasMessages = computed(() => recentMessages.value.length > 0);

// Truncar texto largo
const truncate = (text: string, max: number = 80) => {
   if (text.length <= max) return text;
   return text.substring(0, max) + '...';
};

// Formateo relativo
const formatTime = (id: string) => {
   // El id del mensaje contiene timestamp (msg_XXXXX format)
   return '';
};

const roleIcon = (role: string) => {
   return role === 'user' ? 'fa-solid fa-user' : 'fa-solid fa-robot';
};

const roleColor = (role: string) => {
   return role === 'user' 
      ? 'bg-brand-50 text-brand-500' 
      : 'bg-indigo-50 text-indigo-500';
};
</script>

<template>
   <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
         <div class="flex items-center gap-2">
            <i class="fa-solid fa-comments text-indigo-500"></i>
            <span class="text-sm font-semibold text-slate-700">Chat PIC Reciente</span>
         </div>
         <router-link 
            to="/admin/pic" 
            class="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
         >
            Ir al Chat
         </router-link>
      </div>

      <!-- Content -->
      <div class="max-h-64 overflow-y-auto">
         <!-- Empty state -->
         <div v-if="!hasMessages" class="p-6 flex flex-col items-center justify-center text-center">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
               <i class="fa-solid fa-comments text-indigo-300 text-lg"></i>
            </div>
            <p class="text-sm text-slate-500">Sin conversaciones recientes</p>
            <router-link to="/admin/pic" class="text-xs text-indigo-600 hover:underline mt-2">
               Iniciar una conversación
            </router-link>
         </div>

         <!-- Messages list -->
         <div v-else class="divide-y divide-slate-50">
            <div 
               v-for="msg in recentMessages" 
               :key="msg.id"
               class="px-4 py-2.5 flex items-start gap-2.5 hover:bg-slate-50/50 transition-colors"
            >
               <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    :class="roleColor(msg.role)">
                  <i :class="roleIcon(msg.role)" class="text-[10px]"></i>
               </div>
               <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-slate-500 capitalize">{{ msg.role === 'user' ? 'Tú' : 'PIC AI' }}</p>
                  <p class="text-sm text-slate-700 leading-snug mt-0.5">
                     {{ truncate(msg.text) }}
                  </p>
                  <div v-if="msg.chartConfig" class="mt-1 inline-flex items-center gap-1 text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                     <i class="fa-solid fa-chart-bar"></i> Incluye gráfica
                  </div>
               </div>
            </div>
         </div>
      </div>
   </div>
</template>
