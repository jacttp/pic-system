<script setup lang="ts">
import { computed, ref } from 'vue';
import { StdButton, StdDataTable } from '@/modules/Shared/components/std';
import { tableColumns, tableQualityChecklist, tableRows } from '../utils/uiStandardsCatalog';

type TableExampleId = 'standard' | 'analytical' | 'comparison' | 'projection';

interface TableExample {
  id: TableExampleId;
  title: string;
  description: string;
  icon: string;
  path: string;
}

const examples: TableExample[] = [
  {
    id: 'standard',
    title: 'Operativa',
    description: 'Listados, selección y acciones frecuentes.',
    icon: 'fa-solid fa-list-check',
    path: 'src/modules/Shared/components/std/StdDataTable.vue',
  },
  {
    id: 'analytical',
    title: 'Analítica',
    description: 'Métricas, totales y búsqueda dentro del resultado.',
    icon: 'fa-solid fa-chart-column',
    path: 'src/modules/PIC/components/tables/PicDataTable.vue',
  },
  {
    id: 'comparison',
    title: 'Comparativa',
    description: 'Periodos, diferencias y variaciones.',
    icon: 'fa-solid fa-code-compare',
    path: 'src/modules/PIC/components/tables/PicDataTable.vue',
  },
  {
    id: 'projection',
    title: 'Proyección',
    description: 'Jerarquía, metas y drill-down progresivo.',
    icon: 'fa-solid fa-table-tree',
    path: 'src/modules/PIC/components/tables/PicProjectionTable.vue',
  },
];

const activeExample = ref<TableExampleId>('standard');
const loading = ref(false);
const showEmpty = ref(false);
const selectedRows = ref<Array<string | number>>([101]);
const sortKey = ref('id');
const sortDirection = ref<'asc' | 'desc'>('asc');
const currentPage = ref(1);
const expandedRowIds = ref<string[]>(['Centro']);

const activeExampleMeta = computed(() => (
  examples.find(example => example.id === activeExample.value) || examples[0]!
));
const visibleRows = computed(() => showEmpty.value ? [] : tableRows);
const expandedRowSet = computed(() => new Set(expandedRowIds.value));

const analyticalRows = [
  { label: 'Enero', previous: '$1.82M', current: '$2.04M', difference: '+$220K', growth: '+12.1%', tone: 'text-pic-success' },
  { label: 'Febrero', previous: '$1.96M', current: '$1.88M', difference: '-$80K', growth: '-4.1%', tone: 'text-pic-danger' },
  { label: 'Marzo', previous: '$2.10M', current: '$2.31M', difference: '+$210K', growth: '+10.0%', tone: 'text-pic-success' },
  { label: 'Abril', previous: '$1.74M', current: '$1.91M', difference: '+$170K', growth: '+9.8%', tone: 'text-pic-success' },
];

const comparisonRows = [
  { label: 'Venta neta', unit: 'MXN', y2024: '$18.4M', y2025: '$20.1M', y2026: '$22.8M', change: '+13.4%', tone: 'text-pic-success' },
  { label: 'Volumen', unit: 'kg', y2024: '842K', y2025: '891K', y2026: '917K', change: '+2.9%', tone: 'text-pic-success' },
  { label: 'Precio promedio', unit: 'MXN/kg', y2024: '$21.85', y2025: '$22.56', y2026: '$24.86', change: '+10.2%', tone: 'text-pic-success' },
  { label: 'Devoluciones', unit: '%', y2024: '1.8%', y2025: '2.1%', y2026: '1.6%', change: '-0.5 pp', tone: 'text-pic-success' },
];

const projectionRows = [
  {
    id: 'Centro',
    label: 'Centro',
    previous: '$7.8M',
    current: '$8.6M',
    target: '$8.3M',
    variance: '+3.6%',
    share: '37.7%',
    children: [
      { id: 'Centro-1', label: 'Jefatura Centro 1', current: '$4.9M', target: '$4.6M', variance: '+6.5%' },
      { id: 'Centro-2', label: 'Jefatura Centro 2', current: '$3.7M', target: '$3.7M', variance: '0.0%' },
    ],
  },
  {
    id: 'Norte',
    label: 'Norte',
    previous: '$6.4M',
    current: '$7.1M',
    target: '$7.4M',
    variance: '-4.1%',
    share: '31.1%',
    children: [
      { id: 'Norte-1', label: 'Jefatura Norte 1', current: '$4.0M', target: '$4.2M', variance: '-4.8%' },
      { id: 'Norte-2', label: 'Jefatura Norte 2', current: '$3.1M', target: '$3.2M', variance: '-3.1%' },
    ],
  },
  {
    id: 'Sureste',
    label: 'Sureste',
    previous: '$6.8M',
    current: '$7.1M',
    target: '$6.9M',
    variance: '+2.9%',
    share: '31.2%',
    children: [
      { id: 'Sureste-1', label: 'Jefatura Sureste 1', current: '$3.8M', target: '$3.7M', variance: '+2.7%' },
      { id: 'Sureste-2', label: 'Jefatura Sureste 2', current: '$3.3M', target: '$3.2M', variance: '+3.1%' },
    ],
  },
];

