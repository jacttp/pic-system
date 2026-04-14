<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProfileStore } from '../stores/profileStore';
import { PRESENCE_OPTIONS } from '../types/profile.types';
import type { PresenceStatus } from '../types/profile.types';

const profileStore = useProfileStore();
const isChanging = ref(false);

const currentStatus = computed(() => {
   return profileStore.profile?.presenceStatus || 'offline';
});

// Encontrar el índice de la opción actual para el desplazamiento del slider
const currentIndex = computed(() => {
   return PRESENCE_OPTIONS.findIndex(o => o.value === currentStatus.value);
});

const handleSelect = async (status: PresenceStatus) => {
   if (status === currentStatus.value || isChanging.value) return;
   
   isChanging.value = true;
   try {
      await profileStore.updatePresence(status);
   } catch {
      // Error manejado en el store
   } finally {
      isChanging.value = false;
   }
};
</script>

<template>
   <div class="flex items-center justify-between gap-4">
      <div class="flex flex-col">
         <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Presencia</label>
         <div v-if="isChanging" class="flex items-center gap-1.5 animate-pulse">
            <i class="fa-solid fa-circle-notch fa-spin text-[8px] text-blue-500"></i>
            <span class="text-[8px] font-bold text-slate-400 uppercase">Sincronizando...</span>
         </div>
         <span v-else class="text-[10px] font-bold text-slate-600 capitalize">{{ currentStatus }}</span>
      </div>
      
      <!-- Minimal Presence Dots Bar -->
      <div class="relative p-1 bg-slate-100/80 rounded-full flex items-center h-8 w-24 overflow-hidden border border-slate-200/50 shadow-inner">
         
         <!-- Sliding Indicator -->
         <div 
            class="absolute top-1 bottom-1 left-1 rounded-full bg-white shadow-md transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0"
            :style="{ 
               width: `calc((100% - 8px) / 3)`, 
               transform: `translateX(calc(${currentIndex} * 100%))` 
            }"
            :class="{ 'opacity-50': isChanging }"
         ></div>

         <!-- Status Options (Dots + Tooltips) -->
         <button
            v-for="option in PRESENCE_OPTIONS"
            :key="option.value"
            @click="handleSelect(option.value)"
            :disabled="isChanging"
            class="relative z-10 flex-1 h-full flex items-center justify-center group"
         >
            <!-- Custom CSS Tooltip -->
            <div class="absolute bottom-full mb-2.5 px-2 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-wider rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-50 shadow-xl">
               {{ option.label }}
               <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
            </div>

            <span 
               class="w-2 h-2 rounded-full transition-all duration-300"
               :class="[
                  option.color === 'emerald' ? 'bg-emerald-500' : 
                  option.color === 'amber' ? 'bg-amber-500' : 'bg-slate-400',
                  option.value === currentStatus ? 'scale-125' : 'opacity-30 grayscale-[0.4]'
               ]"
            ></span>
         </button>
      </div>
   </div>
</template>

<style scoped>
/* Transiciones fluidas manejadas por Tailwind */
</style>
