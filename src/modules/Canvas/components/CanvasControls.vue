<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type {
  CanvasAxisConfig,
  CanvasDimension,
  CanvasMetric,
} from '../types/canvasTypes';
import {
  CANVAS_DIMENSION_LABELS,
  CANVAS_METRIC_LABELS,
} from '../types/canvasTypes';

interface Props {
  axis: CanvasAxisConfig;
  metric: CanvasMetric;
  filterValues: string[];
  selectedFilterValues: string[];
}

interface MetricGuide {
  id: CanvasMetric;
  formula: string;
  description: string;
  reading: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (event: 'axis', target: 'x' | 'y', value: CanvasDimension): void;
  (event: 'metric', value: CanvasMetric): void;
  (event: 'toggle-filter', value: string): void;
  (event: 'all-filters'): void;
}>();

const dimensions: CanvasDimension[] = ['cadena', 'linea', 'familia'];
const metrics: CanvasMetric[] = ['netDifference', 'absoluteGap', 'lossShare', 'peerDeviation'];
const metricGuides: MetricGuide[] = [
  {
    id: 'netDifference',
    formula: 'Σ Dif',
    description: 'Saldo 2026 − 2025 después de compensar pérdidas y ganancias.',
    reading: 'Negativo es pérdida y positivo ganancia; en 3D la pérdida sube y la ganancia baja.',
  },
  {
    id: 'absoluteGap',
    formula: '|Σ Dif|',
    description: 'Tamaño del saldo agregado sin considerar su dirección.',
    reading: 'Localiza huecos grandes, pero no distingue por sí sola pérdida de ganancia.',
  },
  {
    id: 'lossShare',
    formula: 'pérdida de celda / pérdida total',
    description: 'Porcentaje de toda la pérdida filtrada concentrado en la combinación.',
    reading: 'Solo las diferencias negativas participan en el numerador y denominador.',
  },
  {
    id: 'peerDeviation',
    formula: '0.6745 × (valor − mediana) / MAD',
    description: 'Distancia robusta respecto de los pares X dentro de cada grupo Y.',
    reading: 'Negativo es peor que la mediana; requiere tres pares y MAD mayor que cero.',
  },
];

const mobileOpen = ref(false);
const filterLabel = computed(() => CANVAS_DIMENSION_LABELS[props.axis.filter]);
const allSelected = computed(() => props.filterValues.length > 0
  && props.selectedFilterValues.length === props.filterValues.length);
const filterCount = computed(() => `${props.selectedFilterValues.length}/${props.filterValues.length}`);

const handleAxis = (target: 'x' | 'y', event: Event) => {
  emit('axis', target, (event.target as HTMLSelectElement).value as CanvasDimension);
};

const handleMetric = (event: Event) => {
  emit('metric', (event.target as HTMLSelectElement).value as CanvasMetric);
};

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && mobileOpen.value) mobileOpen.value = false;
};

onMounted(() => window.addEventListener('keydown', handleEscape));
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape));
</script>

