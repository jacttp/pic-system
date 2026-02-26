<!-- src/modules/Users/components/UserTable.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import type { UserFull } from '../types/user.types';
import UserStatusBadge from './UserStatusBadge.vue';
import { ROLE_OPTIONS } from '../types/user.types';

const props = defineProps<{
   users: UserFull[]
   loading: boolean
}>();

const emit = defineEmits<{
   (e: 'edit', user: UserFull): void
   (e: 'delete', user: UserFull): void
   (e: 'block', user: UserFull): void
   (e: 'view', user: UserFull): void
   (e: 'message', user: UserFull): void
}>();

// Mapeo visual de roles
const roleLabelMap = computed(() => {
   const map: Record<string, string> = {};
   ROLE_OPTIONS.forEach(r => { map[r.value] = r.label; });
   return map;
});

// Badge de rol con colores
const getRoleBadge = (role: string) => {
   switch (role) {
      case 'SuperAdmin': return { classes: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'fa-solid fa-crown' };
      case 'Admin': return { classes: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'fa-solid fa-shield-halved' };
      case 'JefeGerentes': return { classes: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'fa-solid fa-user-tie' };
      default: return { classes: 'bg-slate-50 text-slate-600 border-slate-200', icon: 'fa-solid fa-user' };
   }
};

// Formatear fecha
const formatDate = (dateStr: string | null) => {
   if (!dateStr) return '—';
   const d = new Date(dateStr);
   return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatActivity = (dateStr: string | null) => {
   if (!dateStr) return 'Sin actividad';
   const d = new Date(dateStr);
   const now = new Date();
   const diffMs = now.getTime() - d.getTime();
   const diffMins = Math.floor(diffMs / 60000);
   
   if (diffMins < 1) return 'Justo ahora';
   if (diffMins < 60) return `Hace ${diffMins} min`;
   const diffHours = Math.floor(diffMins / 60);
   if (diffHours < 24) return `Hace ${diffHours}h`;
   const diffDays = Math.floor(diffHours / 24);
   return `Hace ${diffDays}d`;
};
</script>

<template>
   <div class="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
      <!-- Loading state -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-16 gap-3">
         <div class="w-9 h-9 rounded-full border-[3px] border-purple-200 border-t-purple-600 animate-spin"></div>
         <span class="text-sm text-slate-400 font-medium">Cargando usuarios…</span>
      </div>

      <!-- Empty state -->
      <div v-else-if="users.length === 0" class="flex flex-col items-center justify-center py-16 gap-3">
         <div class="w-14 h-14 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-300">
            <i class="fa-solid fa-users text-2xl"></i>
         </div>
         <p class="text-sm font-semibold text-slate-500">No se encontraron usuarios</p>
      </div>

      <!-- Table -->
      <table v-else class="w-full">
         <thead>
            <tr class="bg-slate-800">
               <th class="text-left px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider">Usuario</th>
               <th class="text-left px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider">Rol</th>
               <th class="text-left px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider">Zona</th>
               <th class="text-center px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider">Estado</th>
               <th class="text-center px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider">Actividad</th>
               <th class="text-right px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider">Acciones</th>
            </tr>
         </thead>
         <tbody class="divide-y divide-slate-100">
            <tr 
               v-for="user in users" 
               :key="user.IdUser"
               class="group border-b border-slate-100 last:border-0 hover:bg-purple-50/30 transition-colors duration-100 cursor-pointer"
               @click="emit('view', user)"
            >
               <!-- Usuario -->
               <td class="px-4 py-3.5">
                  <div class="flex items-center gap-3">
                     <div class="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                        {{ user.Usuario.substring(0, 2).toUpperCase() }}
                     </div>
                     <div>
                        <p class="font-semibold text-slate-800 text-sm">{{ user.Usuario }}</p>
                        <p v-if="user.ServerUser" class="text-xs text-slate-400 font-mono">{{ user.ServerUser }}</p>
                     </div>
                  </div>
               </td>

               <!-- Rol -->
               <td class="px-4 py-3.5">
                  <span
                     class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                     :class="getRoleBadge(user.TipoUser).classes"
                  >
                     <i :class="getRoleBadge(user.TipoUser).icon" class="text-[10px]"></i>
                     {{ roleLabelMap[user.TipoUser] || user.TipoUser }}
                  </span>
               </td>

               <!-- Zona -->
               <td class="px-4 py-3.5">
                  <span class="text-sm text-slate-600">{{ user.Zona }}</span>
               </td>

               <!-- Estado -->
               <td class="px-4 py-3.5 text-center">
                  <UserStatusBadge :status="user.Status || 'active'" />
               </td>

               <!-- Actividad -->
               <td class="px-4 py-3.5 text-center">
                  <span class="text-xs text-slate-500">{{ formatActivity(user.LastActivity) }}</span>
               </td>

               <!-- Acciones -->
               <td class="px-4 py-3.5 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                        @click="emit('edit', user)"
                        class="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                     >
                        <i class="fa-solid fa-pen-to-square text-sm"></i>
                     </button>
                     <button 
                        @click="emit('message', user)"
                        class="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Enviar mensaje"
                     >
                        <i class="fa-solid fa-paper-plane text-sm"></i>
                     </button>
                     <button 
                        @click="emit('block', user)"
                        class="p-2 rounded-lg text-slate-400 transition-colors"
                        :class="user.Status === 'blocked' ? 'hover:text-emerald-600 hover:bg-emerald-50' : 'hover:text-orange-600 hover:bg-orange-50'"
                        :title="user.Status === 'blocked' ? 'Desbloquear' : 'Bloquear'"
                     >
                        <i :class="user.Status === 'blocked' ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock'" class="text-sm"></i>
                     </button>
                     <button 
                        @click="emit('delete', user)"
                        class="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                     >
                        <i class="fa-solid fa-trash-can text-sm"></i>
                     </button>
                  </div>
               </td>
            </tr>
         </tbody>
      </table>
   </div>
</template>
