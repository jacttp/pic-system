<!-- src/modules/Approvals/components/ApprovalFilters.vue -->
<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { ApprovalFilters, ApprovalStatus, ApprovalType } from '../types/approval.types';

const emit = defineEmits<{
   filter: [filters: ApprovalFilters]
}>();

const filters = reactive<ApprovalFilters>({
   status: undefined,
   type: undefined,
});

const statusOptions: { value: ApprovalStatus | ''; label: string }[] = [
   { value: '', label: 'Todos los estados' },
   { value: 'PENDING', label: '🕐 Pendientes' },
   { value: 'APPROVED', label: '✅ Aprobadas' },
   { value: 'REJECTED', label: '❌ Rechazadas' },
   { value: 'CANCELLED', label: '🚫 Canceladas' },
];

const typeOptions: { value: ApprovalType | ''; label: string }[] = [
   { value: '', label: 'Todos los tipos' },
   { value: 'PROMOTION', label: '🏷️ Promoción' },
   { value: 'USER_ROLE_CHANGE', label: '👤 Cambio de Rol' },
   { value: 'REPORT_ACCESS', label: '📊 Acceso a Reporte' },
];

watch(filters, () => {
   emit('filter', {
      status: filters.status || undefined,
      type: filters.type || undefined,
   });
}, { deep: true });

const clearFilters = () => {
   filters.status = undefined;
   filters.type = undefined;
};
</script>

<template>
   <div class="flex flex-wrap items-center gap-3">
      <select 
         v-model="filters.status"
         class="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
      >
         <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value || undefined">
            {{ opt.label }}
         </option>
      </select>

      <select 
         v-model="filters.type"
         class="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
      >
         <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value || undefined">
            {{ opt.label }}
         </option>
      </select>

      <button 
         v-if="filters.status || filters.type"
         @click="clearFilters"
         class="text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-1"
      >
         <i class="fa-solid fa-xmark mr-1"></i> Limpiar
      </button>
   </div>
</template>
