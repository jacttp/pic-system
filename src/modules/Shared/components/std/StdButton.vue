<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'icon';
  icon?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button',
  disabled: false,
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const variantClasses = computed(() => ({
  primary: 'border-pic-brand bg-pic-brand text-white shadow-lg shadow-pic-brand/20 hover:brightness-95 hover:-translate-y-0.5',
  secondary: 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-pic-brand-border hover:bg-slate-50 hover:text-pic-brand hover:-translate-y-0.5',
  danger: 'border-red-200 bg-white text-red-700 shadow-sm hover:border-red-300 hover:bg-red-50/70 hover:-translate-y-0.5',
  ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-pic-brand-soft hover:text-pic-brand',
}[props.variant]));

const sizeClasses = computed(() => ({
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9 px-0 text-sm',
}[props.size]));

const handleClick = (event: MouseEvent) => {
  emit('click', event);
};
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border font-black transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-pic-brand-border disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
    :class="[variantClasses, sizeClasses]"
    @click="handleClick"
  >
    <i v-if="icon" :class="icon"></i>
    <span v-if="size !== 'icon'">
      <slot />
    </span>
  </button>
</template>