const behaviorGuides = [
  {
    title: 'Paginación',
    icon: 'fa-solid fa-angles-right',
    instruction: 'Muestra rango, total y tamaño de página. Conserva filtros y orden al cambiar de página.',
  },
  {
    title: 'Acciones masivas',
    icon: 'fa-solid fa-check-double',
    instruction: 'Aparecen después de seleccionar filas e indican cuántos registros serán afectados.',
  },
  {
    title: 'Edición',
    icon: 'fa-solid fa-pen-to-square',
    instruction: 'Distingue celda activa, validación, cambios pendientes, guardado y error.',
  },
  {
    title: 'Exportación',
    icon: 'fa-solid fa-file-export',
    instruction: 'Exporta el alcance aplicado y comunica formato, progreso y resultado.',
  },
  {
    title: 'Columnas fijas',
    icon: 'fa-solid fa-thumbtack',
    instruction: 'Fija solo la dimensión que mantiene el contexto durante el desplazamiento horizontal.',
  },
  {
    title: 'Mobile',
    icon: 'fa-solid fa-mobile-screen-button',
    instruction: 'Prioriza datos esenciales; usa cards o ampliación controlada para el detalle.',
  },
];

const handleSort = (key: string) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    return;
  }
  sortKey.value = key;
  sortDirection.value = 'asc';
};

const handleSelection = (key: string | number) => {
  selectedRows.value = selectedRows.value.includes(key)
    ? selectedRows.value.filter(item => item !== key)
    : [...selectedRows.value, key];
};

