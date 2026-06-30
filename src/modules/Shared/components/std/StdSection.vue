<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: string;
  density?: 'normal' | 'compact';
}

const props = withDefaults(defineProps<Props>(), {
  density: 'normal',
});

const sectionPadding = computed(() => props.density === 'compact' ? 'p-3 sm:p-4' : 'p-4 sm:p-5');
</script>

<template>
  <section
    class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    :class="sectionPadding"
  >
    <div>
      <div class="flex min-w-0 items-start justify-between gap-3">
        <div class="min-w-0">
          <p v-if="eyebrow" class="text-[10px] font-black uppercase text-pic-brand">
            {{ eyebrow }}
          </p>
          <h2 class="mt-1 text-sm font-black text-slate-900">
            {{ title }}
          </h2>
          <p v-if="description" class="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {{ description }}
          </p>
        </div>
        <span v-if="icon" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pic-brand-soft text-pic-brand shadow-sm">
          <i :class="icon"></i>
        </span>
      </div>

      <div class="mt-4">
        <slot />
      </div>
    </div>
  </section>
</template>
