<script setup lang="ts">
import { computed, ref } from 'vue';
import FilterDropdown from '@/modules/Shared/components/FilterDropdown.vue';
import { StdSwitch } from '@/modules/Shared/components/std';
import type { Pic52TransactionOption } from '../types/pic52';

interface Props {
  modelValue: string[];
  options: Pic52TransactionOption[];
  compareEnabled: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: string[]): void;
  (event: 'update:compareEnabled', value: boolean): void;
  (event: 'change'): void;
  (event: 'open-change', value: boolean): void;
}>();

const limitReached = ref(false);
const optionLabels = computed(() => props.options.map(option => option.label));
const optionByLabel = computed(() => new Map(
  props.options.map(option => [option.label, option.value]),
));
const optionByValue = computed(() => new Map(
  props.options.map(option => [option.value, option.label]),
));
const primaryTransaction = computed(() => (
  props.modelValue.find(value => value.toLocaleLowerCase('es-MX') === 'ventas')
  ?? props.modelValue[0]
  ?? ''
));
const primaryLabel = computed(() => (
  optionByValue.value.get(primaryTransaction.value) ?? primaryTransaction.value
));
const selectionModel = computed<string[]>({
  get: () => props.modelValue.map(value => optionByValue.value.get(value) ?? value),
  set: (labels) => {
    limitReached.value = labels.length > 8;
    emit(
      'update:modelValue',
      labels.slice(0, 8).map(label => optionByLabel.value.get(label) ?? label),
    );
  },
});

const handleComparisonToggle = (value: boolean) => {
  limitReached.value = false;
  emit('update:compareEnabled', value);
};
</script>

<template>
  <div class="space-y-2">
    <FilterDropdown
      v-model="selectionModel"
      density="compact"
      label="Transacción"
      :options="optionLabels"
      placeholder="Seleccione transacciones"
      :show-select-all="false"
      :multiple="compareEnabled"
      :disabled="disabled"
      @change="emit('change')"
      @open-change="emit('open-change', $event)"
    />

    <div class="rounded-lg border border-pic-border bg-pic-surface px-2.5 py-2">
      <StdSwitch
        :model-value="compareEnabled"
        label="Comparar transacciones"
        :disabled="disabled"
        @update:model-value="handleComparisonToggle"
      />
      <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-semibold text-pic-text-muted">
        <span
          v-if="primaryTransaction"
          class="rounded-md border border-pic-brand-border bg-pic-brand-soft px-1.5 py-0.5 text-pic-brand"
        >
          Principal: {{ primaryLabel }}
        </span>
        <span>{{ compareEnabled ? modelValue.length + '/8 seleccionadas' : 'Selección única' }}</span>
      </div>
      <p v-if="limitReached" class="mt-1 text-[9px] font-bold text-pic-warning" role="status">
        El comparativo admite un máximo de 8 transacciones.
      </p>
    </div>
  </div>
</template>
