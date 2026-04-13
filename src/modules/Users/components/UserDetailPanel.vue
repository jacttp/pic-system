<!-- src/modules/Users/components/UserDetailPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import type { UserFull } from '../types/user.types';
import UserStatusBadge from './UserStatusBadge.vue';
import UserForm from './UserForm.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const props = defineProps<{
  user: UserFull | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
  (e: 'block', user: UserFull): void;
  (e: 'delete', user: UserFull): void;
  (e: 'message', user: UserFull): void;
}>();

const userInitials = computed(() => {
  if (!props.user) return '';
  return props.user.Usuario.substring(0, 2).toUpperCase();
});

const formatRelative = (dateStr: string | null) => {
  if (!dateStr) return 'Offline';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Live';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
};
</script>

<template>
  <div class="h-full flex flex-col bg-white border-l border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-right duration-300">
    <!-- Header -->
    <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-address-card text-blue-600 opacity-60"></i>
        <h3 class="font-bold text-slate-500 text-[10px] uppercase tracking-widest">Información de Perfil</h3>
      </div>
      <Button variant="ghost" size="icon" @click="emit('close')" class="h-8 w-8 rounded-full hover:bg-slate-100 transition-colors">
        <i class="fa-solid fa-xmark text-slate-400"></i>
      </Button>
    </div>

    <!-- Content Area (Scrollable) -->
    <div v-if="user" class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      
      <!-- Profile Header Card -->
      <Card class="border-none shadow-none bg-transparent">
        <CardContent class="p-0 space-y-4">
          <div class="flex flex-col items-center text-center">
            <div 
              class="w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-slate-200 ring-4 ring-white mb-4 transition-transform hover:scale-105 duration-300"
            >
              {{ userInitials }}
            </div>
            
            <h2 class="text-xl font-black text-slate-900 leading-tight mb-1">{{ user.nombre || user.Usuario }}</h2>
            <div class="flex items-center gap-2 mb-3">
                <span class="text-[10px] text-blue-600 font-black uppercase tracking-wider">@{{ user.Usuario }}</span>
                <span v-if="user.no_emp" class="text-[10px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 italic">#{{ user.no_emp }}</span>
            </div>
            <p class="text-[9px] text-slate-300 font-mono font-bold uppercase tracking-wider mb-4">{{ user.ServerUser || 'Sin ID Servidor' }}</p>
            
            <div class="flex items-center justify-center gap-2 flex-wrap mb-4">
              <UserStatusBadge :status="user.Status || 'active'" />
              <div class="px-2.5 py-1 rounded-full bg-slate-50 text-slate-400 text-[10px] font-bold border border-slate-100 flex items-center gap-1.5 uppercase tracking-wide shadow-sm">
                <i class="fa-solid fa-clock opacity-60"></i>
                Visto {{ formatRelative(user.LastActivity) }}
              </div>
            </div>

            <!-- Quick Actions Bar -->
            <div class="flex w-full gap-2 p-1.5 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-inner">
               <Button 
                variant="ghost" 
                size="sm" 
                @click="emit('message', user)"
                class="flex-1 gap-2 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm group"
               >
                 <i class="fa-solid fa-paper-plane text-xs transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"></i>
                 <span class="text-[10px] font-bold uppercase tracking-tight">Chat</span>
               </Button>
               <Button 
                variant="ghost" 
                size="sm" 
                @click="emit('block', user)"
                class="flex-1 gap-2 rounded-xl transition-all shadow-sm"
                :class="user.Status === 'blocked' ? 'text-emerald-600 hover:bg-white' : 'text-orange-600 hover:bg-white'"
               >
                 <i :class="user.Status === 'blocked' ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock'" class="text-xs"></i>
                 <span class="text-[10px] font-bold uppercase tracking-tight">{{ user.Status === 'blocked' ? 'Liberar' : 'Bloquear' }}</span>
               </Button>
               <Button 
                variant="ghost" 
                size="sm" 
                @click="emit('delete', user)"
                class="flex-1 gap-2 text-slate-600 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm"
               >
                 <i class="fa-solid fa-trash-can text-xs"></i>
                 <span class="text-[10px] font-bold uppercase tracking-tight">Borrar</span>
               </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator class="my-2 opacity-50" />

      <!-- Consolidated Form -->
      <div class="pt-2">
         <div class="flex items-center gap-2 mb-6">
            <div class="w-1 h-4 bg-blue-600 rounded-full"></div>
            <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Configuración de Perfil</h4>
         </div>
         
         <UserForm 
            :user-to-edit="user"
            is-embedded 
            @saved="emit('saved')"
            @cancel="emit('close')" 
         />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/20">
        <div class="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-200 mb-4 animate-bounce">
            <i class="fa-solid fa-user-mouse text-3xl"></i>
        </div>
        <h4 class="text-sm font-bold text-slate-800 mb-1 tracking-tight">Carga un Usuario</h4>
        <p class="text-[11px] text-slate-400 max-w-[200px] leading-relaxed">Selecciona una fila de la tabla para gestionar perfiles y accesos.</p>
    </div>
  </div>
</template>


