<script setup lang="ts">
interface Props {
  modelValue: boolean;
  disabled?: boolean;
  label?: string;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const handleToggle = (value: boolean, disabled?: boolean) => {
  if (disabled) return;
  emit('update:modelValue', value);
};
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-3 rounded-lg text-left transition focus:outline-none focus:ring-2 focus:ring-pic-brand-border disabled:cursor-not-allowed disabled:opacity-60"
    :disabled="disabled"
    :aria-pressed="modelValue"
    @click="handleToggle(!modelValue, disabled)"
  >
    <span
      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition"
      :class="modelValue ? 'bg-pic-brand' : 'bg-slate-300'"
    >
      <span
        class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition"
        :class="modelValue ? 'translate-x-6' : 'translate-x-1'"
      ></span>
    </span>
    <span v-if="label" class="text-xs font-black text-slate-700">{{ label }}</span>
  </button>
</template>
