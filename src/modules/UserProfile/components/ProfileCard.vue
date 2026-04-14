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
   // Preferir iniciales del nombre completo si existe
   const name = props.profile.nombre || props.profile.username;
   const parts = name.split(' ');
   if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
   }
   return name.substring(0, 2).toUpperCase();
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
   <div class="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden relative">
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
         <!-- Premium Banner Area -->
         <div class="relative h-28">
            <!-- Background with Mesh (No overflow-hidden here to allow avatar to pop) -->
            <div class="absolute inset-0 bg-slate-900 overflow-hidden">
               <div class="absolute inset-0 bg-gradient-to-tr from-indigo-900 via-slate-900 to-blue-900 opacity-80"></div>
               <div class="absolute -top-[10%] -left-[10%] w-[60%] h-[120%] bg-blue-600/20 blur-[60px] rounded-full animate-pulse"></div>
               <div class="absolute -bottom-[20%] -right-[10%] w-[50%] h-[100%] bg-purple-600/20 blur-[60px] rounded-full"></div>
               <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 15px 15px;"></div>
            </div>

            <!-- Avatar (Moved to follow the Card Flow, avoiding banner clipping) -->
            <div class="absolute -bottom-8 left-6 z-20">
               <div class="w-16 h-16 rounded-2xl bg-white p-1 shadow-2xl shadow-slate-900/10">
                  <div class="w-full h-full rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white text-lg font-black tracking-tight shadow-inner">
                     {{ initials }}
                  </div>
               </div>
            </div>

            <!-- Badge No Emp -->
            <div v-if="profile.no_emp" class="absolute top-4 right-5 px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl leading-none">
               <span class="text-[9px] font-black text-white/80 tracking-widest uppercase">#{{ profile.no_emp }}</span>
            </div>
         </div>

         <!-- Content Body -->
         <div class="pt-10 pb-6 px-6">
            <!-- Header Info -->
            <div class="mb-8 pr-2">
               <div class="flex flex-col gap-1 mb-3">
                  <h2 class="text-xl font-black text-slate-900 truncate tracking-tight">{{ profile.nombre || profile.username }}</h2>
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                     <span class="text-[9px] font-black text-blue-600 uppercase tracking-widest">@{{ profile.username }}</span>
                     <span class="w-1 h-1 rounded-full bg-slate-200"></span>
                     <span class="text-[9px] font-bold text-slate-300 uppercase tracking-tight break-all">{{ profile.serverUser }}</span>
                  </div>
               </div>
               
               <!-- Role Badge (Wrapped to prevent overflow) -->
               <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 shadow-lg shadow-slate-100">
                  <i class="fa-solid fa-shield-halved text-blue-400 text-[8px]"></i>
                  <span class="text-[9px] font-black text-white uppercase tracking-widest">{{ roleLabel }}</span>
               </div>
            </div>

            <!-- Info Grid -->
            <div class="space-y-4 mb-8">
               <div class="flex items-center gap-4">
                  <div class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                     <i class="fa-solid fa-building text-slate-400 text-xs"></i>
                  </div>
                  <div class="min-w-0">
                     <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Gerencia Regional</p>
                     <p class="text-xs font-extrabold text-slate-800 truncate">{{ profile.Gerencia || 'Sin asignar' }}</p>
                  </div>
               </div>

               <div class="flex items-center gap-4">
                  <div class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                     <i class="fa-solid fa-map-location-dot text-slate-400 text-xs"></i>
                  </div>
                  <div class="min-w-0">
                     <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Jefatura Administrativa</p>
                     <p class="text-xs font-extrabold text-slate-800 truncate">{{ profile.jefatura || 'Sin asignar' }}</p>
                  </div>
               </div>

               <div class="flex items-center gap-4">
                  <div class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                     <i class="fa-solid fa-layer-group text-slate-400 text-xs"></i>
                  </div>
                  <div>
                     <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Nivel de Acceso</p>
                     <div class="flex items-center gap-1 mt-1">
                        <template v-for="i in 4" :key="i">
                           <div 
                              class="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black transition-all"
                              :class="i <= (profile.accessLevel || 1)
                                 ? 'bg-slate-900 text-blue-400 shadow-md ring-1 ring-slate-800' 
                                 : 'bg-slate-100 text-slate-200'"
                           >{{ i }}</div>
                        </template>
                     </div>
                  </div>
               </div>

               <div class="flex items-center gap-4">
                  <div class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                     <i class="fa-solid fa-clock-rotate-left text-slate-400 text-xs"></i>
                  </div>
                  <div class="min-w-0">
                     <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Último Acceso</p>
                     <p class="text-[10px] font-extrabold text-slate-500 capitalize truncate">{{ formatDate(profile.lastActivity) }}</p>
                  </div>
               </div>
            </div>

            <!-- Presence Area -->
            <div class="pt-6 border-t border-slate-100">
               <ActivityStatus />
            </div>
         </div>
      </template>
   </div>
</template>

