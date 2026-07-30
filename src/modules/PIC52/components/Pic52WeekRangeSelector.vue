<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: number[];
  availableWeeks: number[];
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: number[]): void;
  (event: 'change'): void;
}>();

const normalizedWeeks = computed(() => (
  [...new Set(props.availableWeeks)]
    .filter(week => Number.isInteger(week) && week >= 1)
    .sort((left, right) => left - right)
));
const selectedWeeks = computed(() => (
  [...new Set(props.modelValue)]
    .filter(week => normalizedWeeks.value.includes(week))
    .sort((left, right) => left - right)
));
const lastAvailable = computed(() => normalizedWeeks.value.at(-1) ?? 52);
const rangeStart = computed(() => selectedWeeks.value[0] ?? 1);
const rangeEnd = computed(() => selectedWeeks.value.at(-1) ?? lastAvailable.value);
const rangeSpan = computed(() => Math.max(lastAvailable.value - 1, 1));
const startPercent = computed(() => ((rangeStart.value - 1) / rangeSpan.value) * 100);
const endPercent = computed(() => ((rangeEnd.value - 1) / rangeSpan.value) * 100);
const selectionStyle = computed(() => ({
  left: `${startPercent.value}%`,
  width: `${Math.max(endPercent.value - startPercent.value, 0)}%`,
}));

const commitRange = (start: number, end: number) => {
  const next = normalizedWeeks.value.filter(week => week >= start && week <= end);
  if (next.length === 0) return;
  emit('update:modelValue', next);
  emit('change');
};

const updateStart = (event: Event) => {
  const start = Number((event.target as HTMLInputElement).value);
  commitRange(Math.min(start, rangeEnd.value), rangeEnd.value);
};

const updateEnd = (event: Event) => {
  const end = Number((event.target as HTMLInputElement).value);
  commitRange(rangeStart.value, Math.max(rangeStart.value, end));
};
</script>

<template>
  <div class="min-w-0">
    <div class="mb-1.5 flex items-center justify-between gap-2">
      <span class="text-[9px] font-bold uppercase tracking-wider text-pic-text-muted">
        Semanas
      </span>
      <output
        for="pic52-week-start pic52-week-end"
        class="rounded-md border border-pic-brand-border bg-pic-brand-soft px-2 py-1 font-mono text-[9px] font-bold text-pic-brand"
      >
        SEM-{{ rangeStart }}–SEM-{{ rangeEnd }}
      </output>
    </div>

    <div class="relative h-8">
      <div
        class="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-pic-border"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-pic-brand"
        :style="selectionStyle"
        aria-hidden="true"
      ></div>

      <input
        id="pic52-week-start"
        :value="rangeStart"
        type="range"
        min="1"
        :max="lastAvailable"
        step="1"
        :disabled="disabled"
        class="week-range-slider week-range-slider--start"
        aria-label="Primera semana incluida"
        :aria-valuetext="`Primera semana ${rangeStart}`"
        @input="updateStart"
      />
      <input
        id="pic52-week-end"
        :value="rangeEnd"
        type="range"
        min="1"
        :max="lastAvailable"
        step="1"
        :disabled="disabled"
        class="week-range-slider week-range-slider--end"
        aria-label="Última semana incluida"
        :aria-valuetext="`Última semana ${rangeEnd}`"
        @input="updateEnd"
      />
    </div>

    <div
      class="-mt-0.5 flex justify-between font-mono text-[8px] font-semibold text-pic-text-muted"
      aria-hidden="true"
    >
      <span>SEM-1</span>
      <span>SEM-{{ lastAvailable }}</span>
    </div>
  </div>
</template>

<style scoped>
.week-range-slider {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 2rem;
  margin: 0;
  appearance: none;
  background: transparent;
  pointer-events: none;
}

.week-range-slider--start {
  z-index: 3;
}

.week-range-slider--end {
  z-index: 2;
}

.week-range-slider:focus {
  z-index: 4;
  outline: none;
}

.week-range-slider::-webkit-slider-runnable-track {
  height: 0.375rem;
  background: transparent;
}

.week-range-slider::-webkit-slider-thumb {
  width: 1.125rem;
  height: 1.125rem;
  margin-top: -0.375rem;
  appearance: none;
  border: 2px solid hsl(var(--pic-brand));
  border-radius: 9999px;
  background: hsl(var(--pic-brand-border));
  box-shadow: 0 1px 4px hsl(var(--pic-text-main) / 0.2);
  cursor: grab;
  pointer-events: auto;
}

.week-range-slider::-moz-range-track {
  height: 0.375rem;
  background: transparent;
}

.week-range-slider::-moz-range-thumb {
  width: 1.125rem;
  height: 1.125rem;
  border: 2px solid hsl(var(--pic-brand));
  border-radius: 9999px;
  background: hsl(var(--pic-brand-border));
  box-shadow: 0 1px 4px hsl(var(--pic-text-main) / 0.2);
  cursor: grab;
  pointer-events: auto;
}

.week-range-slider:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px hsl(var(--pic-brand-border));
}

.week-range-slider:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 3px hsl(var(--pic-brand-border));
}

.week-range-slider:disabled {
  opacity: 0.55;
}

.week-range-slider:disabled::-webkit-slider-thumb {
  cursor: not-allowed;
}

.week-range-slider:disabled::-moz-range-thumb {
  cursor: not-allowed;
}
</style>
