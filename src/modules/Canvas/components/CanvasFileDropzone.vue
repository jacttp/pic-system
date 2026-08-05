<script setup lang="ts">
import { computed, ref } from 'vue';
import { StdButton } from '@/modules/Shared/components/std';
import type { CanvasValidationIssue } from '../types/canvasTypes';

interface Props {
  fileName?: string;
  fileSize?: number;
  loading?: boolean;
  issues?: CanvasValidationIssue[];
}

const props = withDefaults(defineProps<Props>(), {
  fileName: '',
  fileSize: 0,
  loading: false,
  issues: () => [],
});

const emit = defineEmits<{
  (event: 'file', file: File): void;
  (event: 'clear'): void;
}>();

const input = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

const formattedSize = computed(() => {
  if (!props.fileSize) return '';
  return props.fileSize >= 1024 * 1024
    ? `${(props.fileSize / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(props.fileSize / 1024)} KB`;
});

const hasFile = computed(() => Boolean(props.fileName));
const hasIssues = computed(() => props.issues.length > 0);

const chooseFiles = (files: FileList | null) => {
  const file = files?.[0];
  if (file) emit('file', file);
  if (input.value) input.value.value = '';
};

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  if (!props.loading) chooseFiles(event.dataTransfer?.files || null);
};

const clearFile = (event: MouseEvent) => {
  event.stopPropagation();
  emit('clear');
};
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
    <button
      type="button"
      class="group relative flex min-h-48 w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-5 py-7 text-center transition"
      :class="[
        isDragging ? 'border-pic-brand bg-pic-brand-soft' : 'border-pic-border bg-pic-surface hover:border-pic-brand-border hover:bg-pic-brand-soft/50',
        hasIssues ? 'border-[hsl(var(--pic-danger)/0.4)] bg-[hsl(var(--pic-danger)/0.05)]' : '',
      ]"
      :disabled="loading"
      @click="input?.click()"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <span class="absolute inset-y-0 left-0 w-1 bg-pic-brand"></span>
      <input
        ref="input"
        type="file"
        class="hidden"
        accept=".xlsx,.xls"
        @change="chooseFiles(($event.target as HTMLInputElement).files)"
      >

      <span class="grid h-12 w-12 place-items-center rounded-lg border border-pic-border bg-white text-pic-brand shadow-sm transition group-hover:-translate-y-0.5">
        <i :class="loading ? 'fa-solid fa-circle-notch fa-spin' : hasFile ? 'fa-solid fa-file-circle-check' : 'fa-solid fa-file-arrow-up'" class="text-lg"></i>
      </span>

      <template v-if="loading">
        <p class="mt-4 text-sm font-black text-pic-text-main">Analizando Hoja3</p>
        <p class="mt-1 text-xs font-semibold text-pic-text-muted">Validamos estructura, filas y duplicados antes de calcular.</p>
      </template>
      <template v-else-if="hasFile">
        <p class="mt-4 max-w-full truncate text-sm font-black text-pic-text-main">{{ fileName }}</p>
        <p class="mt-1 text-xs font-semibold text-pic-text-muted">{{ formattedSize }} · procesado únicamente en este navegador</p>
        <StdButton class="mt-4" size="sm" variant="ghost" icon="fa-solid fa-xmark" @click="clearFile">
          Quitar archivo
        </StdButton>
      </template>
      <template v-else>
        <p class="mt-4 text-sm font-black text-pic-text-main">Arrastra el comparativo aquí</p>
        <p class="mt-1 text-xs font-semibold text-pic-text-muted">o haz clic para seleccionar un Excel de hasta 10 MB</p>
      </template>
    </button>

    <aside class="rounded-xl border border-pic-border bg-pic-muted-surface p-4">
      <p class="text-[10px] font-black uppercase tracking-[0.16em] text-pic-brand">Contrato de entrada</p>
      <h3 class="mt-2 text-sm font-black text-pic-text-main">Plantilla exacta</h3>
      <ol class="mt-4 space-y-3 text-xs font-semibold leading-5 text-pic-text-muted">
        <li class="grid grid-cols-[1.75rem_1fr] gap-2">
          <span class="grid h-7 w-7 place-items-center rounded-md bg-pic-brand text-[10px] font-black text-white">01</span>
          <span>Hoja obligatoria <strong class="font-mono text-pic-text-main">Hoja3</strong>.</span>
        </li>
        <li class="grid grid-cols-[1.75rem_1fr] gap-2">
          <span class="grid h-7 w-7 place-items-center rounded-md bg-pic-brand text-[10px] font-black text-white">02</span>
          <span>Columnas A:D: <strong class="text-pic-text-main">formatocte, Linea, Categorias, Dif</strong>.</span>
        </li>
        <li class="grid grid-cols-[1.75rem_1fr] gap-2">
          <span class="grid h-7 w-7 place-items-center rounded-md bg-pic-brand text-[10px] font-black text-white">03</span>
          <span><strong class="text-pic-text-main">Dif</strong> debe ser numérico y representa kg de 2026 − 2025.</span>
        </li>
      </ol>
    </aside>
  </div>
</template>
