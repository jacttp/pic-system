<!-- src/modules/UserProfile/components/ProfileCard.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import type { UserProfile } from '../types/profile.types';
import { ROLE_OPTIONS } from '@/modules/Users/types/user.types';
import ActivityStatus from './ActivityStatus.vue';

const props = defineProps<{
   profile: UserProfile | null
   loading: boolean
}>();

const roleLabel = computed(() => {
   if (!props.profile) return '';
   const opt = ROLE_OPTIONS.find(r => r.value === props.profile!.role);
   return opt?.label || props.profile.role;
});

const initials = computed(() => {
   if (!props.profile) return '??';
   return props.profile.username.substring(0, 2).toUpperCase();
});

const formatDate = (dateStr: string | null) => {
   if (!dateStr) return 'Sin registro';
   return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
   });
};
</script>

<template>
   <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <!-- Loading -->
      <div v-if="loading" class="animate-pulse p-6">
         <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-slate-200 rounded-2xl"></div>
            <div class="space-y-2 flex-1">
               <div class="h-5 bg-slate-200 rounded w-40"></div>
               <div class="h-3 bg-slate-100 rounded w-24"></div>
            </div>
         </div>
      </div>

      <template v-else-if="profile">
         <!-- Banner gradient -->
         <div class="h-20 bg-gradient-to-r from-indigo-500 via-purple-500 to-brand-500 relative">
            <div class="absolute -bottom-8 left-6">
               <div class="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-white text-xl font-bold">
                  {{ initials }}
               </div>
            </div>
         </div>

         <div class="pt-12 pb-6 px-6">
            <!-- Nombre y rol -->
            <div class="flex items-start justify-between mb-4">
               <div>
                  <h2 class="text-lg font-bold text-slate-800">{{ profile.username }}</h2>
                  <p v-if="profile.serverUser" class="text-xs font-mono text-slate-400 mt-0.5">{{ profile.serverUser }}</p>
               </div>
               <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200">
                  <i class="fa-solid fa-shield-halved text-[10px]"></i>
                  {{ roleLabel }}
               </span>
            </div>

            <!-- Info grid -->
            <div class="space-y-3">
               <div class="flex items-center gap-3 text-sm">
                  <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                     <i class="fa-solid fa-building text-blue-500 text-xs"></i>
                  </div>
                  <div>
                     <p class="text-xs text-slate-400">Gerencia</p>
                     <p class="font-medium text-slate-700">{{ profile.gerencia }}</p>
                  </div>
               </div>

               <div class="flex items-center gap-3 text-sm">
                  <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                     <i class="fa-solid fa-map-location-dot text-emerald-500 text-xs"></i>
                  </div>
                  <div>
                     <p class="text-xs text-slate-400">Zona</p>
                     <p class="font-medium text-slate-700">{{ profile.zona }}</p>
                  </div>
               </div>

               <div class="flex items-center gap-3 text-sm">
                  <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                     <i class="fa-solid fa-layer-group text-amber-500 text-xs"></i>
                  </div>
                  <div>
                     <p class="text-xs text-slate-400">Nivel de Acceso</p>
                     <div class="flex items-center gap-1 mt-0.5">
                        <template v-for="i in 4" :key="i">
                           <div 
                              class="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                              :class="i <= (profile.accessLevel || 1)
                                 ? 'bg-amber-500 text-white' 
                                 : 'bg-amber-100 text-amber-300'"
                           >{{ i }}</div>
                        </template>
                     </div>
                  </div>
               </div>

               <div class="flex items-center gap-3 text-sm">
                  <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                     <i class="fa-solid fa-clock text-slate-400 text-xs"></i>
                  </div>
                  <div>
                     <p class="text-xs text-slate-400">Última actividad</p>
                     <p class="font-medium text-slate-600 text-xs">{{ formatDate(profile.lastActivity) }}</p>
                  </div>
               </div>
            </div>

            <!-- Estado de presencia -->
            <div class="mt-5 pt-5 border-t border-slate-100">
               <ActivityStatus />
            </div>
         </div>
      </template>
   </div>
</template>
