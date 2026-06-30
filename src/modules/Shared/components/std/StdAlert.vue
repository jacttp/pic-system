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
  info: 'border-sky-200 bg-sky-50/70 text-sky-800 shadow-sky-100/70 before:bg-sky-500',
  success: 'border-pic-brand-border bg-pic-brand-soft text-pic-brand shadow-pic-brand/10 before:bg-pic-brand',
  warning: 'border-amber-200 bg-amber-50/80 text-amber-800 shadow-amber-100/70 before:bg-amber-500',
  danger: 'border-red-200 bg-red-50/80 text-red-800 shadow-red-100/80 before:bg-red-600',
}[props.tone]));

const iconClasses = computed(() => ({
  info: 'border-sky-100 bg-white text-sky-600',
  success: 'border-pic-brand-border bg-white text-pic-brand',
  warning: 'border-amber-100 bg-white text-amber-600',
  danger: 'border-red-100 bg-white text-red-600',
}[props.tone]));

const alertIcon = computed(() => props.icon || ({
  info: 'fa-solid fa-circle-info',
  success: 'fa-solid fa-circle-check',
  warning: 'fa-solid fa-triangle-exclamation',
  danger: 'fa-solid fa-circle-exclamation',
}[props.tone]));
</script>

<template>
  <div class="relative flex gap-3 overflow-hidden rounded-xl border px-4 py-3 shadow-sm transition hover:shadow-md before:absolute before:inset-y-0 before:left-0 before:w-1" :class="toneClasses">
    <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm" :class="iconClasses">
      <i :class="alertIcon" class="text-sm"></i>
    </span>
    <div class="min-w-0">
      <p class="text-sm font-black leading-5">{{ title }}</p>
      <p v-if="description" class="mt-1 text-xs font-semibold leading-5 opacity-80">{{ description }}</p>
    </div>
  </div>
</template>
