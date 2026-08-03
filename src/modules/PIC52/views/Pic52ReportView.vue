<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import Pic52ChartsPanel from '../components/Pic52ChartsPanel.vue';
import Pic52ComparisonTable from '../components/Pic52ComparisonTable.vue';
import Pic52FilterShell from '../components/Pic52FilterShell.vue';
import Pic52MatrixSelector from '../components/Pic52MatrixSelector.vue';
import { StdAlert, StdButton, StdSection } from '@/modules/Shared/components/std';
import { usePic52Store, type Pic52ReportMode } from '../stores/pic52Store';

const store = usePic52Store();
const {
  isInitializing,
  isReady,
  initializationError,
  dependentError,
  filtersDirty,
  appliedPayload,
  report,
  reportError,
  isReportLoading,
  hasObservedReportData,
  selectedYears,
  catalogs,
  context,
} = storeToRefs(store);

const matrixSelectorOpen = ref(false);
const scopeLabel = computed(() => {
  const scope = [context.value?.gerencia, context.value?.jefatura].filter(Boolean);
  return scope.length ? scope.join(' · ') : 'Alcance general';
});
const headerMeta = computed(() => (
  `52 semanas · ${selectedYears.value.length || 0} años`
));
const sameSelection = (left: Array<string | number>, right: Array<string | number>) => (
  [...left].map(String).sort().join('|') === [...right].map(String).sort().join('|')
);
const appliedFilterSummary = computed(() => {
  const payload = appliedPayload.value;
  const catalog = catalogs.value;
  if (!payload || !catalog) return '';

  const parts: string[] = [];
  const defaultYears = catalog.defaultYears?.length
    ? catalog.defaultYears
    : catalog.years.slice(0, 3);
  if (!sameSelection(payload.years, defaultYears)) {
    parts.push(`Años: ${payload.years.join(', ')}`);
  }

  const defaultTransaction = catalog.transactions.find(option => option.value === 'Ventas')
    ?? catalog.transactions[0];
  if (defaultTransaction && payload.transaction !== defaultTransaction.value) {
    parts.push(`Transacción: ${payload.transaction}`);
  }

  const defaultWeekEnd = payload.years.some(
    year => catalog.weeksByYear[String(year)]?.includes(53),
  ) ? 53 : 52;
  const defaultWeeks = Array.from({ length: defaultWeekEnd }, (_, index) => index + 1);
  if (!sameSelection(payload.weeks, defaultWeeks)) {
    parts.push(`Semanas: ${payload.weeks[0]}–${payload.weeks.at(-1)}`);
  }

  const filterLabels: Record<string, { singular: string; plural: string }> = {
    canales: { singular: 'Canal', plural: 'canales' },
    gerencias: { singular: 'Gerencia', plural: 'gerencias' },
    jefaturas: { singular: 'Jefatura', plural: 'jefaturas' },
    rutas: { singular: 'Ruta', plural: 'rutas' },
    matrices: { singular: 'Matriz', plural: 'matrices' },
    formatos: { singular: 'Formato', plural: 'formatos' },
    marcas: { singular: 'Marca', plural: 'marcas' },
    gruposSku: { singular: 'Grupo SKU', plural: 'grupos SKU' },
    categorias: { singular: 'Categoría', plural: 'categorías' },
    gruposComercialesA: { singular: 'Grupo comercial A', plural: 'grupos comerciales A' },
    gruposComercialesB: { singular: 'Grupo comercial B', plural: 'grupos comerciales B' },
    skus: { singular: 'SKU', plural: 'SKU' },
  };
  const contextDefaults: Record<string, string[]> = {
    gerencias: context.value?.gerencia ? [context.value.gerencia] : [],
    jefaturas: context.value?.jefatura ? [context.value.jefatura] : [],
  };

  Object.entries(payload.filters).forEach(([key, values]) => {
    const defaults = contextDefaults[key] ?? [];
    if (sameSelection(values, defaults) || values.length === 0) return;
    const label = filterLabels[key];
    if (!label) return;
    parts.push(
      values.length === 1
        ? `${label.singular}: ${values[0]}`
        : `${values.length} ${label.plural}`,
    );
  });

  if (parts.length <= 3) return parts.join(' · ');
  return `${parts.slice(0, 3).join(' · ')} · +${parts.length - 3} filtros`;
});

const scrollToResult = async (targetId = 'pic52-results') => {
  await nextTick();
  const target = document.getElementById(targetId);
  if (!target) return;

  const scrollContainer = target.closest<HTMLElement>('[data-admin-scroll-container]');
  if (!scrollContainer) return;

  const containerTop = scrollContainer.getBoundingClientRect().top;
  const targetTop = target.getBoundingClientRect().top;
  const nextScrollTop = Math.max(
    0,
    scrollContainer.scrollTop + targetTop - containerTop - 16,
  );

  scrollContainer.scrollTo({
    top: nextScrollTop,
    behavior: 'smooth',
  });
};

const handleApply = async (_mode: Pic52ReportMode) => {
  await scrollToResult();
};

const handleReportRetry = async () => {
  await store.retryReport();
  await scrollToResult();
};

onMounted(() => {
  void store.initialize();
});
</script>

