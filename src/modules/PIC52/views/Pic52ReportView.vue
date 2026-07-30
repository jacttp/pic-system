<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import Pic52ChartsPanel from '../components/Pic52ChartsPanel.vue';
import Pic52ComparisonTable from '../components/Pic52ComparisonTable.vue';
import Pic52FilterShell from '../components/Pic52FilterShell.vue';
import Pic52MatrixSelector from '../components/Pic52MatrixSelector.vue';
import { StdAlert, StdButton, StdPageHeader, StdSection } from '@/modules/Shared/components/std';
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
  reportFromCache,
  hasObservedReportData,
  selectedYears,
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
const generatedAt = computed(() => {
  if (!report.value?.generatedAt) return '';
  const date = new Date(report.value.generatedAt);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
});
const coverageSummary = computed(() => {
  if (!report.value) return '';
  const observed = report.value.series.reduce(
    (total, series) => total + series.totals.observedWeeks,
    0,
  );
  const possible = report.value.series.length * report.value.weeks.length;
  return `${observed} de ${possible} puntos observados`;
});

const scrollToResult = async (targetId = 'pic52-results') => {
  await nextTick();
  document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  <main class="min-h-screen bg-pic-background px-3 py-4 text-pic-text-main sm:px-4 lg:px-6 lg:py-5">
    <div class="mx-auto max-w-[1800px] space-y-4">
      <StdPageHeader
        eyebrow="Analítica semanal"
        title="Reporte PIC 52S"
        description="Comparativo de kilogramos y pesos por semana para todos los años seleccionados."
        icon="fa-solid fa-chart-line"
        :meta="headerMeta"
      >
        <template #actions>
          <span class="inline-flex h-8 items-center gap-2 rounded-lg border border-pic-border bg-pic-muted-surface px-3 text-[11px] font-bold text-pic-text-muted">
            <i v-if="isInitializing" class="fa-solid fa-circle-notch fa-spin text-pic-brand"></i>
            <span v-else class="h-2 w-2 rounded-sm" :class="isReady ? 'bg-pic-success' : 'bg-pic-danger'"></span>
            {{ isInitializing ? 'Conectando filtros' : scopeLabel }}
          </span>
        </template>
      </StdPageHeader>

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
        class="space-y-3"
      >
        <div class="flex flex-col gap-3 rounded-xl border border-pic-brand-border bg-pic-brand-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pic-brand text-white">
              <i class="fa-solid fa-table-columns"></i>
            </span>
            <div class="min-w-0">
              <p class="text-[9px] font-black uppercase tracking-[0.16em] text-pic-brand">Comparación aplicada</p>
              <p class="mt-0.5 text-xs font-black text-pic-text-main">
                {{ report.years.join(' · ') }} · {{ report.transaction.label }}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-[10px] font-bold text-pic-text-muted">
            <span class="rounded-lg border border-pic-brand-border bg-pic-surface px-2.5 py-1.5">
              {{ coverageSummary }}
            </span>
            <span class="rounded-lg border border-pic-brand-border bg-pic-surface px-2.5 py-1.5">
              {{ reportFromCache ? 'Caché' : 'Consulta nueva' }}
            </span>
            <span v-if="generatedAt" class="font-mono">{{ generatedAt }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 min-[1500px]:grid-cols-2">
          <Pic52ComparisonTable :report="report" metric="kg" />
          <Pic52ComparisonTable :report="report" metric="pesos" />
        </div>
      </section>

      <Pic52ChartsPanel
        v-if="report && hasObservedReportData && !filtersDirty"
        :report="report"
      />

    </div>

    <Pic52MatrixSelector v-model="matrixSelectorOpen" />
  </main>
</template>