const toggleProjectionRow = (rowId: string) => {
  expandedRowIds.value = expandedRowSet.value.has(rowId)
    ? expandedRowIds.value.filter(id => id !== rowId)
    : [...expandedRowIds.value, rowId];
};
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
      <div class="border-b border-pic-border pb-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-brand">Elige según la tarea</p>
        <h2 class="mt-1 text-xl font-extrabold tracking-tight text-pic-text-main">Patrones de tabla</h2>
        <p class="mt-2 max-w-3xl text-sm font-medium leading-6 text-pic-text-muted">
          Una tabla estándar resuelve listados. Los comparativos, proyecciones y jerarquías necesitan
          conservar contexto, unidades y detalle progresivo.
        </p>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4" role="tablist" aria-label="Ejemplos de tablas">
        <button
          v-for="example in examples"
          :key="example.id"
          type="button"
          role="tab"
          :aria-selected="activeExample === example.id"
          class="group grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-xl border p-3 text-left transition"
          :class="activeExample === example.id
            ? 'border-pic-brand bg-pic-brand text-white shadow-sm'
            : 'border-pic-border bg-pic-surface hover:border-pic-brand-border hover:bg-pic-brand-soft'"
          @click="activeExample = example.id"
        >
          <span
            class="grid h-9 w-9 place-items-center rounded-lg"
            :class="activeExample === example.id ? 'bg-white/15' : 'bg-pic-muted-surface text-pic-brand'"
          >
            <i :class="example.icon"></i>
          </span>
          <span>
            <span class="block text-sm font-extrabold">{{ example.title }}</span>
            <span
              class="mt-0.5 block text-[11px] font-medium leading-4"
              :class="activeExample === example.id ? 'text-white/75' : 'text-pic-text-muted'"
            >
              {{ example.description }}
            </span>
          </span>
        </button>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm">
      <header class="flex flex-col gap-3 border-b border-pic-border bg-pic-muted-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-brand">Muestra interactiva</p>
          <h2 class="mt-0.5 text-base font-extrabold text-pic-text-main">{{ activeExampleMeta.title }}</h2>
          <p class="mt-1 break-all font-mono text-[10px] text-pic-text-muted">{{ activeExampleMeta.path }}</p>
        </div>
        <div v-if="activeExample === 'standard'" class="flex flex-wrap gap-2">
          <StdButton size="sm" :variant="loading ? 'primary' : 'secondary'" icon="fa-solid fa-circle-notch" @click="loading = !loading">
            Loading
          </StdButton>
          <StdButton size="sm" :variant="showEmpty ? 'primary' : 'secondary'" icon="fa-regular fa-folder-open" @click="showEmpty = !showEmpty">
            Vacío
          </StdButton>
        </div>
        <div v-else class="flex flex-wrap items-center gap-2">
          <StdButton size="sm" icon="fa-solid fa-filter">Filtrar</StdButton>
          <StdButton variant="primary" size="sm" icon="fa-solid fa-download">Exportar</StdButton>
        </div>
      </header>

      <div v-if="activeExample === 'standard'" class="p-3 sm:p-4">
        <div class="mb-3 flex min-h-9 flex-wrap items-center justify-between gap-2">
          <p class="text-xs font-bold text-pic-text-muted">
            {{ selectedRows.length }} de {{ tableRows.length }} seleccionados
          </p>
          <div v-if="selectedRows.length" class="flex flex-wrap gap-2">
            <StdButton size="sm" icon="fa-solid fa-tags">Asignar estado</StdButton>
            <StdButton variant="danger" size="sm" icon="fa-solid fa-trash">Eliminar</StdButton>
          </div>
        </div>

        <StdDataTable
          :columns="tableColumns"
          :rows="visibleRows"
          :loading="loading"
          selectable
          :selected-keys="selectedRows"
          :sort-key="sortKey"
          :sort-direction="sortDirection"
          @sort="handleSort"
          @select-row="handleSelection"
        >
          <template #cell-status="{ value }">
            <span
              class="rounded-md border px-2 py-0.5 text-[10px] font-bold"
              :class="value === 'Activo'
                ? 'border-[hsl(var(--pic-success)/0.25)] bg-[hsl(var(--pic-success)/0.08)] text-pic-success'
                : 'border-pic-border bg-pic-muted-surface text-pic-text-muted'"
            >
              {{ value }}
            </span>
          </template>
        </StdDataTable>

        <footer class="mt-3 flex flex-col gap-3 rounded-xl border border-pic-border bg-pic-muted-surface px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-[11px] font-bold text-pic-text-muted">Mostrando 1–3 de 30 registros</p>
          <div class="flex items-center gap-1">
            <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-pic-text-muted hover:bg-pic-brand-soft hover:text-pic-brand" aria-label="Página anterior">
              <i class="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
            <button
              v-for="page in 3"
              :key="page"
              type="button"
              class="grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-extrabold"
              :class="currentPage === page ? 'bg-pic-brand text-white' : 'text-pic-text-muted hover:bg-pic-brand-soft hover:text-pic-brand'"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
            <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-pic-text-muted hover:bg-pic-brand-soft hover:text-pic-brand" aria-label="Página siguiente">
              <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        </footer>
      </div>

      <div v-else-if="activeExample === 'analytical'" class="p-3 sm:p-4">
        <div class="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div class="rounded-lg border border-pic-border bg-pic-muted-surface p-2.5">
            <p class="text-[9px] font-bold uppercase text-pic-text-muted">Venta 2026</p>
            <p class="mt-1 font-mono text-sm font-bold tabular-nums text-pic-text-main">$8.14M</p>
          </div>
          <div class="rounded-lg border border-[hsl(var(--pic-success)/0.25)] bg-[hsl(var(--pic-success)/0.08)] p-2.5">
            <p class="text-[9px] font-bold uppercase text-pic-text-muted">Crecimiento</p>
            <p class="mt-1 font-mono text-sm font-bold tabular-nums text-pic-success">+7.1%</p>
          </div>
          <div class="rounded-lg border border-pic-border bg-pic-muted-surface p-2.5">
            <p class="text-[9px] font-bold uppercase text-pic-text-muted">Periodo</p>
            <p class="mt-1 text-sm font-extrabold text-pic-text-main">4 meses</p>
          </div>
          <label class="relative col-span-2 block lg:col-span-1">
            <span class="sr-only">Buscar periodo</span>
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i>
            <input class="h-full min-h-12 w-full rounded-lg border border-pic-border bg-pic-surface pl-9 pr-3 text-xs outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border" placeholder="Buscar periodo...">
          </label>
        </div>
        <div class="overflow-x-auto rounded-xl border border-pic-border">
          <table class="w-full min-w-[680px] text-xs">
            <thead class="bg-pic-nav text-pic-nav-text">
              <tr>
                <th class="sticky left-0 z-10 bg-pic-nav-muted px-3 py-2.5 text-left">Periodo</th>
                <th class="px-3 py-2.5 text-right">2025</th>
                <th class="px-3 py-2.5 text-right">2026</th>
                <th class="px-3 py-2.5 text-right">Diferencia</th>
                <th class="px-3 py-2.5 text-right">Crecimiento</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-pic-border">
              <tr v-for="row in analyticalRows" :key="row.label" class="hover:bg-pic-brand-soft">
                <td class="sticky left-0 bg-pic-surface px-3 py-2.5 font-bold text-pic-text-main">{{ row.label }}</td>
                <td class="px-3 py-2.5 text-right font-mono text-pic-text-muted">{{ row.previous }}</td>
                <td class="px-3 py-2.5 text-right font-mono font-bold text-pic-text-main">{{ row.current }}</td>
                <td class="px-3 py-2.5 text-right font-mono font-bold" :class="row.tone">{{ row.difference }}</td>
                <td class="px-3 py-2.5 text-right font-mono font-bold" :class="row.tone">{{ row.growth }}</td>
              </tr>
            </tbody>
            <tfoot class="border-t-2 border-pic-border bg-pic-muted-surface font-extrabold text-pic-text-main">
              <tr>
                <td class="sticky left-0 bg-pic-muted-surface px-3 py-2.5">TOTAL</td>
                <td class="px-3 py-2.5 text-right font-mono">$7.62M</td>
                <td class="px-3 py-2.5 text-right font-mono">$8.14M</td>
                <td class="px-3 py-2.5 text-right font-mono text-pic-success">+$520K</td>
                <td class="px-3 py-2.5 text-right font-mono text-pic-success">+7.1%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div v-else-if="activeExample === 'comparison'" class="p-3 sm:p-4">
        <div class="overflow-x-auto rounded-xl border border-pic-border">
          <table class="w-full min-w-[760px] text-xs">
            <thead class="bg-pic-nav text-pic-nav-text">
              <tr>
                <th class="sticky left-0 z-10 min-w-44 bg-pic-nav-muted px-3 py-3 text-left">Indicador</th>
                <th class="px-3 py-3 text-left text-pic-nav-text-muted">Unidad</th>
                <th class="px-3 py-3 text-right">2024</th>
                <th class="px-3 py-3 text-right">2025</th>
                <th class="bg-white/5 px-3 py-3 text-right">2026</th>
                <th class="px-3 py-3 text-right">Variación</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-pic-border">
              <tr v-for="row in comparisonRows" :key="row.label" class="hover:bg-pic-brand-soft">
                <td class="sticky left-0 bg-pic-surface px-3 py-3 font-extrabold text-pic-text-main">{{ row.label }}</td>
                <td class="px-3 py-3 text-pic-text-muted">{{ row.unit }}</td>
                <td class="px-3 py-3 text-right font-mono text-pic-text-muted">{{ row.y2024 }}</td>
                <td class="px-3 py-3 text-right font-mono text-pic-text-muted">{{ row.y2025 }}</td>
                <td class="bg-pic-brand-soft/40 px-3 py-3 text-right font-mono font-bold tabular-nums text-pic-text-main">{{ row.y2026 }}</td>
                <td class="px-3 py-3 text-right font-mono font-bold tabular-nums" :class="row.tone">{{ row.change }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-3 text-[11px] font-medium leading-5 text-pic-text-muted">
          Mantén la misma unidad por fila, destaca el periodo vigente y expresa diferencias con signo.
        </p>
      </div>

      <div v-else class="p-3 sm:p-4">
        <div class="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div v-for="item in [
            ['Venta actual', '$22.8M'],
            ['Meta', '$22.6M'],
            ['Variación', '+0.9%'],
            ['Cobertura', '3 zonas'],
          ]" :key="item[0]" class="rounded-lg border border-pic-border bg-pic-muted-surface p-2.5">
            <p class="text-[9px] font-bold uppercase text-pic-text-muted">{{ item[0] }}</p>
            <p class="mt-1 font-mono text-sm font-bold tabular-nums text-pic-text-main">{{ item[1] }}</p>
          </div>
        </div>
        <div class="overflow-x-auto rounded-xl border border-pic-border">
          <table class="w-full min-w-[760px] text-xs">
            <thead class="bg-pic-nav text-pic-nav-text">
              <tr>
                <th class="sticky left-0 z-20 min-w-48 bg-pic-nav-muted px-3 py-3 text-left">Zona / Jefatura</th>
                <th class="px-3 py-3 text-right">2025</th>
                <th class="px-3 py-3 text-right">2026</th>
                <th class="px-3 py-3 text-right">Meta</th>
                <th class="px-3 py-3 text-right">Var. meta</th>
                <th class="px-3 py-3 text-right">Participación</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-pic-border">
              <template v-for="row in projectionRows" :key="row.id">
                <tr class="group hover:bg-pic-brand-soft">
                  <td class="sticky left-0 z-10 bg-pic-surface px-3 py-2.5 font-extrabold text-pic-text-main group-hover:bg-pic-brand-soft">
                    <button
                      type="button"
                      class="mr-2 inline-grid h-7 w-7 place-items-center rounded-lg border border-pic-border text-pic-brand hover:border-pic-brand hover:bg-pic-brand hover:text-white"
                      :aria-expanded="expandedRowSet.has(row.id)"
                      @click="toggleProjectionRow(row.id)"
                    >
                      <i class="fa-solid text-[9px]" :class="expandedRowSet.has(row.id) ? 'fa-minus' : 'fa-plus'"></i>
                    </button>
                    {{ row.label }}
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-pic-text-muted">{{ row.previous }}</td>
                  <td class="px-3 py-2.5 text-right font-mono font-bold text-pic-text-main">{{ row.current }}</td>
                  <td class="px-3 py-2.5 text-right font-mono text-pic-text-muted">{{ row.target }}</td>
                  <td
                    class="px-3 py-2.5 text-right font-mono font-bold tabular-nums"
                    :class="row.variance.startsWith('-') ? 'text-pic-danger' : 'text-pic-success'"
                  >
                    {{ row.variance }}
                  </td>
                  <td class="bg-pic-muted-surface/50 px-3 py-2.5 text-right font-mono font-bold text-pic-text-main">{{ row.share }}</td>
                </tr>
                <tr
                  v-for="child in expandedRowSet.has(row.id) ? row.children : []"
                  :key="child.id"
                  class="bg-pic-muted-surface/60 text-pic-text-muted"
                >
                  <td class="sticky left-0 z-10 bg-pic-muted-surface px-3 py-2 pl-12 font-medium">{{ child.label }}</td>
                  <td class="px-3 py-2 text-right">—</td>
                  <td class="px-3 py-2 text-right font-mono">{{ child.current }}</td>
                  <td class="px-3 py-2 text-right font-mono">{{ child.target }}</td>
                  <td
                    class="px-3 py-2 text-right font-mono font-bold"
                    :class="child.variance.startsWith('-') ? 'text-pic-danger' : 'text-pic-success'"
                  >
                    {{ child.variance }}
                  </td>
                  <td class="px-3 py-2 text-right">—</td>
                </tr>
              </template>
            </tbody>
            <tfoot class="border-t-2 border-pic-border bg-pic-muted-surface font-extrabold text-pic-text-main">
              <tr>
                <td class="sticky left-0 bg-pic-muted-surface px-3 py-3">TOTAL</td>
                <td class="px-3 py-3 text-right font-mono">$21.0M</td>
                <td class="px-3 py-3 text-right font-mono">$22.8M</td>
                <td class="px-3 py-3 text-right font-mono">$22.6M</td>
                <td class="px-3 py-3 text-right font-mono text-pic-success">+0.9%</td>
                <td class="px-3 py-3 text-right font-mono">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]">
      <article class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-brand">Comportamientos</p>
        <h2 class="mt-1 text-lg font-extrabold text-pic-text-main">Detalles que no deben improvisarse</h2>
        <div class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div v-for="guide in behaviorGuides" :key="guide.title" class="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-lg border border-pic-border bg-pic-muted-surface p-3">
            <span class="grid h-8 w-8 place-items-center rounded-lg bg-pic-brand-soft text-pic-brand">
              <i :class="guide.icon"></i>
            </span>
            <div>
              <h3 class="text-xs font-extrabold text-pic-text-main">{{ guide.title }}</h3>
              <p class="mt-1 text-[11px] font-medium leading-4 text-pic-text-muted">{{ guide.instruction }}</p>
            </div>
          </div>
        </div>
      </article>

      <article class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-brand">Lista de revisión</p>
        <h2 class="mt-1 text-lg font-extrabold text-pic-text-main">Antes de publicar</h2>
        <div class="mt-4 space-y-2">
          <div v-for="item in tableQualityChecklist" :key="item" class="flex items-start gap-2.5">
            <i class="fa-solid fa-check mt-1 text-[9px] text-pic-success"></i>
            <p class="text-[11px] font-medium leading-4 text-pic-text-muted">{{ item }}</p>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
