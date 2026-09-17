<script setup lang="ts">
import { computed, ref, type CSSProperties } from 'vue';
import type {
  SelloutHeatmapMode,
  SelloutMatrix,
  SelloutMatrixEntity,
  SelloutPeriodKey,
} from '../types/selloutAnalytics';
import { calculateHeatmapChanges, calculateSelloutMetrics } from '../utils/selloutMetrics';

interface Props {
  periods: SelloutPeriodKey[];
  root: SelloutMatrix | null;
  storesByChain: Record<string, SelloutMatrix>;
  skusByStore: Record<string, SelloutMatrix>;
  expandedChains: string[];
  expandedStores: string[];
  loadingBranches: string[];
  overallTotalKg: number;
  loading?: boolean;
}

interface DisplayCell {
  key: string;
  value: number | null;
  label: string;
  tone: 'missing' | 'zero' | 'negative' | 'positive';
  title: string;
  style?: CSSProperties;
}

interface EntityRow {
  kind: 'entity';
  key: string;
  depth: 0 | 1 | 2;
  entity: SelloutMatrixEntity;
  label: string;
  secondary: string;
  canExpand: boolean;
  expanded: boolean;
  branchLoading: boolean;
  cells: DisplayCell[];
  totalLabel: string;
  averageLabel: string;
  weeklyDeltaLabel: string;
  weeklyDeltaPctLabel: string;
  trendLabel: string;
  trendPctLabel: string;
  participationLabel: string;
  weeklyTone: string;
  trendTone: string;
}

interface PagerRow {
  kind: 'pager';
  key: string;
  depth: 1 | 2;
  level: 'store' | 'sku';
  chain: string;
  store: string | null;
  page: number;
  totalPages: number;
  previousPage: number;
  nextPage: number;
  canPrevious: boolean;
  canNext: boolean;
}

type DisplayRow = EntityRow | PagerRow;

const props = withDefaults(defineProps<Props>(), { loading: false });
const emit = defineEmits<{
  (event: 'toggle-chain', entity: SelloutMatrixEntity): void;
  (event: 'toggle-store', entity: SelloutMatrixEntity): void;
  (event: 'root-page', page: number): void;
  (event: 'store-page', payload: { chain: string; page: number }): void;
  (event: 'sku-page', payload: { chain: string; store: string; page: number }): void;
}>();

const keyForPeriod = (period: SelloutPeriodKey) => `${period.year}-${period.week}`;
const keyForStore = (chain: string, store: string) => `${chain}\u001f${store}`;
const numberFormatter = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const percentFormatter = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const heatmapMode = ref<SelloutHeatmapMode>('values');

const formatKg = (value: number | null, signed = false) => {
  if (value === null) return '—';
  const label = numberFormatter.format(value);
  return signed && value > 0 ? `+${label}` : label;
};
const formatPercent = (value: number | null) => {
  if (value === null) return '—';
  return `${value > 0 ? '+' : ''}${percentFormatter.format(value)}%`;
};
const movementTone = (value: number | null) => (
  value === null || value === 0 ? 'text-pic-text-muted' : value > 0 ? 'text-pic-success' : 'text-pic-danger'
);

const visibleEntities = computed(() => {
  const entities: SelloutMatrixEntity[] = [];
  (props.root?.entities ?? []).forEach(chain => {
    entities.push(chain);
    if (!props.expandedChains.includes(chain.chain)) return;
    const stores = props.storesByChain[chain.chain];
    stores?.entities.forEach(store => {
      entities.push(store);
      if (!store.store) return;
      const identity = keyForStore(store.chain, store.store);
      if (!props.expandedStores.includes(identity)) return;
      props.skusByStore[identity]?.entities.forEach(sku => entities.push(sku));
    });
  });
  return entities;
});

const heatScale = computed(() => {
  const rawValues = visibleEntities.value.flatMap(entity => entity.values.map(value => value.kg));
  const changes = visibleEntities.value.flatMap(entity => (
    calculateHeatmapChanges(props.periods, entity.values).filter((value): value is number => value !== null)
  ));
  return {
    volume: Math.max(0, ...rawValues.filter(value => value > 0)),
    change: Math.max(0, ...changes.map(value => Math.abs(value))),
  };
});

const cellStyle = (value: number | null): CSSProperties | undefined => {
  if (heatmapMode.value === 'values' || value === null || value === 0) return undefined;
  if (heatmapMode.value === 'volume' && value < 0) {
    return { backgroundColor: 'hsl(var(--pic-danger) / 0.14)' };
  }
  const maximum = heatmapMode.value === 'volume' ? heatScale.value.volume : heatScale.value.change;
  if (maximum <= 0) return undefined;
  const opacity = 0.08 + (Math.min(Math.abs(value) / maximum, 1) * 0.42);
  const token = heatmapMode.value === 'change' && value < 0 ? '--pic-danger' : heatmapMode.value === 'change' ? '--pic-success' : '--pic-brand';
  return { backgroundColor: `hsl(var(${token}) / ${opacity})` };
};

