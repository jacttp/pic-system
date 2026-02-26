<!-- src/modules/Approvals/components/ApprovalCard.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import type { Approval } from '../types/approval.types';
import { APPROVAL_TYPE_CONFIG } from '../types/approval.types';
import ApprovalStatusBadge from './ApprovalStatusBadge.vue';

const props = defineProps<{
   approval: Approval
   canResolve: boolean
}>();

const emit = defineEmits<{
   resolve: [id: number]
   view: [id: number]
}>();

const typeConfig = computed(() => APPROVAL_TYPE_CONFIG[props.approval.type] || { label: props.approval.type, color: 'text-slate-500', icon: 'fa-solid fa-file' });

const timeAgo = computed(() => {
   const diff = Date.now() - new Date(props.approval.requestedAt).getTime();
   const mins = Math.floor(diff / 60000);
   if (mins < 60) return `hace ${mins}m`;
   const hours = Math.floor(mins / 60);
   if (hours < 24) return `hace ${hours}h`;
   const days = Math.floor(hours / 24);
   return `hace ${days}d`;
});
</script>

<template>
   <div 
      class="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
      @click="emit('view', approval.id)"
   >
      <!-- Header: tipo + status -->
      <div class="flex items-center justify-between mb-3">
         <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50" :class="typeConfig.color">
               <i :class="typeConfig.icon" class="text-sm"></i>
            </div>
            <span class="text-xs font-medium" :class="typeConfig.color">{{ typeConfig.label }}</span>
         </div>
         <ApprovalStatusBadge :status="approval.status" />
      </div>

      <!-- Título y descripción -->
      <h3 class="text-sm font-semibold text-slate-800 mb-1 group-hover:text-brand-700 transition-colors line-clamp-1">
         {{ approval.title }}
      </h3>
      <p class="text-xs text-slate-500 line-clamp-2 mb-3">{{ approval.description }}</p>

      <!-- Footer: solicitante + tiempo -->
      <div class="flex items-center justify-between">
         <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
               {{ approval.requestedBy.substring(0, 2).toUpperCase() }}
            </div>
            <span class="text-xs text-slate-500">{{ approval.requestedBy }}</span>
         </div>
         <span class="text-[10px] text-slate-400">{{ timeAgo }}</span>
      </div>

      <!-- Acciones rápidas para aprobadores -->
      <div 
         v-if="canResolve && approval.status === 'PENDING'"
         class="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2"
         @click.stop
      >
         <button 
            @click="emit('resolve', approval.id)"
            class="flex-1 text-xs font-medium py-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
         >
            <i class="fa-solid fa-check mr-1"></i> Resolver
         </button>
      </div>
   </div>
</template>
