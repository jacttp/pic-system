<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  label: string;
  value: string;
  detail?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'flat';
  tone?: 'brand' | 'success' | 'warning' | 'info' | 'neutral';
  sparkline?: string;
}

const props = withDefaults(defineProps<Props>(), {
  trend: 'flat',
  tone: 'brand',
  sparkline: 'M2 28 L16 22 L30 26 L44 16 L58 20 L72 10 L86 14 L100 6',
});

const toneClasses = computed(() => ({
  brand: 'bg-pic-brand-soft text-pic-brand border-pic-brand-border',
  success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  warning: 'bg-amber-50 text-amber-600 border-amber-100',
  info: 'bg-sky-50 text-sky-600 border-sky-100',
  neutral: 'bg-slate-50 text-slate-600 border-slate-100',
}[props.tone]));

const trendIcon = computed(() => ({
  up: 'fa-solid fa-arrow-trend-up',
  down: 'fa-solid fa-arrow-trend-down',
  flat: 'fa-solid fa-minus',
}[props.trend]));
</script>

<template>
  <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[10px] font-black uppercase text-slate-500">
          {{ label }}
        </p>
        <p class="mt-2 text-2xl font-black text-slate-900">
          {{ value }}
        </p>
        <p v-if="detail" class="mt-1 flex items-center gap-1 text-xs font-black" :class="toneClasses">
          <i :class="trendIcon" class="text-[10px]"></i>
          <span>{{ detail }}</span>
        </p>
      </div>
      <span v-if="icon" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border shadow-sm" :class="toneClasses">
        <i :class="icon"></i>
      </span>
    </div>

    <svg class="mt-4 h-10 w-full overflow-visible" viewBox="0 0 102 34" fill="none" aria-hidden="true">
      <path :d="sparkline" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="toneClasses" />
    </svg>
  </article>
</template>
