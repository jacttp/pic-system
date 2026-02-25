<!-- src/modules/UserProfile/components/ActivityStatus.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProfileStore } from '../stores/profileStore';
import { PRESENCE_OPTIONS } from '../types/profile.types';
import type { PresenceStatus } from '../types/profile.types';

const profileStore = useProfileStore();
const isChanging = ref(false);
const showDropdown = ref(false);

const currentStatus = computed(() => {
   return profileStore.profile?.presenceStatus || 'offline';
});

const currentOption = computed(() => {
   return PRESENCE_OPTIONS.find(o => o.value === currentStatus.value) ?? PRESENCE_OPTIONS[2]!;
});

const colorClasses: Record<string, { dot: string; bg: string; text: string }> = {
   emerald: { dot: 'bg-emerald-500', bg: 'bg-emerald-50 hover:bg-emerald-100', text: 'text-emerald-700' },
   amber: { dot: 'bg-amber-500', bg: 'bg-amber-50 hover:bg-amber-100', text: 'text-amber-700' },
   slate: { dot: 'bg-slate-400', bg: 'bg-slate-50 hover:bg-slate-100', text: 'text-slate-600' }
};

const handleSelect = async (status: PresenceStatus) => {
   if (status === currentStatus.value) {
      showDropdown.value = false;
      return;
   }
   isChanging.value = true;
   showDropdown.value = false;
   try {
      await profileStore.updatePresence(status);
   } catch {
      // Error handled in store
   } finally {
      isChanging.value = false;
   }
};
</script>

<template>
   <div class="relative">
      <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estado de Presencia</label>
      
      <!-- Current status button -->
      <button 
         @click="showDropdown = !showDropdown"
         :disabled="isChanging"
         class="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors bg-white disabled:opacity-70"
      >
         <div class="flex items-center gap-2.5">
            <span 
               class="w-2.5 h-2.5 rounded-full transition-colors"
               :class="[colorClasses[currentOption.color]?.dot || 'bg-slate-400', isChanging ? 'animate-pulse' : '']"
            ></span>
            <span class="text-sm font-medium" :class="colorClasses[currentOption.color]?.text || 'text-slate-600'">
               {{ currentOption.label }}
            </span>
         </div>
         <i class="fa-solid fa-chevron-down text-xs text-slate-400 transition-transform" :class="{ 'rotate-180': showDropdown }"></i>
      </button>

      <!-- Dropdown -->
      <transition name="dropdown">
         <div 
            v-if="showDropdown"
            class="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden"
         >
            <button
               v-for="option in PRESENCE_OPTIONS"
               :key="option.value"
               @click="handleSelect(option.value)"
               class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
               :class="[
                  colorClasses[option.color]?.bg || 'hover:bg-slate-50',
                  option.value === currentStatus ? 'font-semibold' : ''
               ]"
            >
               <span class="w-2.5 h-2.5 rounded-full" :class="colorClasses[option.color]?.dot || 'bg-slate-400'"></span>
               <span :class="colorClasses[option.color]?.text || 'text-slate-600'">{{ option.label }}</span>
               <i v-if="option.value === currentStatus" class="fa-solid fa-check text-xs ml-auto opacity-60"></i>
            </button>
         </div>
      </transition>

      <!-- Click outside handler -->
      <div v-if="showDropdown" @click="showDropdown = false" class="fixed inset-0 z-10"></div>
   </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
   transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
   opacity: 0;
   transform: translateY(-4px);
}
</style>