<template>
  <main class="min-h-full bg-pic-background px-5 pt-4 font-sans text-pic-text-main sm:px-10 sm:pt-5 lg:px-16">
    <div class="mx-auto max-w-[1800px] space-y-4">
      <header class="flex flex-col gap-3 py-1 md:flex-row md:items-center md:justify-between">
        <div class="min-w-0">
          <h1 class="flex items-center gap-2 text-xl font-black leading-none tracking-tight text-pic-text-main md:text-lg">
            <i class="fa-solid fa-chart-line text-pic-brand" aria-hidden="true"></i>
            Reporte PIC 52S
          </h1>
        </div>
        <div class="flex flex-wrap items-center gap-2 md:justify-end">
          <span class="inline-flex h-8 items-center rounded-lg border border-pic-border bg-pic-surface px-3 text-[11px] font-bold text-pic-text-muted">
            {{ headerMeta }}
          </span>
          <span class="inline-flex h-8 items-center gap-2 rounded-lg border border-pic-border bg-pic-muted-surface px-3 text-[11px] font-bold text-pic-text-muted">
            <i v-if="isInitializing" class="fa-solid fa-circle-notch fa-spin text-pic-brand"></i>
            <span v-else class="h-2 w-2 rounded-sm" :class="isReady ? 'bg-pic-success' : 'bg-pic-danger'"></span>
            {{ isInitializing ? 'Conectando filtros' : scopeLabel }}
          </span>
        </div>
      </header>

      <StdAlert
        v-if="initializationError"
        title="No fue posible cargar los filtros"
        :description="initializationError"
        tone="danger"
      />
      <div v-if="initializationError" class="flex justify-end">
        <StdButton size="sm" icon="fa-solid fa-rotate-right" @click="store.initialize(true)">
          Reintentar conexión
        </StdButton>
      </div>

      <StdAlert
        v-if="dependentError"
        title="Una cascada no pudo actualizarse"
        :description="dependentError"
        tone="warning"
      />
      <div v-if="dependentError" class="flex justify-end">
        <StdButton size="sm" icon="fa-solid fa-rotate-right" @click="store.retryDependentOptions">
          Reintentar cascadas
        </StdButton>
      </div>

      <Pic52FilterShell
        :matrix-selector-open="matrixSelectorOpen"
        @open-matrix-selector="matrixSelectorOpen = true"
        @apply="handleApply"
      />

      <StdAlert
        v-if="isReady && !appliedPayload"
        title="Configura la primera comparación"
        description="Selecciona el alcance, los años y las semanas; después usa Visualizar para consultar las tablas comparativas."
        tone="info"
      />

      <StdAlert
        v-else-if="appliedPayload && filtersDirty"
        title="El resultado mostrado no incluye los cambios pendientes"
        description="Cambiaste uno o más filtros. Vuelve a usar Visualizar antes de interpretar o comparar los datos."
        tone="warning"
      />

      <template v-if="reportError">
        <StdAlert
          title="No fue posible generar el reporte"
          :description="reportError"
          tone="danger"
        />
        <div class="flex justify-end">
          <StdButton
            size="sm"
            icon="fa-solid fa-rotate-right"
            :disabled="isReportLoading"
            @click="handleReportRetry"
          >
            Reintentar reporte
          </StdButton>
        </div>
      </template>

      <section
        v-if="isReportLoading"
        id="pic52-results"
        aria-busy="true"
        aria-label="Cargando tablas y gráficas comparativas"
        class="grid grid-cols-1 gap-4 min-[1500px]:grid-cols-2"
      >
        <article
          v-for="metric in ['Kilogramos', 'Pesos']"
          :key="metric"
          class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm"
        >
          <div class="flex items-center gap-3 border-b border-pic-border px-4 py-3">
            <span class="h-9 w-9 animate-pulse rounded-lg bg-pic-brand-soft"></span>
            <div class="flex-1 space-y-2">
              <span class="block h-2.5 w-28 animate-pulse rounded bg-pic-border"></span>
              <span class="block h-4 w-52 max-w-full animate-pulse rounded bg-pic-muted-surface"></span>
            </div>
          </div>
          <div class="divide-y divide-pic-border">
            <div v-for="row in 9" :key="row" class="grid grid-cols-5 gap-3 px-4 py-3">
              <span
                v-for="column in 5"
                :key="column"
                class="h-3 animate-pulse rounded bg-pic-muted-surface"
              ></span>
            </div>
          </div>
        </article>
      </section>

      <StdSection
        v-else-if="report && !hasObservedReportData"
        id="pic52-results"
        eyebrow="Resultado vacío"
        title="No hay registros para la selección aplicada"
        description="La cuadrícula semanal se recibió correctamente, pero ninguna semana contiene datos observados. Ajusta los filtros y vuelve a visualizar."
        icon="fa-regular fa-folder-open"
      >
        <div class="rounded-xl border border-dashed border-pic-border bg-pic-muted-surface px-5 py-8 text-center">
          <p class="text-xs font-bold text-pic-text-muted">
            Las semanas ausentes no se convierten en cero ni participan en los totales.
          </p>
        </div>
      </StdSection>

      <section
        v-else-if="report && hasObservedReportData && !filtersDirty"
        id="pic52-results"
        class="space-y-4"
      >
        <Pic52ChartsPanel
          :report="report"
        />

        <Pic52ComparisonTable
          :report="report"
          metric="kg"
          :filter-summary="appliedFilterSummary"
        />
        <Pic52ComparisonTable
          :report="report"
          metric="pesos"
          :filter-summary="appliedFilterSummary"
        />
      </section>

    </div>

    <Pic52MatrixSelector v-model="matrixSelectorOpen" />
  </main>
</template>
