<!-- src/modules/Users/components/UserStatusBadge.vue -->
<script setup lang="ts">
import type { UserStatus } from '../types/user.types';

const props = defineProps<{
   status: UserStatus
}>();

const statusConfig: Record<UserStatus, { label: string; classes: string; icon: string }> = {
   active: {
      label: 'Activo',
      classes: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm',
      icon: 'fa-solid fa-circle-check pulsate-icon'
   },
   inactive: {
      label: 'Inactivo',
      classes: 'bg-slate-50 text-slate-400 border-slate-100',
      icon: 'fa-solid fa-circle-minus'
   },
   blocked: {
      label: 'Bloqueado',
      classes: 'bg-red-50 text-red-500 border-red-100 shadow-sm',
      icon: 'fa-solid fa-ban'
   }
};

const config = statusConfig[props.status] || statusConfig.inactive;
</script>

<template>
   <span
      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all duration-300"
      :class="config.classes"
   >
      <i :class="config.icon" class="text-[9px]"></i>
      {{ config.label }}
   </span>
</template>

<style scoped>
.pulsate-icon {
   animation: pulse-soft 2s infinite;
}

@keyframes pulse-soft {
   0% { opacity: 0.6; }
   50% { opacity: 1; }
   100% { opacity: 0.6; }
}
</style>

