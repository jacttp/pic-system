<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  title: string;
  icon?: string;
  description?: string;
  defaultOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultOpen: true,
});

const isOpen = ref(props.defaultOpen);

const toggle = () => {
  isOpen.value = !isOpen.value;
};
</script>

<template>
  <section class="rounded-lg border border-pic-border bg-pic-muted-surface p-3">
    <button
      type="button"
      class="mb-2 flex w-full items-start justify-between gap-3 border-b border-pic-border pb-2 text-left md:pointer-events-none"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span class="flex min-w-0 items-start gap-2">
        <i v-if="icon" :class="icon" class="mt-0.5 shrink-0 text-[11px] text-pic-brand"></i>
        <span class="min-w-0">
          <span class="block text-[11px] font-bold uppercase tracking-[0.12em] text-pic-text-muted">
            {{ title }}
          </span>
          <span v-if="description" class="mt-0.5 block text-[10px] font-medium leading-4 text-pic-text-muted">
            {{ description }}
          </span>
        </span>
      </span>
      <i
        class="fa-solid fa-chevron-down mt-0.5 text-[10px] text-pic-text-muted transition-transform md:hidden"
        :class="{ 'rotate-180': isOpen }"
      ></i>
    </button>

    <div class="space-y-2" :class="isOpen ? 'block' : 'hidden md:block'">
      <slot />
    </div>
  </section>
</template>
