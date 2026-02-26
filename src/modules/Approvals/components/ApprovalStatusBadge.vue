<!-- src/modules/Approvals/components/ApprovalStatusBadge.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { APPROVAL_STATUS_CONFIG, type ApprovalStatus } from '../types/approval.types';

const props = defineProps<{ status: ApprovalStatus }>();

const config = computed(() => APPROVAL_STATUS_CONFIG[props.status] || APPROVAL_STATUS_CONFIG.PENDING);
</script>

<template>
   <span 
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
      :class="[config.color, config.bg]"
   >
      <i :class="config.icon" class="text-[10px]"></i>
      {{ config.label }}
   </span>
</template>
