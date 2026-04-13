<!-- src/modules/Users/components/UserTable.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import type { UserFull } from '../types/user.types';
import UserStatusBadge from './UserStatusBadge.vue';
import { ROLE_OPTIONS } from '../types/user.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const props = defineProps<{
  users: UserFull[];
  loading: boolean;
  selectedUserId?: number | null;
}>();

const emit = defineEmits<{
  (e: 'edit', user: UserFull): void;
  (e: 'delete', user: UserFull): void;
  (e: 'block', user: UserFull): void;
  (e: 'select', user: UserFull): void;
  (e: 'message', user: UserFull): void;
}>();

// Mapeo visual de roles
const roleLabelMap = computed(() => {
  const map: Record<string, string> = {};
  ROLE_OPTIONS.forEach((r) => {
    map[r.value] = r.label;
  });
  return map;
});

// Badge de rol con colores neutros y azules
const getRoleBadgeConfig = (role: string) => {
  switch (role) {
    case 'SuperAdmin':
      return { 
        class: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50', 
        icon: 'fa-solid fa-crown',
        label: 'Super Admin'
      };
    case 'Admin':
      return { 
        class: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50', 
        icon: 'fa-solid fa-shield-halved',
        label: 'Administrador'
      };
    case 'JefeGerentes':
      return { 
        class: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50', 
        icon: 'fa-solid fa-user-tie',
        label: 'Jefe de Zona'
      };
    default:
      return { 
        class: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-50', 
        icon: 'fa-solid fa-user',
        label: roleLabelMap.value[role] || role
      };
  }
};

const formatActivity = (dateStr: string | null) => {
  if (!dateStr) return 'Sin actividad';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Justo ahora';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
    <Table>
      <TableHeader class="bg-slate-50/50">
        <TableRow class="hover:bg-transparent">
          <TableHead class="w-[300px] font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-6">Usuario & Nombre</TableHead>
          <TableHead class="font-bold text-slate-500 uppercase text-[10px] tracking-widest">No. Emp / Rol</TableHead>
          <TableHead class="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Zona</TableHead>
          <TableHead class="text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest pr-6">Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="loading">
          <TableCell colspan="4" class="h-32 text-center">
            <div class="flex flex-col items-center justify-center gap-2">
              <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-500"></i>
              <span class="text-sm text-slate-400 font-medium">Cargando usuarios...</span>
            </div>
          </TableCell>
        </TableRow>

        <TableRow v-else-if="users.length === 0">
          <TableCell colspan="4" class="h-32 text-center">
            <div class="flex flex-col items-center justify-center gap-2 text-slate-400">
              <i class="fa-solid fa-users-slash text-3xl mb-1"></i>
              <p class="text-sm font-medium">No se encontraron usuarios</p>
            </div>
          </TableCell>
        </TableRow>

        <TableRow
          v-else
          v-for="user in users"
          :key="user.IdUser"
          @click="emit('select', user)"
          :class="cn(
            'group cursor-pointer transition-all duration-200',
            selectedUserId === user.IdUser ? 'bg-blue-50/50 hover:bg-blue-50/80 shadow-[inset_4px_0_0_0_rgb(59,130,246)]' : 'hover:bg-slate-50/80'
          )"
        >
          <TableCell class="pl-6">
            <div class="flex items-center gap-3">
              <div 
                class="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white transition-transform group-hover:scale-105"
              >
                {{ user.Usuario.substring(0, 2).toUpperCase() }}
              </div>
              <div class="overflow-hidden">
                <p class="font-bold text-slate-900 leading-none mb-1 truncate max-w-[200px]">{{ user.nombre || user.Usuario }}</p>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] text-blue-600 font-black uppercase">@{{ user.Usuario }}</span>
                    <span class="text-[10px] text-slate-300 font-mono hidden sm:inline">{{ user.ServerUser || '' }}</span>
                </div>
              </div>
            </div>
          </TableCell>

          <TableCell>
            <div class="flex flex-col gap-1.5 w-fit">
              <div class="flex items-center gap-2">
                   <span class="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none">#{{ user.no_emp || '---' }}</span>
                   <Badge 
                    variant="outline" 
                    :class="cn('text-[9px] uppercase tracking-wider font-bold py-0 h-4 border shadow-sm', getRoleBadgeConfig(user.TipoUser).class)"
                  >
                    {{ getRoleBadgeConfig(user.TipoUser).label }}
                  </Badge>
              </div>
              <div class="flex gap-0.5">
                <div 
                   v-for="level in 4" 
                   :key="level" 
                   class="w-1 h-1 rounded-full"
                   :class="level <= (user.AccessLevel || 0) ? 'bg-blue-500' : 'bg-slate-100'"
                ></div>
              </div>
            </div>
          </TableCell>

          <TableCell>
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors"></div>
              <span class="text-xs font-bold text-slate-500 uppercase tracking-tighter">{{ user.Zona }}</span>
            </div>
          </TableCell>

          <TableCell class="text-right pr-6 font-medium">
            <UserStatusBadge :status="user.Status || 'active'" />
            <p class="text-[9px] text-slate-300 mt-0.5 font-bold uppercase tracking-tight">Active {{ formatActivity(user.LastActivity) }}</p>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
