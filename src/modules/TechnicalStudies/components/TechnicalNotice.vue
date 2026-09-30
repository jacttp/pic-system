<script setup lang="ts">
import StdAlert from '@/modules/Shared/components/std/StdAlert.vue';
withDefaults(defineProps<{ title: string; description?: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>(), { tone: 'info' });
</script>
<template><StdAlert class="ts-alert" :class="`ts-tone-${tone}`" :tone="tone" :title="title" :description="description" role="status" aria-live="polite" /></template>
