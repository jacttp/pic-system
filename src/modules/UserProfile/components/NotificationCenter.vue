<!-- src/modules/UserProfile/components/NotificationCenter.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '../stores/profileStore';
import type { Notification, NotificationType } from '../types/profile.types';
import type { RouteLocationRaw } from 'vue-router';

const props = withDefaults(defineProps<{
   mode?: 'full' | 'dropdown' | 'summary'
   maxItems?: number
}>(), {
   mode: 'full',
   maxItems: 50
});

const emit = defineEmits<{
   navigate: []
}>();

const router = useRouter();
const profileStore = useProfileStore();

// Configuración por tipo
const typeConfig: Record<NotificationType, { icon: string; color: string; label: string }> = {
   message: { icon: 'fa-solid fa-envelope', color: 'text-slate-500 bg-slate-100', label: 'Mensaje' },
   approval_request: { icon: 'fa-solid fa-clipboard-question', color: 'text-amber-700 bg-amber-50', label: 'Solicitud' },
   approval_resolved: { icon: 'fa-solid fa-clipboard-check', color: 'text-emerald-700 bg-emerald-50', label: 'Resuelta' },
   system: { icon: 'fa-solid fa-gear', color: 'text-slate-500 bg-slate-100', label: 'Sistema' }
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

   const target = resolveNotificationTarget(notif);
   if (target) {
      router.push(target);
      emit('navigate');
   }
};

