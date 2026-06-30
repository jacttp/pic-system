<script setup lang="ts">
interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: string;
  meta?: string;
}

defineProps<Props>();
</script>

<template>
  <header class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
    <div class="min-w-0">
      <p v-if="eyebrow" class="text-[10px] font-black uppercase text-pic-brand">
        {{ eyebrow }}
      </p>
      <div class="mt-1 flex min-w-0 items-center gap-3">
        <span
          v-if="icon"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft text-pic-brand shadow-sm"
        >
          <i :class="icon"></i>
        </span>
        <div class="min-w-0">
          <h1 class="truncate text-xl font-black text-slate-900 sm:text-2xl">
            {{ title }}
          </h1>
          <p v-if="description" class="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
            {{ description }}
          </p>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span
        v-if="meta"
        class="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-black uppercase text-slate-500 shadow-sm shadow-slate-100"
      >
        {{ meta }}
      </span>
      <slot name="actions" />
    </div>
  </header>
</template>
