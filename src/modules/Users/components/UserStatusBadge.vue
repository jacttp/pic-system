<!-- src/modules/Users/components/UserStatusBadge.vue -->
<script setup lang="ts">
import type { UserStatus } from '../types/user.types';

const props = defineProps<{
   status: UserStatus
}>();

const statusConfig: Record<UserStatus, { label: string; classes: string; icon: string }> = {
   active: {
      label: 'Activo',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: 'fa-solid fa-circle-check'
   },
   inactive: {
      label: 'Inactivo',
      classes: 'bg-slate-50 text-slate-500 border-slate-200',
      icon: 'fa-solid fa-circle-minus'
   },
   blocked: {
      label: 'Bloqueado',
      classes: 'bg-red-50 text-red-600 border-red-200',
      icon: 'fa-solid fa-ban'
   }
};

const config = statusConfig[props.status] || statusConfig.inactive;
</script>

<template>
   <span
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors"
      :class="config.classes"
   >
      <i :class="config.icon" class="text-[10px]"></i>
      {{ config.label }}
   </span>
</template>