const entityRow = (entity: SelloutMatrixEntity, depth: 0 | 1 | 2): EntityRow => {
  const values = new Map(entity.values.map(value => [keyForPeriod(value), value.kg]));
  const changes = calculateHeatmapChanges(props.periods, entity.values);
  const metrics = calculateSelloutMetrics(props.periods, entity.values, props.overallTotalKg);
  const cells = props.periods.map((period, index) => {
    const key = keyForPeriod(period);
    const rawValue = values.has(key) ? values.get(key)! : null;
    const value = heatmapMode.value === 'change' ? changes[index] : rawValue;
    const label = value === null ? '—' : formatKg(value, heatmapMode.value === 'change');
    return {
      key,
      value,
      label,
      tone: value === null ? 'missing' : value < 0 ? 'negative' : value === 0 ? 'zero' : 'positive',
      title: heatmapMode.value === 'change'
        ? (value === null ? 'Sin comparación semanal' : `Cambio semanal: ${label} kg`)
        : (rawValue === null ? 'Sin registro publicado' : `Volumen: ${formatKg(rawValue)} kg`),
      style: cellStyle(value),
    } as DisplayCell;
  });
  const storeIdentity = entity.store ? keyForStore(entity.chain, entity.store) : '';
  const expanded = depth === 0
    ? props.expandedChains.includes(entity.chain)
    : depth === 1 && props.expandedStores.includes(storeIdentity);
  const branchLoading = depth === 0
    ? props.loadingBranches.includes(`chain:${entity.chain}`)
    : depth === 1 && props.loadingBranches.includes(`store:${storeIdentity}`);

  return {
    kind: 'entity',
    key: `${depth}:${entity.id}`,
    depth,
    entity,
    label: depth === 0 ? entity.chain : depth === 1 ? entity.store || 'Sin tienda' : entity.sku || 'Sin SKU',
    secondary: depth === 2 ? entity.brand || 'Sin marca' : depth === 1 ? entity.chain : 'Cadena',
    canExpand: depth < 2,
    expanded,
    branchLoading,
    cells,
    totalLabel: numberFormatter.format(entity.totalKg),
    averageLabel: formatKg(metrics.averageKg),
    weeklyDeltaLabel: formatKg(metrics.weeklyDeltaKg, true),
    weeklyDeltaPctLabel: formatPercent(metrics.weeklyDeltaPct),
    trendLabel: formatKg(metrics.trendDeltaKg, true),
    trendPctLabel: formatPercent(metrics.trendDeltaPct),
    participationLabel: metrics.participationPct === null ? '—' : `${percentFormatter.format(metrics.participationPct)}%`,
    weeklyTone: movementTone(metrics.weeklyDeltaKg),
    trendTone: movementTone(metrics.trendDeltaKg),
  };
};

const pagerRow = (
  level: 'store' | 'sku',
  chain: string,
  store: string | null,
  matrix: SelloutMatrix,
): PagerRow => ({
  kind: 'pager',
  key: `pager:${level}:${chain}:${store || ''}`,
  depth: level === 'store' ? 1 : 2,
  level,
  chain,
  store,
  page: matrix.pagination.page,
  totalPages: matrix.pagination.totalPages,
  previousPage: Math.max(1, matrix.pagination.page - 1),
  nextPage: Math.min(matrix.pagination.totalPages, matrix.pagination.page + 1),
  canPrevious: matrix.pagination.page > 1,
  canNext: matrix.pagination.page < matrix.pagination.totalPages,
});

const displayRows = computed<DisplayRow[]>(() => {
  const rows: DisplayRow[] = [];
  (props.root?.entities ?? []).forEach(chain => {
    rows.push(entityRow(chain, 0));
    if (!props.expandedChains.includes(chain.chain)) return;

    const stores = props.storesByChain[chain.chain];
    stores?.entities.forEach(store => {
      rows.push(entityRow(store, 1));
      if (!store.store) return;
      const storeIdentity = keyForStore(store.chain, store.store);
      if (!props.expandedStores.includes(storeIdentity)) return;

      const skus = props.skusByStore[storeIdentity];
      skus?.entities.forEach(sku => rows.push(entityRow(sku, 2)));
      if (skus && skus.pagination.totalPages > 1) {
        rows.push(pagerRow('sku', store.chain, store.store, skus));
      }
    });
    if (stores && stores.pagination.totalPages > 1) {
      rows.push(pagerRow('store', chain.chain, null, stores));
    }
  });
  return rows;
});