const resolveNotificationTarget = (notif: Notification): RouteLocationRaw | null => {
   const rawUrl = notif.actionUrl?.trim();

   if (!rawUrl) {
      return notif.type === 'approval_request' || notif.type === 'approval_resolved'
         ? { name: 'approvals' }
         : null;
   }

   let path = rawUrl;
   let search = '';

   try {
      const parsed = new URL(rawUrl, window.location.origin);
      path = parsed.pathname;
      search = parsed.search;
   } catch {
      const [rawPath, rawSearch = ''] = rawUrl.split('?');
      path = rawPath || '';
      search = rawSearch ? `?${rawSearch}` : '';
   }

   const approvalMatch = path.match(/^\/?approvals\/?(\d+)?$/);
   if (approvalMatch) {
      return approvalMatch[1]
         ? { name: 'approvals', query: { approvalId: approvalMatch[1] } }
         : { name: 'approvals' };
   }

   if (path === '/approvals') {
      return { name: 'approvals' };
   }

   if (path.startsWith('/admin')) {
      return `${path}${search}`;
   }

   if (path.startsWith('admin/')) {
      return `/${path}${search}`;
   }

   return path.startsWith('/') ? `${path}${search}` : `/${path}${search}`;
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
      v-if="mode === 'dropdown'"
      class="flex h-[min(640px,calc(100vh-1rem))] w-full flex-col overflow-hidden rounded-r-xl border border-l-0 border-slate-200 bg-white shadow-[12px_0_34px_rgba(15,23,42,0.10)]"
   >
      <div class="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 px-5">
         <div class="min-w-0">
            <h3 class="text-base font-bold leading-5 text-slate-950">Notificaciones</h3>
            <p class="mt-0.5 text-xs leading-4 text-slate-500">
               {{ profileStore.unreadCount > 0 ? `${profileStore.unreadCount} sin leer` : 'Todo al dia' }}
            </p>
         </div>

         <button
            v-if="profileStore.unreadCount > 0"
            @click="handleMarkAllRead"
            class="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
         >
            Marcar leidas
         </button>
      </div>

      <div v-if="!hasNotifications" class="flex flex-1 flex-col items-center justify-center px-8 py-10 text-center">
         <div class="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
            <i class="fa-solid fa-bell-slash text-sm"></i>
         </div>
         <p class="text-sm font-semibold text-slate-700">Sin notificaciones</p>
         <p class="mt-1 text-xs leading-5 text-slate-500">Las solicitudes y avisos apareceran aqui.</p>
      </div>

      <div v-else class="min-h-0 flex-1 overflow-y-auto">
         <button
            v-for="notif in displayedNotifications"
            :key="notif.id"
            @click="handleClick(notif)"
            class="group flex w-full items-start gap-3 border-b border-slate-100 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50"
            :class="!notif.read ? 'bg-slate-50/70' : 'bg-white'"
         >
            <span
               class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
               :class="typeConfig[notif.type]?.color || 'text-slate-500 bg-slate-100'"
            >
               <i :class="typeConfig[notif.type]?.icon || 'fa-solid fa-circle-info'" class="text-sm"></i>
            </span>

            <span class="min-w-0 flex-1">
               <span class="flex items-start gap-3">
                  <span class="min-w-0 flex-1 text-sm font-semibold leading-5" :class="notif.read ? 'text-slate-700' : 'text-slate-950'">
                     {{ notif.title }}
                  </span>
                  <span class="shrink-0 pt-0.5 text-xs font-medium leading-4 text-slate-400">
                     {{ formatRelative(notif.createdAt) }}
                  </span>
               </span>

               <span class="mt-1 block line-clamp-2 text-sm leading-5 text-slate-500">
                  {{ notif.body }}
               </span>

               <span class="mt-2.5 flex items-center gap-2">
                  <span
                     v-if="!notif.read"
                     class="h-2 w-2 rounded-full bg-brand-600"
                     aria-hidden="true"
                  ></span>
                  <span class="text-xs font-medium leading-4 text-slate-400">
                     {{ notif.sourceModule || typeConfig[notif.type]?.label }}
                  </span>
               </span>
            </span>

            <button
               @click="handleDelete(notif, $event)"
               class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
               title="Eliminar notificacion"
            >
               <i class="fa-solid fa-xmark text-xs"></i>
            </button>
         </button>
      </div>

      <div class="border-t border-slate-200 bg-white px-4 py-3">
         <router-link
            to="/admin/profile"
            @click="emit('navigate')"
            class="flex items-center justify-between rounded-md px-2 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
         >
            <span>Ver todas las notificaciones</span>
            <i class="fa-solid fa-chevron-right text-[10px] text-slate-400"></i>
         </router-link>
      </div>
   </div>

   <div
      v-if="mode === 'summary'"
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
   >
      <div class="border-b border-slate-100 px-5 py-4">
         <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
               <div class="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <i class="fa-solid fa-bell text-sm"></i>
                  <span
                     v-if="profileStore.unreadCount > 0"
                     class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-sky-500 px-1 text-[9px] font-black text-white"
                  >
                     {{ profileStore.unreadCount }}
                  </span>
               </div>
               <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Avisos</p>
                  <h3 class="text-sm font-black text-slate-900">Senales recientes</h3>
               </div>
            </div>

            <button
               v-if="profileStore.unreadCount > 0"
               @click="handleMarkAllRead"
               class="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest text-sky-600 transition-colors hover:bg-sky-50"
            >
               Leidas
            </button>
         </div>
      </div>

      <div v-if="!hasNotifications" class="px-5 py-8 text-center">
         <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
            <i class="fa-solid fa-bell-slash text-lg"></i>
         </div>
         <p class="text-[11px] font-black uppercase tracking-widest text-slate-400">Sin avisos nuevos</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
         <button
            v-for="notif in displayedNotifications"
            :key="notif.id"
            @click="handleClick(notif)"
            class="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50"
         >
            <span
               class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
               :class="typeConfig[notif.type]?.color || 'text-slate-500 bg-slate-50'"
            >
               <i :class="typeConfig[notif.type]?.icon || 'fa-solid fa-circle-info'" class="text-xs"></i>
            </span>
            <span class="min-w-0 flex-1">
               <span class="flex items-start justify-between gap-2">
                  <span class="truncate text-sm font-black" :class="notif.read ? 'text-slate-600' : 'text-slate-900'">
                     {{ notif.title }}
                  </span>
                  <span class="shrink-0 text-[9px] font-black uppercase tracking-widest text-slate-400">
                     {{ formatRelative(notif.createdAt) }}
                  </span>
               </span>
               <span class="mt-1 block line-clamp-2 text-xs font-medium leading-5 text-slate-500">
                  {{ notif.body }}
               </span>
            </span>
         </button>
      </div>

      <div v-if="hasNotifications" class="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
         <router-link
            to="/admin/profile"
            class="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-900"
         >
            Ver historial
            <i class="fa-solid fa-chevron-right text-[8px]"></i>
         </router-link>
      </div>
   </div>

   <div 
      v-else-if="mode === 'full'"
      class="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full"
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
