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
   approval_request: { icon: 'fa-solid fa-truck', color: 'text-red-700 bg-red-50', label: 'Solicitud' },
   approval_resolved: { icon: 'fa-solid fa-circle-check', color: 'text-emerald-700 bg-emerald-50', label: 'Resuelta' },
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

const handleRowKeydown = (notif: Notification, event: KeyboardEvent) => {
   if (event.key !== 'Enter' && event.key !== ' ') return;
   event.preventDefault();
   handleClick(notif);
};
</script>

<template>
   <div
      v-if="mode === 'dropdown'"
      class="flex max-h-[min(560px,calc(100vh-5rem))] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-100"
   >
      <div class="relative flex min-h-16 items-center justify-between gap-3 border-b border-slate-100 px-5">
         <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
         <div class="min-w-0 pl-1">
            <p class="text-[10px] font-black uppercase text-red-600">Avisos</p>
            <h3 class="mt-1 text-sm font-black leading-5 text-slate-900">Notificaciones</h3>
            <p class="mt-0.5 text-xs font-semibold leading-4 text-slate-500">
               {{ profileStore.unreadCount > 0 ? `${profileStore.unreadCount} sin leer` : 'Todo al dia' }}
            </p>
         </div>

         <button
            v-if="profileStore.unreadCount > 0"
            @click="handleMarkAllRead"
            class="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-black text-red-700 transition-colors hover:bg-red-50/70"
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

      <div v-else class="min-h-0 flex-1 overflow-y-auto bg-slate-50/50 p-2.5">
         <div
            v-for="notif in displayedNotifications"
            :key="notif.id"
            role="button"
            tabindex="0"
            @click="handleClick(notif)"
            @keydown="handleRowKeydown(notif, $event)"
            class="group relative mb-2.5 flex w-full items-start gap-3 rounded-lg border p-3.5 text-left transition last:mb-0 hover:border-red-100 hover:bg-red-50/20"
            :class="!notif.read ? 'border-red-100 bg-white shadow-sm shadow-red-100/40' : 'border-slate-200 bg-white shadow-sm shadow-slate-100'"
         >
            <span
               v-if="!notif.read"
               class="absolute inset-y-3 left-0 w-1 rounded-r-full bg-red-600"
               aria-hidden="true"
            ></span>

            <span
               class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
               :class="typeConfig[notif.type]?.color || 'text-slate-500 bg-slate-100'"
            >
               <i :class="typeConfig[notif.type]?.icon || 'fa-solid fa-circle-info'" class="text-sm"></i>
            </span>

            <span class="min-w-0 flex-1 pr-7">
               <span class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <span class="min-w-0 text-[13px] font-black leading-5" :class="notif.read ? 'text-slate-700' : 'text-slate-950'">
                     {{ notif.title }}
                  </span>
                  <span class="shrink-0 text-[10px] font-black uppercase leading-4 text-slate-400">
                     {{ formatRelative(notif.createdAt) }}
                  </span>
               </span>

               <span class="mt-1.5 block line-clamp-3 whitespace-normal break-words text-xs font-semibold leading-5 text-slate-500">
                  {{ notif.body }}
               </span>

               <span class="mt-3 flex flex-wrap items-center gap-2">
                  <span class="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase leading-none text-slate-500">
                     {{ notif.sourceModule || typeConfig[notif.type]?.label }}
                  </span>
                  <span
                     v-if="!notif.read"
                     class="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[10px] font-black uppercase leading-none text-red-700"
                  >
                     Sin leer
                  </span>
               </span>
            </span>

            <button
               @click="handleDelete(notif, $event)"
               class="absolute right-2.5 top-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-300 opacity-100 transition-all hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
               title="Eliminar notificacion"
            >
               <i class="fa-solid fa-xmark text-xs"></i>
            </button>
         </div>
      </div>

      <div class="border-t border-slate-100 bg-white px-4 py-3">
         <router-link
            to="/admin/profile"
            @click="emit('navigate')"
            class="flex items-center justify-between rounded-md px-2 py-2 text-sm font-black text-slate-600 transition-colors hover:bg-red-50/30 hover:text-red-700"
         >
            <span>Ver todas las notificaciones</span>
            <i class="fa-solid fa-chevron-right text-[10px] text-slate-400"></i>
         </router-link>
      </div>
   </div>

   <div
      v-if="mode === 'summary'"
      class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-100"
   >
      <div class="border-b border-slate-100 px-5 py-4">
         <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
               <div class="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <i class="fa-solid fa-bell text-sm"></i>
                  <span
                     v-if="profileStore.unreadCount > 0"
                     class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[9px] font-black text-white"
                  >
                     {{ profileStore.unreadCount }}
                  </span>
               </div>
               <div>
                  <p class="text-[10px] font-black uppercase text-red-600">Avisos</p>
                  <h3 class="text-sm font-black text-slate-900">Senales recientes</h3>
               </div>
            </div>

            <button
               v-if="profileStore.unreadCount > 0"
               @click="handleMarkAllRead"
               class="rounded-lg px-2 py-1 text-[10px] font-black uppercase text-red-700 transition-colors hover:bg-red-50/70"
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
            class="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-red-50/20"
         >
            <span
               class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
               :class="typeConfig[notif.type]?.color || 'text-slate-500 bg-slate-50'"
            >
               <i :class="typeConfig[notif.type]?.icon || 'fa-solid fa-circle-info'" class="text-xs"></i>
            </span>
            <span class="min-w-0 flex-1">
               <span class="flex items-start justify-between gap-2">
                  <span class="min-w-0 text-sm font-black leading-5" :class="notif.read ? 'text-slate-600' : 'text-slate-900'">
                     {{ notif.title }}
                  </span>
                  <span class="shrink-0 text-[10px] font-black uppercase text-slate-400">
                     {{ formatRelative(notif.createdAt) }}
                  </span>
               </span>
               <span class="mt-1.5 block line-clamp-3 break-words text-xs font-semibold leading-5 text-slate-500">
                  {{ notif.body }}
               </span>
            </span>
         </button>
      </div>

      <div v-if="hasNotifications" class="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
         <router-link
            to="/admin/profile"
            class="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-500 transition-colors hover:text-red-700"
         >
            Ver historial
            <i class="fa-solid fa-chevron-right text-[8px]"></i>
         </router-link>
      </div>
   </div>

   <div 
      v-else-if="mode === 'full'"
      class="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-100"
   >
      <!-- Header -->
      <div class="relative flex items-center justify-between border-b border-slate-100 px-6 py-4">
         <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
         <div class="flex items-center gap-3">
            <div class="relative">
               <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-700">
                  <i class="fa-solid fa-bell text-xs"></i>
               </div>
               <span v-if="profileStore.unreadCount > 0" 
                     class="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-lg border-2 border-white bg-red-600 text-[9px] font-black text-white shadow-sm">
                  {{ profileStore.unreadCount }}
               </span>
            </div>
            <span class="text-sm font-black text-slate-900">Notificaciones</span>
         </div>
         <button 
            v-if="profileStore.unreadCount > 0"
            @click="handleMarkAllRead"
            class="rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase text-red-700 transition-colors hover:bg-red-50/70"
         >
            Limpiar todas
         </button>
      </div>

      <!-- Lista -->
      <div class="flex-1 overflow-y-auto">
         <!-- Empty state -->
         <div v-if="!hasNotifications" class="flex flex-col items-center justify-center py-20 text-center">
            <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
               <i class="fa-solid fa-bell-slash text-slate-200 text-2xl"></i>
            </div>
            <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Estás al día</p>
         </div>

          <!-- Items -->
         <div v-else class="p-5 space-y-4">
            <div
               v-for="notif in displayedNotifications"
               :key="notif.id"
               @click="handleClick(notif)"
               class="group relative flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-all"
               :class="notif.read 
                  ? 'border-slate-100 bg-white hover:border-red-100 hover:bg-red-50/20' 
                  : 'border-red-100 bg-white shadow-sm shadow-red-100/40'"
            >
               <!-- Indicador lateral de No Leído -->
               <div v-if="!notif.read" class="absolute bottom-4 left-0 top-4 w-1 rounded-r-full bg-red-600"></div>

               <!-- Icono Tipo -->
               <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    :class="typeConfig[notif.type]?.color || 'text-slate-500 bg-slate-50'">
                  <i :class="typeConfig[notif.type]?.icon || 'fa-solid fa-circle-info'" class="text-sm"></i>
               </div>

               <!-- Content -->
               <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-3 mb-1">
                     <p class="text-[13px] font-black leading-5" :class="notif.read ? 'text-slate-600' : 'text-slate-900'">
                        {{ notif.title }}
                     </p>
                     <span class="mt-0.5 shrink-0 whitespace-nowrap text-[10px] font-black uppercase text-slate-400">
                        {{ formatRelative(notif.createdAt) }}
                     </span>
                  </div>
                  
                  <p class="mb-3 line-clamp-3 text-xs font-semibold leading-5 text-slate-500">
                     {{ notif.body }}
                  </p>
                  
                  <!-- Metadata Highlighting Concept -->
                  <div class="flex items-center gap-2">
                     <span v-if="notif.sourceModule" 
                           class="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase leading-none text-slate-500">
                        @{{ notif.sourceModule }}
                     </span>
                     <span class="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase leading-none text-slate-500">
                        {{ typeConfig[notif.type]?.label }}
                     </span>
                  </div>
               </div>

               <!-- Delete btn -->
               <button 
                  @click="handleDelete(notif, $event)"
                  class="-mr-1 shrink-0 rounded-lg p-2 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
               >
                  <i class="fa-solid fa-trash-can text-xs"></i>
               </button>
            </div>
         </div>
      </div>

   </div>
</template>