const rootPagination = computed(() => props.root?.pagination ?? null);
const periodHeaders = computed(() => props.periods.map(period => ({
  key: keyForPeriod(period),
  year: period.year,
  label: `S${String(period.week).padStart(2, '0')}`,
})));
const columnCount = computed(() => props.periods.length + 7);

const toggleEntity = (row: EntityRow) => {
  if (row.depth === 0) emit('toggle-chain', row.entity);
  if (row.depth === 1) emit('toggle-store', row.entity);
};

const movePager = (row: PagerRow, page: number) => {
  if (row.level === 'store') emit('store-page', { chain: row.chain, page });
  if (row.level === 'sku' && row.store) emit('sku-page', { chain: row.chain, store: row.store, page });
};
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm">
    <div class="flex flex-col gap-3 border-b border-pic-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-brand">Matriz semanal</p>
        <h2 class="mt-1 text-sm font-black text-pic-text-main">Cadena → tienda → SKU</h2>
      </div>
      <div class="flex flex-col gap-2 sm:items-end">
        <div class="inline-flex w-fit rounded-lg border border-pic-border bg-pic-muted-surface p-1" aria-label="Modo de la matriz">
          <button
            v-for="option in ([
              { value: 'values', label: 'Valores' },
              { value: 'volume', label: 'Calor volumen' },
              { value: 'change', label: 'Calor cambio' },
            ] as const)"
            :key="option.value"
            type="button"
            class="rounded-md px-2.5 py-1 text-[10px] font-black transition"
            :class="heatmapMode === option.value ? 'bg-pic-brand text-white' : 'text-pic-text-muted hover:text-pic-brand'"
            :aria-pressed="heatmapMode === option.value"
            @click="heatmapMode = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-pic-text-muted">
          <span><i class="fa-solid fa-minus mr-1"></i>— sin registro/comparación</span>
          <span><i class="fa-solid fa-0 mr-1"></i>0 observado</span>
          <span v-if="heatmapMode !== 'values'">Escala común a filas visibles</span>
          <span class="text-pic-danger"><i class="fa-solid fa-arrow-down mr-1"></i>Negativo neto</span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex min-h-52 items-center justify-center gap-2 text-sm font-bold text-pic-text-muted">
      <i class="fa-solid fa-circle-notch fa-spin text-pic-brand"></i>
      Generando matriz
    </div>

    <div v-else-if="displayRows.length === 0" class="flex min-h-52 flex-col items-center justify-center px-5 text-center">
      <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-pic-muted-surface text-pic-text-muted">
        <i class="fa-solid fa-table-cells-large"></i>
      </span>
      <p class="mt-3 text-sm font-black text-pic-text-main">Sin resultados para los filtros aplicados</p>
      <p class="mt-1 text-xs font-semibold text-pic-text-muted">Ajusta el periodo o elimina algún filtro.</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th class="sticky left-0 z-30 min-w-[270px] border-b border-r border-pic-border bg-pic-muted-surface px-3 py-2 text-left font-black text-pic-text-main">
              Entidad
            </th>
            <th
              v-for="period in periodHeaders"
              :key="period.key"
              class="min-w-[94px] border-b border-r border-pic-border bg-pic-muted-surface px-2 py-2 text-right font-mono font-black text-pic-text-main"
            >
              <span class="block text-[9px] text-pic-text-muted">{{ period.year }}</span>
              {{ period.label }}
            </th>
            <th class="min-w-[100px] border-b border-r border-pic-border bg-pic-muted-surface px-2 py-2 text-right font-black text-pic-text-main">
              Prom. sem.
              <span class="block text-[9px] text-pic-text-muted">observadas</span>
            </th>
            <th class="min-w-[92px] border-b border-r border-pic-border bg-pic-muted-surface px-2 py-2 text-right font-black text-pic-text-main">Δ KG</th>
            <th class="min-w-[80px] border-b border-r border-pic-border bg-pic-muted-surface px-2 py-2 text-right font-black text-pic-text-main">Δ %</th>
            <th class="min-w-[110px] border-b border-r border-pic-border bg-pic-muted-surface px-2 py-2 text-right font-black text-pic-text-main">
              Tend. 4×4
              <span class="block text-[9px] text-pic-text-muted">promedio</span>
            </th>
            <th class="min-w-[82px] border-b border-r border-pic-border bg-pic-muted-surface px-2 py-2 text-right font-black text-pic-text-main">Part.</th>
            <th class="sticky right-0 z-20 min-w-[110px] border-b border-pic-border bg-pic-brand-soft px-3 py-2 text-right font-black text-pic-brand">
              Total KG
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in displayRows" :key="row.key">
            <tr v-if="row.kind === 'entity'" class="group">
              <th
                scope="row"
                class="sticky left-0 z-10 border-b border-r border-pic-border bg-pic-surface px-3 py-2 text-left transition group-hover:bg-pic-brand-soft"
              >
                <button
                  v-if="row.canExpand"
                  type="button"
                  class="flex w-full items-center gap-2 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
                  :class="row.depth === 1 ? 'pl-5' : ''"
                  :aria-expanded="row.expanded"
                  @click="toggleEntity(row)"
                >
                  <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-pic-brand-border text-pic-brand transition group-hover:bg-pic-brand group-hover:text-white"
                  >
                    <i v-if="row.branchLoading" class="fa-solid fa-circle-notch fa-spin text-[10px]"></i>
                    <i v-else class="fa-solid text-[10px]" :class="row.expanded ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate font-black text-pic-text-main">{{ row.label }}</span>
                    <span class="block truncate text-[9px] font-semibold uppercase text-pic-text-muted">{{ row.secondary }}</span>
                  </span>
                </button>
                <div v-else class="flex min-w-0 items-center gap-2 pl-10">
                  <span class="h-1.5 w-1.5 shrink-0 rounded-sm bg-pic-brand"></span>
                  <span class="min-w-0">
                    <span class="block truncate font-mono font-bold text-pic-text-main">{{ row.label }}</span>
                    <span class="block truncate text-[9px] font-semibold uppercase text-pic-text-muted">{{ row.secondary }}</span>
                  </span>
                </div>
              </th>
              <td
                v-for="cell in row.cells"
                :key="cell.key"
                class="border-b border-r border-pic-border px-2 py-2 text-right font-mono font-semibold transition group-hover:bg-pic-brand-soft/40"
                :style="cell.style"
                :title="cell.title"
                :class="{
                  'text-pic-text-muted': cell.tone === 'missing' || cell.tone === 'zero',
                  'text-pic-danger': cell.tone === 'negative',
                  'text-pic-text-main': cell.tone === 'positive',
                }"
              >
                {{ cell.label }}
              </td>
              <td class="border-b border-r border-pic-border px-2 py-2 text-right font-mono font-semibold text-pic-text-main">
                {{ row.averageLabel }}
              </td>
              <td class="border-b border-r border-pic-border px-2 py-2 text-right font-mono font-bold" :class="row.weeklyTone">
                {{ row.weeklyDeltaLabel }}
              </td>
              <td class="border-b border-r border-pic-border px-2 py-2 text-right font-mono font-bold" :class="row.weeklyTone">
                {{ row.weeklyDeltaPctLabel }}
              </td>
              <td class="border-b border-r border-pic-border px-2 py-2 text-right font-mono" :class="row.trendTone">
                <span class="block font-bold">{{ row.trendLabel }}</span>
                <span class="block text-[9px]">{{ row.trendPctLabel }}</span>
              </td>
              <td class="border-b border-r border-pic-border px-2 py-2 text-right font-mono font-semibold text-pic-text-main">
                {{ row.participationLabel }}
              </td>
              <td class="sticky right-0 border-b border-pic-border bg-pic-surface px-3 py-2 text-right font-mono font-black text-pic-text-main group-hover:bg-pic-brand-soft">
                {{ row.totalLabel }}
              </td>
            </tr>
            <tr v-else>
              <td :colspan="columnCount" class="border-b border-pic-border bg-pic-muted-surface px-3 py-2">
                <div class="flex items-center justify-end gap-2 text-[11px] font-bold text-pic-text-muted">
                  <button
                    type="button"
                    class="rounded-md border border-pic-border bg-pic-surface px-2 py-1 disabled:opacity-40"
                    :disabled="!row.canPrevious"
                    @click="movePager(row, row.previousPage)"
                  >
                    Anterior
                  </button>
                  <span>Página {{ row.page }} de {{ row.totalPages }}</span>
                  <button
                    type="button"
                    class="rounded-md border border-pic-border bg-pic-surface px-2 py-1 disabled:opacity-40"
                    :disabled="!row.canNext"
                    @click="movePager(row, row.nextPage)"
                  >
                    Siguiente
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div
      v-if="rootPagination && rootPagination.totalPages > 1"
      class="flex items-center justify-end gap-2 border-t border-pic-border px-4 py-3 text-xs font-bold text-pic-text-muted"
    >
      <button
        type="button"
        class="rounded-lg border border-pic-border px-3 py-1.5 disabled:opacity-40"
        :disabled="rootPagination.page <= 1"
        @click="emit('root-page', rootPagination.page - 1)"
      >
        Anterior
      </button>
      <span>Página {{ rootPagination.page }} de {{ rootPagination.totalPages }}</span>
      <button
        type="button"
        class="rounded-lg border border-pic-border px-3 py-1.5 disabled:opacity-40"
        :disabled="rootPagination.page >= rootPagination.totalPages"
        @click="emit('root-page', rootPagination.page + 1)"
      >
        Siguiente
      </button>
    </div>
  </section>
</template>
