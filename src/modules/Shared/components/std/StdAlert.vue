<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  description?: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  icon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  tone: 'info',
});

const toneClasses = computed(() => ({
  info: 'border-sky-200 bg-sky-50/70 text-sky-800',
  success: 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50/70 text-amber-800',
  danger: 'border-red-200 bg-red-50/70 text-red-800',
}[props.tone]));

const alertIcon = computed(() => props.icon || ({
  info: 'fa-solid fa-circle-info',
  success: 'fa-solid fa-circle-check',
  warning: 'fa-solid fa-triangle-exclamation',
  danger: 'fa-solid fa-circle-exclamation',
}[props.tone]));
</script>

<template>
  <div class="flex gap-3 rounded-lg border px-3 py-3" :class="toneClasses">
    <i :class="alertIcon" class="mt-0.5 shrink-0"></i>
    <div class="min-w-0">
      <p class="text-xs font-black">{{ title }}</p>
      <p v-if="description" class="mt-1 text-xs font-semibold opacity-80">{{ description }}</p>
    </div>
  </div>
</template>
