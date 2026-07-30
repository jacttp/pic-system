<script setup lang="ts">
import { computed, ref } from 'vue';

interface Props {
  label?: string;
  options: string[];
  modelValue: string[];
  multiple?: boolean;
  showSelectAll?: boolean;
  disabled?: boolean;
  placeholder?: string;
  loading?: boolean;
  density?: 'default' | 'compact';
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  multiple: true,
  showSelectAll: true,
  disabled: false,
  placeholder: 'Todos',
  loading: false,
  density: 'default',
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: string[]): void;
  (event: 'change'): void;
  (event: 'open-change', value: boolean): void;
}>();

const isOpen = ref(false);
const searchTerm = ref('');

const filteredOptions = computed(() => {
  const query = searchTerm.value.trim().toLocaleLowerCase('es-MX');
  if (!query) return props.options;
  return props.options.filter(option => option.toLocaleLowerCase('es-MX').includes(query));
});

const buttonText = computed(() => {
  if (props.modelValue.length === 0) return props.placeholder;
  if (props.modelValue.length === 1) return props.modelValue[0];
  return `${props.modelValue.length} seleccionados`;
});

const isEffectiveDisabled = computed(() => props.disabled || props.loading);
const isCompact = computed(() => props.density === 'compact');

const setOpen = (value: boolean) => {
  if (isEffectiveDisabled.value) return;
  isOpen.value = value;
  if (!value) searchTerm.value = '';
  emit('open-change', value);
};

const toggleSelection = (option: string) => {
  if (!props.multiple) {
    emit('update:modelValue', [option]);
    emit('change');
    setOpen(false);
    return;
  }

  const nextValue = props.modelValue.includes(option)
    ? props.modelValue.filter(value => value !== option)
    : [...props.modelValue, option];

  emit('update:modelValue', nextValue);
  emit('change');
};

const selectAll = () => {
  emit(
    'update:modelValue',
    props.modelValue.length === props.options.length ? [] : [...props.options]
  );
  emit('change');
};
</script>

<template>
  <div class="group relative w-full">
    <label
      v-if="label"
      class="ml-1 block font-bold uppercase tracking-wider text-pic-text-muted"
      :class="isCompact ? 'mb-1 text-[9px]' : 'mb-1.5 text-[10px]'"
    >
      {{ label }}
    </label>

    <button
      type="button"
      class="flex w-full items-center justify-between rounded-lg border bg-pic-surface text-left text-xs shadow-sm transition-all"
      :class="[
        isCompact ? 'h-8 px-2.5' : 'h-[38px] px-3',
        isEffectiveDisabled
          ? 'cursor-not-allowed border-pic-border bg-pic-muted-surface opacity-60'
          : 'hover:border-pic-brand-border hover:shadow-md focus:ring-2 focus:ring-pic-brand-border',
        isOpen ? 'border-pic-brand ring-2 ring-pic-brand-border' : 'border-pic-border'
      ]"
      :disabled="isEffectiveDisabled"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click="setOpen(!isOpen)"
    >
      <span class="flex min-w-0 items-center gap-2 truncate">
        <i v-if="loading" class="fa-solid fa-circle-notch fa-spin text-pic-brand"></i>
        <span
          class="truncate font-medium"
          :class="modelValue.length > 0 ? 'text-pic-brand' : 'text-pic-text-muted'"
        >
          {{ loading ? 'Cargando...' : buttonText }}
        </span>
      </span>
      <i
        class="fa-solid fa-chevron-down text-[10px] text-pic-text-muted transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
      ></i>
    </button>

    <div
      v-if="isOpen"
      class="absolute left-0 top-full z-[9999] mt-1 flex w-full flex-col overflow-hidden rounded-lg border border-pic-border bg-pic-surface shadow-xl"
      :class="isCompact ? 'max-h-52' : 'max-h-60'"
    >
      <div class="border-b border-pic-border bg-pic-muted-surface" :class="isCompact ? 'p-1.5' : 'p-2'">
        <div class="relative">
          <i class="fa-solid fa-search absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-pic-text-muted"></i>
          <input
            v-model="searchTerm"
            type="search"
            placeholder="Buscar..."
            class="w-full rounded border border-pic-border bg-pic-surface pl-6 pr-2 text-xs text-pic-text-main outline-none transition-colors placeholder:text-pic-text-muted focus:border-pic-brand"
            :class="isCompact ? 'py-1' : 'py-1.5'"
            @keydown.esc="setOpen(false)"
          >
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-1" role="listbox" :aria-multiselectable="multiple">
        <button
          v-for="option in filteredOptions"
          :key="option"
          type="button"
          class="group/item flex w-full items-center rounded px-2 py-1.5 text-left transition-colors hover:bg-pic-brand-soft"
          role="option"
          :aria-selected="modelValue.includes(option)"
          @click="toggleSelection(option)"
        >
          <span
            class="mr-2 flex h-3.5 w-3.5 items-center justify-center rounded border transition-all"
            :class="modelValue.includes(option)
              ? 'border-pic-brand bg-pic-brand shadow-sm'
              : 'border-pic-border bg-pic-surface group-hover/item:border-pic-brand-border'"
          >
            <i v-if="modelValue.includes(option)" class="fa-solid fa-check text-[8px] text-white"></i>
          </span>
          <span class="truncate text-xs text-pic-text-muted group-hover/item:text-pic-brand">
            {{ option }}
          </span>
        </button>

        <p v-if="filteredOptions.length === 0" class="p-4 text-center text-xs italic text-pic-text-muted">
          Sin resultados
        </p>
      </div>

      <div v-if="multiple && showSelectAll" class="border-t border-pic-border bg-pic-muted-surface p-2 text-center">
        <button
          type="button"
          class="text-[10px] font-bold uppercase tracking-wide text-pic-brand transition hover:brightness-90"
          @click="selectAll"
        >
          {{ modelValue.length === options.length ? 'Ninguno' : 'Todos' }}
        </button>
      </div>
    </div>

    <button
      v-if="isOpen"
      type="button"
      class="fixed inset-0 z-[9998] cursor-default"
      aria-label="Cerrar opciones"
      @click="setOpen(false)"
    ></button>
  </div>
</template>
