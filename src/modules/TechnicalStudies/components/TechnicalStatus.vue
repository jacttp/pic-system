<script setup lang="ts">
import { statusLabel, statusTone } from '../utils/technicalStudyUi';
defineProps<{ status: string; study?: boolean }>();
</script>
<template><span class="ts-status" :class="`ts-tone-${statusTone(status)}`">{{ study && status === 'PAUSED' ? 'Pausado' : statusLabel(status) }}</span></template>
