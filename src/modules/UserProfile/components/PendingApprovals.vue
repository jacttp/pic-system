<!-- src/modules/UserProfile/components/PendingApprovals.vue -->
<script setup lang="ts">
/**
 * Widget placeholder para solicitudes pendientes de aprobación.
 * Se conectará a useApprovalsStore cuando se implemente en Fase 3.
 * Por ahora muestra un estado informativo con link al módulo futuro.
 */
import { computed } from 'vue';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';

const authStore = useAuthStore();

const isManager = computed(() => (authStore.user?.accessLevel ?? 1) >= 2);
</script>

<template>
   <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-gradient-to-r from-amber-50 to-white">
         <i class="fa-solid fa-clipboard-list text-amber-500"></i>
         <span class="text-sm font-semibold text-slate-700">Aprobaciones Pendientes</span>
      </div>

      <!-- Content -->
      <div class="p-6 flex flex-col items-center justify-center text-center">
         <div class="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
            <i class="fa-solid fa-clock-rotate-left text-amber-400 text-xl"></i>
         </div>
         
         <template v-if="isManager">
            <p class="text-sm font-medium text-slate-600">Módulo de Aprobaciones</p>
            <p class="text-xs text-slate-400 mt-1">Este módulo estará disponible próximamente.</p>
            <p class="text-xs text-slate-400">Aquí podrás gestionar solicitudes de tu equipo.</p>
         </template>
         <template v-else>
            <p class="text-sm font-medium text-slate-600">Solicitudes</p>
            <p class="text-xs text-slate-400 mt-1">Aquí verás el estado de tus solicitudes pendientes.</p>
         </template>

         <div class="mt-4 px-3 py-1.5 bg-amber-50 rounded-full text-[11px] text-amber-600 font-medium">
            <i class="fa-solid fa-wrench text-[9px] mr-1"></i> En desarrollo — Fase 3
         </div>
      </div>
   </div>
</template>
