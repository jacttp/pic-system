<!-- src/modules/Approvals/components/ApprovalStatusBadge.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { APPROVAL_STATUS_CONFIG, type ApprovalStatus } from '../types/approval.types';

const props = defineProps<{
   status: ApprovalStatus
   dark?: boolean
}>();

const config = computed(() => APPROVAL_STATUS_CONFIG[props.status] || APPROVAL_STATUS_CONFIG.PENDING);

const badgeClasses = computed(() => {
   if (!props.dark) return [config.value.color, config.value.bg];

   const darkClasses: Record<ApprovalStatus, string> = {
      PENDING: 'border-pic-brand bg-pic-brand text-white',
      APPROVED: 'border-pic-success bg-pic-success text-white',
      REJECTED: 'border-pic-danger bg-pic-danger text-white',
      CANCELLED: 'border-pic-danger bg-pic-danger text-white',
   };

   return darkClasses[props.status] || darkClasses.PENDING;
});
</script>

<template>
   <span 
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
      :class="badgeClasses"
   >
      <i :class="config.icon" class="text-[10px]"></i>
      {{ config.label }}
   </span>
</template>