<template>
  <div class="min-w-0">
    <div class="hidden min-w-max items-center gap-1.5 md:flex">
      <label class="inline-flex h-9 items-center overflow-hidden rounded-lg border border-pic-border bg-pic-surface shadow-sm">
        <span class="grid h-full w-8 place-items-center border-r border-pic-border bg-pic-muted-surface text-[10px] font-black text-pic-brand">X</span>
        <select
          :value="axis.x"
          class="h-full min-w-28 bg-transparent px-2 text-xs font-black text-pic-text-main outline-none"
          aria-label="Dimensión del eje horizontal"
          @change="handleAxis('x', $event)"
        >
          <option v-for="dimension in dimensions" :key="dimension" :value="dimension">
            {{ CANVAS_DIMENSION_LABELS[dimension] }}
          </option>
        </select>
      </label>

      <label class="inline-flex h-9 items-center overflow-hidden rounded-lg border border-pic-border bg-pic-surface shadow-sm">
        <span class="grid h-full w-8 place-items-center border-r border-pic-border bg-pic-muted-surface text-[10px] font-black text-pic-brand">Y</span>
        <select
          :value="axis.y"
          class="h-full min-w-28 bg-transparent px-2 text-xs font-black text-pic-text-main outline-none"
          aria-label="Dimensión del eje de profundidad"
          @change="handleAxis('y', $event)"
        >
          <option v-for="dimension in dimensions" :key="dimension" :value="dimension">
            {{ CANVAS_DIMENSION_LABELS[dimension] }}
          </option>
        </select>
      </label>

      <details class="group relative">
        <summary class="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-pic-border bg-pic-surface px-3 text-xs font-black text-pic-text-main shadow-sm transition hover:border-pic-brand-border [&::-webkit-details-marker]:hidden">
          <i class="fa-solid fa-filter text-[10px] text-pic-brand"></i>
          {{ filterLabel }}
          <span class="rounded-md bg-pic-brand-soft px-1.5 py-0.5 font-mono text-[9px] text-pic-brand">{{ filterCount }}</span>
          <i class="fa-solid fa-chevron-down text-[8px] text-pic-text-muted transition group-open:rotate-180"></i>
        </summary>
        <div class="absolute left-0 top-full z-40 mt-2 w-64 rounded-xl border border-pic-border bg-pic-surface p-3 shadow-xl">
          <div class="flex items-center justify-between gap-2 border-b border-pic-border pb-2">
            <p class="text-[10px] font-black uppercase tracking-wide text-pic-text-muted">Filtrar {{ filterLabel }}</p>
            <button type="button" class="text-[10px] font-black text-pic-brand hover:underline" @click="emit('all-filters')">
              {{ allSelected ? 'Todos activos' : 'Activar todos' }}
            </button>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="value in filterValues"
              :key="value"
              type="button"
              class="min-h-8 rounded-md border px-2.5 text-[11px] font-black transition"
              :class="selectedFilterValues.includes(value)
                ? 'border-pic-brand bg-pic-brand text-white'
                : 'border-pic-border bg-pic-muted-surface text-pic-text-muted hover:text-pic-brand'"
              :aria-pressed="selectedFilterValues.includes(value)"
              @click="emit('toggle-filter', value)"
            >
              {{ value }}
            </button>
          </div>
        </div>
      </details>

      <label class="inline-flex h-9 items-center overflow-hidden rounded-lg border border-pic-border bg-pic-surface shadow-sm">
        <span class="grid h-full w-8 place-items-center border-r border-pic-border bg-pic-muted-surface text-[10px] text-pic-brand"><i class="fa-solid fa-chart-simple"></i></span>
        <select
          :value="metric"
          class="h-full min-w-40 bg-transparent px-2 text-xs font-black text-pic-text-main outline-none"
          aria-label="Métrica pintada"
          @change="handleMetric"
        >
          <option v-for="item in metrics" :key="item" :value="item">
            {{ CANVAS_METRIC_LABELS[item] }}
          </option>
        </select>
      </label>

      <details class="group relative">
        <summary class="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-lg border border-pic-border bg-pic-surface text-xs font-black text-pic-brand shadow-sm transition hover:border-pic-brand hover:bg-pic-brand hover:text-white [&::-webkit-details-marker]:hidden" aria-label="Abrir guía de métricas" title="Guía de métricas">
          ?
        </summary>
        <div class="absolute right-0 top-full z-40 mt-2 w-[min(25rem,calc(100vw-2rem))] rounded-xl border border-pic-border bg-pic-surface p-4 shadow-xl">
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-brand">Métrica pintada</p>
          <p class="mt-1 text-xs font-semibold text-pic-text-muted">Todas se recalculan con el escenario activo.</p>
          <ol class="mt-3 space-y-3">
            <li v-for="(guide, index) in metricGuides" :key="guide.id" class="grid grid-cols-[1.7rem_minmax(0,1fr)] gap-2">
              <span class="grid h-7 w-7 place-items-center rounded-md bg-pic-brand text-[9px] font-black text-white">{{ String(index + 1).padStart(2, '0') }}</span>
              <div>
                <p class="text-xs font-black text-pic-text-main">{{ CANVAS_METRIC_LABELS[guide.id] }} <span class="font-mono text-[10px] text-pic-brand">{{ guide.formula }}</span></p>
                <p class="mt-0.5 text-[10px] font-semibold leading-4 text-pic-text-muted">{{ guide.description }}</p>
                <p class="text-[10px] font-bold leading-4 text-pic-text-main">{{ guide.reading }}</p>
              </div>
            </li>
          </ol>
        </div>
      </details>
    </div>

    <button
      type="button"
      class="inline-flex h-9 items-center gap-2 rounded-lg border border-pic-border bg-pic-surface px-3 text-xs font-black text-pic-text-main shadow-sm md:hidden"
      @click="mobileOpen = true"
    >
      <i class="fa-solid fa-sliders text-pic-brand"></i>
      Ajustes
    </button>

    <div v-if="mobileOpen" class="fixed inset-0 z-[150] flex items-end bg-slate-950/35 backdrop-blur-[1px] md:hidden">
      <button type="button" class="absolute inset-0" aria-label="Cerrar ajustes" @click="mobileOpen = false"></button>
      <section class="relative z-10 max-h-[82dvh] w-full overflow-y-auto rounded-t-2xl border-t border-pic-border bg-pic-surface p-4 shadow-2xl">
        <div class="flex items-center justify-between gap-3 border-b border-pic-border pb-3">
          <div>
            <p class="text-[10px] font-black uppercase tracking-wide text-pic-brand">Canvas</p>
            <h2 class="text-sm font-black text-pic-text-main">Ajustes de exploración</h2>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-md text-pic-text-muted hover:bg-pic-muted-surface" aria-label="Cerrar" @click="mobileOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1 block text-[10px] font-black uppercase text-pic-text-muted">Eje X</span>
            <select :value="axis.x" class="h-10 w-full rounded-lg border border-pic-border bg-pic-surface px-3 text-xs font-black" @change="handleAxis('x', $event)">
              <option v-for="dimension in dimensions" :key="dimension" :value="dimension">{{ CANVAS_DIMENSION_LABELS[dimension] }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-black uppercase text-pic-text-muted">Eje Y</span>
            <select :value="axis.y" class="h-10 w-full rounded-lg border border-pic-border bg-pic-surface px-3 text-xs font-black" @change="handleAxis('y', $event)">
              <option v-for="dimension in dimensions" :key="dimension" :value="dimension">{{ CANVAS_DIMENSION_LABELS[dimension] }}</option>
            </select>
          </label>
        </div>

        <div class="mt-4">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-black uppercase text-pic-text-muted">{{ filterLabel }} · {{ filterCount }}</span>
            <button type="button" class="text-[10px] font-black text-pic-brand" @click="emit('all-filters')">Activar todos</button>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button v-for="value in filterValues" :key="value" type="button" class="min-h-8 rounded-md border px-3 text-xs font-black" :class="selectedFilterValues.includes(value) ? 'border-pic-brand bg-pic-brand text-white' : 'border-pic-border bg-pic-muted-surface text-pic-text-muted'" @click="emit('toggle-filter', value)">
              {{ value }}
            </button>
          </div>
        </div>

        <label class="mt-4 block">
          <span class="mb-1 block text-[10px] font-black uppercase text-pic-text-muted">Métrica pintada</span>
          <select :value="metric" class="h-10 w-full rounded-lg border border-pic-border bg-pic-surface px-3 text-xs font-black" @change="handleMetric">
            <option v-for="item in metrics" :key="item" :value="item">{{ CANVAS_METRIC_LABELS[item] }}</option>
          </select>
        </label>

        <details class="mt-4 rounded-lg border border-pic-border bg-pic-muted-surface p-3">
          <summary class="cursor-pointer text-xs font-black text-pic-brand">¿Cómo se interpreta cada métrica?</summary>
          <div class="mt-3 space-y-3">
            <div v-for="guide in metricGuides" :key="guide.id">
              <p class="text-xs font-black text-pic-text-main">{{ CANVAS_METRIC_LABELS[guide.id] }} · <span class="font-mono text-[10px] text-pic-brand">{{ guide.formula }}</span></p>
              <p class="mt-0.5 text-[10px] font-semibold leading-4 text-pic-text-muted">{{ guide.description }} {{ guide.reading }}</p>
            </div>
          </div>
        </details>
      </section>
    </div>
  </div>
</template>
