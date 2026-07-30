<script setup lang="ts">
import { computed } from 'vue';
import StdButton from './StdButton.vue';

export type StdFilterPanelStatus = 'idle' | 'dirty' | 'loading' | 'ready' | 'error';

interface Props {
  collapsed: boolean;
  activeCount: number;
  summary?: string;
  status: StdFilterPanelStatus;
  loading?: boolean;
  canReset?: boolean;
  title?: string;
  applyLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  summary: 'Sin filtros aplicados',
  loading: false,
  canReset: true,
  title: 'Filtros',
  applyLabel: 'Aplicar cambios',
});

const emit = defineEmits<{
  (event: 'update:collapsed', value: boolean): void;
  (event: 'apply'): void;
  (event: 'reset'): void;
}>();

const statusMeta = computed(() => ({
  idle: {
    label: 'Listo para generar',
    icon: 'fa-circle-dot',
    className: 'border-pic-border bg-pic-muted-surface text-pic-text-muted',
  },
  dirty: {
    label: 'Cambios sin aplicar',
    icon: 'fa-triangle-exclamation',
    className: 'border-[hsl(var(--pic-warning)/0.36)] bg-[hsl(var(--pic-warning)/0.10)] text-pic-warning',
  },
  loading: {
    label: 'Generando reporte',
    icon: 'fa-circle-notch fa-spin',
    className: 'border-[hsl(var(--pic-info)/0.30)] bg-[hsl(var(--pic-info)/0.08)] text-pic-info',
  },
  ready: {
    label: 'Reporte actualizado',
    icon: 'fa-circle-check',
    className: 'border-pic-brand-border bg-pic-brand-soft text-pic-brand',
  },
  error: {
    label: 'Requiere atención',
    icon: 'fa-circle-exclamation',
    className: 'border-[hsl(var(--pic-danger)/0.28)] bg-[hsl(var(--pic-danger)/0.08)] text-pic-danger',
  },
}[props.status]));

const toggle = () => {
  emit('update:collapsed', !props.collapsed);
};
</script>

<template>
  <section class="relative z-40 w-full overflow-visible border-b border-pic-border bg-pic-surface text-pic-text-main shadow-sm">
    <div class="flex min-h-14 items-center justify-between gap-3 px-3 py-2.5 sm:px-4 lg:px-6">
      <button type="button" class="flex min-w-0 items-center gap-3 text-left" @click="toggle">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pic-brand text-white shadow-sm shadow-pic-brand/20">
          <i class="fa-solid" :class="collapsed ? 'fa-filter' : 'fa-sliders'"></i>
        </span>
        <span class="min-w-0">
          <span class="flex items-center gap-2">
            <span class="text-sm font-extrabold uppercase tracking-wide text-pic-text-main">{{ title }}</span>
            <span class="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-pic-muted-surface px-1.5 text-[11px] font-bold text-pic-text-muted">
              {{ activeCount }}
            </span>
          </span>
          <span class="mt-0.5 block max-w-[58vw] truncate text-xs font-medium text-pic-text-muted sm:max-w-md">
            {{ summary }}
          </span>
        </span>
      </button>

      <div class="flex shrink-0 items-center gap-2">
        <slot name="mobile-actions"></slot>
        <span
          class="hidden items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold sm:inline-flex"
          :class="statusMeta.className"
        >
          <i class="fa-solid text-[10px]" :class="statusMeta.icon"></i>
          {{ statusMeta.label }}
        </span>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft text-pic-brand shadow-sm transition hover:bg-pic-brand hover:text-white focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
          :title="collapsed ? 'Expandir filtros' : 'Contraer filtros'"
          :aria-expanded="!collapsed"
          @click="toggle"
        >
          <i class="fa-solid" :class="collapsed ? 'fa-filter' : 'fa-chevron-up'"></i>
        </button>
      </div>
    </div>

    <div v-if="!collapsed" class="border-t border-pic-border">
      <div class="max-h-[calc(78vh-56px)] overflow-y-auto px-3 py-3 sm:px-4 xl:max-h-none xl:overflow-visible lg:px-6">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <slot />
        </div>

        <div class="sticky bottom-0 mt-3 flex flex-col gap-3 border-t border-pic-border bg-pic-surface/95 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <p class="text-xs font-medium text-pic-text-muted">
              Los cambios se aplican únicamente al confirmar.
            </p>
            <slot name="status-detail"></slot>
          </div>
          <div class="flex items-center justify-end gap-2">
            <slot name="actions-before"></slot>
            <StdButton
              v-if="canReset"
              size="sm"
              variant="ghost"
              icon="fa-solid fa-trash-can"
              :disabled="loading"
              @click="emit('reset')"
            >
              Limpiar filtros
            </StdButton>
            <StdButton
              size="sm"
              variant="primary"
              :icon="loading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-bolt'"
              :disabled="loading"
              @click="emit('apply')"
            >
              {{ loading ? 'Aplicando...' : applyLabel }}
            </StdButton>
            <slot name="actions-after"></slot>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
