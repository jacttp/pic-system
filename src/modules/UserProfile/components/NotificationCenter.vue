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

// Formateo relativo
const formatRelative = (dateStr: string) => {
   const d = new Date(dateStr);
   const now = new Date();
   const diffMs = now.getTime() - d.getTime();
   const diffMins = Math.floor(diffMs / 60000);
   if (diffMins < 1) return 'Ahora';
   if (diffMins < 60) return `${diffMins}m`;
   const diffHours = Math.floor(diffMins / 60);
   if (diffHours < 24) return `${diffHours}h`;
   return `${Math.floor(diffHours / 24)}d`;
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
      class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      :class="mode === 'dropdown' ? 'max-h-96' : ''"
   >
      <!-- Header -->
      <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
         <div class="flex items-center gap-2">
            <i class="fa-solid fa-bell text-blue-500"></i>
            <span class="text-sm font-semibold text-slate-700">Notificaciones</span>
            <span v-if="profileStore.unreadCount > 0" class="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
               {{ profileStore.unreadCount }}
            </span>
         </div>
         <button 
            v-if="profileStore.unreadCount > 0"
            @click="handleMarkAllRead"
            class="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
         >
            Marcar todas leídas
         </button>
      </div>

      <!-- Lista -->
      <div :class="mode === 'dropdown' ? 'max-h-72 overflow-y-auto' : 'max-h-[500px] overflow-y-auto'">
         <!-- Empty state -->
         <div v-if="!hasNotifications" class="flex flex-col items-center justify-center py-12 text-slate-400">
            <i class="fa-solid fa-bell-slash text-3xl mb-3"></i>
            <p class="text-sm font-medium">Sin notificaciones</p>
            <p class="text-xs mt-1">Estás al día 🎉</p>
         </div>

         <!-- Items -->
         <div v-else class="divide-y divide-slate-50">
            <div
               v-for="notif in displayedNotifications"
               :key="notif.id"
               @click="handleClick(notif)"
               class="px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer group"
               :class="notif.read ? 'hover:bg-slate-50/50' : 'bg-blue-50/30 hover:bg-blue-50/60'"
            >
               <!-- Icono tipo -->
               <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    :class="typeConfig[notif.type]?.color || 'text-slate-500 bg-slate-50'">
                  <i :class="typeConfig[notif.type]?.icon || 'fa-solid fa-circle-info'" class="text-xs"></i>
               </div>

               <!-- Content -->
               <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                     <p class="text-sm leading-tight" :class="notif.read ? 'text-slate-600' : 'text-slate-800 font-semibold'">
                        {{ notif.title }}
                     </p>
                     <span class="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                        {{ formatRelative(notif.createdAt) }}
                     </span>
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5 line-clamp-2">{{ notif.body }}</p>
                  <div class="flex items-center gap-2 mt-1">
                     <span v-if="notif.sourceModule" class="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {{ notif.sourceModule }}
                     </span>
                     <span v-if="!notif.read" class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  </div>
               </div>

               <!-- Delete btn -->
               <button 
                  @click="handleDelete(notif, $event)"
                  class="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
               >
                  <i class="fa-solid fa-xmark text-xs"></i>
               </button>
            </div>
         </div>
      </div>

      <!-- Footer (solo modo dropdown) -->
      <div v-if="mode === 'dropdown' && hasNotifications" class="px-4 py-2.5 border-t border-slate-100 text-center">
         <router-link to="/admin/profile" class="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
            Ver todas las notificaciones
         </router-link>
      </div>
   </div>
</template>
