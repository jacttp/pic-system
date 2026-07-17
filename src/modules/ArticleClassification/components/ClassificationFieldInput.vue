<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { ClassificationValue, SuggestedField } from '../types/articleClassificationTypes';

interface Props {
  modelValue: ClassificationValue;
  originalValue: ClassificationValue;
  fieldKey: string;
  label: string;
  type?: 'text' | 'number';
  options?: Array<string | number>;
  required?: boolean;
  hint?: string;
  maxLength?: number;
  allowCustom?: boolean;
  searchable?: boolean;
  optionCount?: number;
  suggestion?: SuggestedField | null;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text', options: () => [], required: false, allowCustom: true,
  searchable: false, optionCount: 0, suggestion: null,
});
const emit = defineEmits<{
  (event: 'update:modelValue', value: ClassificationValue): void;
  (event: 'apply-suggestion'): void;
}>();

const root = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const open = ref(false);
const activeIndex = ref(-1);
const query = ref('');
const listboxId = computed(() => `article-options-${props.fieldKey}`);
const displayValue = computed(() => props.modelValue ?? '');
const hasValue = computed(() => props.modelValue !== null && props.modelValue !== '');
const isModified = computed(() => props.modelValue !== props.originalValue);
const matchesSuggestion = computed(() => Boolean(props.suggestion) && props.modelValue === props.suggestion?.value);
const fieldState = computed(() => {
  if (!hasValue.value) return { label: 'Sin valor', icon: 'fa-solid fa-minus', classes: 'text-pic-text-muted' };
  if (matchesSuggestion.value) return { label: 'Sugerido', icon: 'fa-solid fa-wand-magic-sparkles', classes: 'text-pic-info' };
  if (isModified.value) return { label: 'Modificado', icon: 'fa-solid fa-pen', classes: 'text-pic-warning' };
  return { label: 'Original', icon: 'fa-solid fa-database', classes: 'text-pic-text-muted' };
});
const filteredOptions = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase('es-MX');
  const source = needle
    ? props.options.filter(option => String(option).toLocaleLowerCase('es-MX').includes(needle))
    : props.options;
  return source.slice(0, 50);
});
const suggestionLabel = computed(() => props.suggestion?.value == null ? 'Sin valor' : String(props.suggestion.value));

const parseValue = (value: string): ClassificationValue => {
  if (value === '') return null;
  if (props.type !== 'number') return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};
const handleInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  query.value = value;
  emit('update:modelValue', parseValue(value));
  open.value = props.options.length > 0;
  activeIndex.value = -1;
};
const selectOption = (option: string | number) => {
  emit('update:modelValue', option);
  query.value = String(option);
  open.value = false;
  activeIndex.value = -1;
  input.value?.focus();
};
const clearValue = () => {
  emit('update:modelValue', null);
  query.value = '';
  input.value?.focus();
};
const handleKeydown = (event: KeyboardEvent) => {
  if (!props.options.length) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault(); open.value = true;
    activeIndex.value = Math.min(activeIndex.value + 1, filteredOptions.value.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  } else if (event.key === 'Enter' && open.value && activeIndex.value >= 0) {
    event.preventDefault(); selectOption(filteredOptions.value[activeIndex.value]);
  } else if (event.key === 'Escape') {
    open.value = false;
  }
};
const closeOnOutside = (event: MouseEvent) => {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false;
};
onMounted(() => document.addEventListener('mousedown', closeOnOutside));
onBeforeUnmount(() => document.removeEventListener('mousedown', closeOnOutside));
</script>

