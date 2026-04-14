<!-- src/modules/UserProfile/components/NotificationCenter.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '../stores/profileStore';
import type { Notification, NotificationType } from '../types/profile.types';

const props = withDefaults(defineProps<{
   mode?: 'full' | 'dropdown'
   maxItems?: number
}>(), {
   mode: 'full',
   maxItems: 50
});

const router = useRouter();
const profileStore = useProfileStore();

// Configuración por tipo
const typeConfig: Record<NotificationType, { icon: string; color: string; label: string }> = {
   message: { icon: 'fa-solid fa-envelope', color: 'text-blue-500 bg-blue-50', label: 'Mensajes' },
   approval_request: { icon: 'fa-solid fa-clipboard-question', color: 'text-amber-500 bg-amber-50', label: 'Solicitudes' },
   approval_resolved: { icon: 'fa-solid fa-clipboard-check', color: 'text-emerald-500 bg-emerald-50', label: 'Aprobaciones' },
   system: { icon: 'fa-solid fa-gear', color: 'text-slate-500 bg-slate-50', label: 'Sistema' }
};

const displayedNotifications = computed(() => {
   return profileStore.notifications.slice(0, props.maxItems);
});

const hasNotifications = computed(() => profileStore.notifications.length > 0);

// Formateo relativo con mayor énfasis
const formatRelative = (dateStr: string) => {
   if (!dateStr) return '';
   const d = new Date(dateStr);
   const now = new Date();
   const diffMs = now.getTime() - d.getTime();
   const diffMins = Math.floor(diffMs / 60000);
   if (diffMins < 1) return 'Hace un momento';
   if (diffMins < 60) return `${diffMins} min`;
   const diffHours = Math.floor(diffMins / 60);
   if (diffHours < 24) return `${diffHours} h`;
   return `${Math.floor(diffHours / 24)} d`;
};

const handleClick = (notif: Notification) => {
   if (!notif.read) {
      profileStore.markNotificationRead(notif.id);
   }
   if (notif.actionUrl) {
      router.push(notif.actionUrl);
   }
};

const handleMarkAllRead = () => {
   profileStore.markAllRead();
};

const handleDelete = (notif: Notification, event: Event) => {
   event.stopPropagation();
   profileStore.deleteNotification(notif.id);
};
</script>

<template>
   <div 
      class="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full"
      :class="mode === 'dropdown' ? 'max-h-[500px]' : ''"
   >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white">
         <div class="flex items-center gap-3">
            <div class="relative">
               <div class="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                  <i class="fa-solid fa-bell text-blue-600 text-xs"></i>
               </div>
               <span v-if="profileStore.unreadCount > 0" 
                     class="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-lg shadow-lg border-2 border-white">
                  {{ profileStore.unreadCount }}
               </span>
            </div>
            <span class="text-sm font-black text-slate-800 uppercase tracking-widest">Notificaciones</span>
         </div>
         <button 
            v-if="profileStore.unreadCount > 0"
            @click="handleMarkAllRead"
            class="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest transition-colors"
         >
            Limpiar todas
         </button>
      </div>

      <!-- Lista -->
      <div 
         class="flex-1 overflow-y-auto" 
         :class="mode === 'dropdown' ? 'max-h-96' : ''"
      >
         <!-- Empty state -->
         <div v-if="!hasNotifications" class="flex flex-col items-center justify-center py-20 text-center">
            <div class="w-16 h-16 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-4 border border-slate-100/50">
               <i class="fa-solid fa-bell-slash text-slate-200 text-2xl"></i>
            </div>
            <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Estás al día</p>
         </div>

         <!-- Items con "Aire" y Resaltados -->
         <div v-else class="p-5 space-y-4">
            <div
               v-for="notif in displayedNotifications"
               :key="notif.id"
               @click="handleClick(notif)"
               class="p-4 rounded-2xl flex items-start gap-4 transition-all cursor-pointer group relative border"
               :class="notif.read 
                  ? 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100' 
                  : 'bg-blue-50/30 border-blue-100/50 shadow-sm'"
            >
               <!-- Indicador lateral de No Leído -->
               <div v-if="!notif.read" class="absolute left-2 top-4 bottom-4 w-1 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>

               <!-- Icono Tipo -->
               <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                    :class="typeConfig[notif.type]?.color || 'text-slate-500 bg-slate-50'">
                  <i :class="typeConfig[notif.type]?.icon || 'fa-solid fa-circle-info'" class="text-sm"></i>
               </div>

               <!-- Content -->
               <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-3 mb-1">
                     <p class="text-[13px] leading-tight" :class="notif.read ? 'text-slate-600' : 'text-slate-900 font-bold'">
                        {{ notif.title }}
                     </p>
                     <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap shrink-0 mt-0.5">
                        {{ formatRelative(notif.createdAt) }}
                     </span>
                  </div>
                  
                  <p class="text-[11px] text-slate-500 leading-relaxed mb-3 line-clamp-2" :class="notif.read ? '' : 'font-medium'">
                     {{ notif.body }}
                  </p>
                  
                  <!-- Metadata Highlighting Concept -->
                  <div class="flex items-center gap-2">
                     <span v-if="notif.sourceModule" 
                           class="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-slate-200">
                        @{{ notif.sourceModule }}
                     </span>
                     <span class="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {{ typeConfig[notif.type]?.label }}
                     </span>
                  </div>
               </div>

               <!-- Delete btn -->
               <button 
                  @click="handleDelete(notif, $event)"
                  class="p-2 rounded-xl text-slate-200 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0 -mr-1"
               >
                  <i class="fa-solid fa-trash-can text-xs"></i>
               </button>
            </div>
         </div>
      </div>

      <!-- Footer (solo modo dropdown) -->
      <div v-if="mode === 'dropdown' && hasNotifications" class="px-6 py-3 border-t border-slate-50 bg-slate-50/20 text-center">
         <router-link to="/admin/profile" class="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-[0.2em] transition-all group flex items-center justify-center gap-2">
            Ver todas las notificaciones
            <i class="fa-solid fa-chevron-right text-[8px] group-hover:translate-x-1 transition-transform"></i>
         </router-link>
      </div>
   </div>
</template>
