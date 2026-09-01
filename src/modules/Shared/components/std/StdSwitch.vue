<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: boolean;
  disabled?: boolean;
  label?: string;
  ariaLabel?: string;
  size?: 'compact' | 'default';
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  size: 'default',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const handleToggle = (value: boolean, disabled?: boolean) => {
  if (disabled) return;
  emit('update:modelValue', value);
};

const trackClass = computed(() => (
  props.size === 'compact' ? 'h-4 w-8' : 'h-6 w-11'
));

const thumbClass = computed(() => (
  props.size === 'compact' ? 'h-3 w-3' : 'h-4 w-4'
));

const thumbPositionClass = computed(() => {
  if (props.size === 'compact') {
    return props.modelValue ? 'translate-x-[18px]' : 'translate-x-0.5';
  }
  return props.modelValue ? 'translate-x-6' : 'translate-x-1';
});
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-3 rounded-lg text-left transition focus:outline-none focus:ring-2 focus:ring-pic-brand-border disabled:cursor-not-allowed disabled:opacity-60"
    :disabled="disabled"
    :aria-pressed="modelValue"
    :aria-label="ariaLabel || label"
    @click="handleToggle(!modelValue, disabled)"
  >
    <span
      class="relative inline-flex shrink-0 items-center rounded-full transition"
      :class="[trackClass, modelValue ? 'bg-pic-brand' : 'bg-slate-300']"
    >
      <span
        class="inline-block rounded-full bg-white shadow-sm transition"
        :class="[thumbClass, thumbPositionClass]"
      ></span>
    </span>
    <span v-if="label" class="text-xs font-black text-slate-700">{{ label }}</span>
  </button>
</template>