<template>
  <div ref="root" class="min-w-0">
    <div class="mb-1.5 flex min-h-5 items-center justify-between gap-2">
      <label :for="`article-field-${fieldKey}`" class="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-pic-text-main">
        {{ label }} <span v-if="required" class="text-pic-brand" aria-label="requerido">*</span>
      </label>
      <span class="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide" :class="fieldState.classes">
        <i :class="fieldState.icon" aria-hidden="true"></i>{{ fieldState.label }}
      </span>
    </div>

    <div class="relative">
      <input
        :id="`article-field-${fieldKey}`" ref="input" :value="displayValue" :type="type"
        :required="required" :maxlength="maxLength" step="any" autocomplete="off"
        :role="options.length ? 'combobox' : undefined" :aria-expanded="options.length ? open : undefined"
        :aria-controls="options.length ? listboxId : undefined" :aria-autocomplete="options.length ? 'list' : undefined"
        class="h-10 w-full rounded-lg border border-pic-border bg-pic-surface px-3 pr-16 text-sm font-semibold text-pic-text-main outline-none transition hover:bg-pic-muted-surface focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border"
        :class="!hasValue ? 'border-dashed text-pic-text-muted' : ''"
        :placeholder="hint || 'Selecciona o captura un valor'"
        @focus="open = options.length > 0" @input="handleInput" @keydown="handleKeydown"
      >
      <div class="absolute inset-y-0 right-1 flex items-center gap-0.5">
        <button v-if="hasValue && !required" type="button" class="flex h-8 w-8 items-center justify-center rounded-md text-pic-text-muted hover:bg-pic-brand-soft hover:text-pic-brand focus:outline-none focus:ring-2 focus:ring-pic-brand-border" :aria-label="`Limpiar ${label}`" @click="clearValue">
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
        <button v-if="options.length" type="button" class="flex h-8 w-8 items-center justify-center rounded-md text-pic-text-muted hover:bg-pic-brand-soft hover:text-pic-brand focus:outline-none focus:ring-2 focus:ring-pic-brand-border" :aria-label="`Mostrar opciones de ${label}`" @click="open = !open">
          <i class="fa-solid fa-chevron-down text-[10px] transition" :class="open ? 'rotate-180' : ''"></i>
        </button>
      </div>

      <ul v-if="open && options.length" :id="listboxId" role="listbox" class="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-pic-border bg-pic-surface p-1 shadow-xl">
        <li v-for="(option, index) in filteredOptions" :key="String(option)" role="option" :aria-selected="modelValue === option">
          <button type="button" class="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-pic-text-main transition hover:bg-pic-brand-soft hover:text-pic-brand" :class="index === activeIndex ? 'bg-pic-brand-soft text-pic-brand' : ''" @mousedown.prevent @click="selectOption(option)">
            {{ option }}
          </button>
        </li>
        <li v-if="!filteredOptions.length" class="px-3 py-3 text-center text-xs font-semibold text-pic-text-muted">Sin coincidencias. Puedes conservar el valor capturado.</li>
        <li v-else-if="filteredOptions.length < options.length" class="border-t border-pic-border px-3 py-2 text-[10px] font-semibold text-pic-text-muted">Mostrando {{ filteredOptions.length }} de {{ optionCount || options.length }} opciones. Escribe para filtrar.</li>
      </ul>
    </div>

    <div v-if="suggestion" class="mt-1.5 flex items-start justify-between gap-2 rounded-md border border-[hsl(var(--pic-info)/0.22)] bg-[hsl(var(--pic-info)/0.06)] px-2 py-1.5">
      <div class="min-w-0 text-[10px] font-semibold leading-4 text-pic-text-muted">
        <p><i class="fa-solid fa-wand-magic-sparkles mr-1 text-pic-info" aria-hidden="true"></i>Propuesta: <span class="font-bold text-pic-text-main">{{ suggestionLabel }}</span><span class="ml-1">· {{ Math.round(suggestion.modelConfidence * 100) }}%</span></p>
        <details v-if="suggestion.note" class="mt-0.5"><summary class="cursor-pointer text-[9px] font-bold text-pic-info">Ver criterio</summary><p class="mt-1">{{ suggestion.note }}</p></details>
      </div>
      <button type="button" class="shrink-0 text-[9px] font-bold uppercase tracking-wide text-pic-brand hover:underline focus:outline-none focus:ring-2 focus:ring-pic-brand-border" :disabled="matchesSuggestion" @click="emit('apply-suggestion')">
        {{ matchesSuggestion ? 'Aplicada' : 'Usar' }}
      </button>
    </div>
  </div>
</template>
