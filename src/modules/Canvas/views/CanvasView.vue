<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  StdAlert,
  StdButton,
  StdPageHeader,
  StdSection,
  StdSwitch,
} from '@/modules/Shared/components/std';
import CanvasBar3D from '../components/CanvasBar3D.vue';
import CanvasControls from '../components/CanvasControls.vue';
import CanvasFileDropzone from '../components/CanvasFileDropzone.vue';
import CanvasHeatmap from '../components/CanvasHeatmap.vue';
import CanvasInspector from '../components/CanvasInspector.vue';
import { useCanvasWorkspace } from '../composables/useCanvasWorkspace';
import { useCanvasStore } from '../stores/canvasStore';
import type {
  CanvasBarMode,
  CanvasDimension,
  CanvasInspectorTab,
  CanvasMetric,
  CanvasSelectionSource,
  CanvasTableRow,
  CanvasViewMode,
} from '../types/canvasTypes';
import { getCanvasDimensionValue } from '../utils/canvasAnalytics';
import {
  formatCanvasCompactKg,
  formatCanvasKg,
  formatCanvasPercent,
  formatCanvasScore,
} from '../utils/canvasFormatters';
import { supportsCanvasWebGL } from '../utils/canvasWebgl';

const store = useCanvasStore();
const workspace = useCanvasWorkspace(false);
const webglAvailable = ref(true);
const bar3d = ref<InstanceType<typeof CanvasBar3D> | null>(null);
const chartWorkspace = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);
const barMode = ref<CanvasBarMode>('result');
const fullscreenError = ref('');
const fullscreenSupported = computed(() => Boolean(document.fullscreenEnabled));
let desktopMedia: MediaQueryList | null = null;

const fileMeta = computed(() => store.hasData ? `${store.rows.length} registros válidos` : 'Sesión local');
const activeView = computed<CanvasViewMode>(() => (
  store.viewMode === 'bar3d' && webglAvailable.value ? 'bar3d' : 'heatmap'
));
const isLossScenario = computed(() => store.analysis.kpis.netDifference < 0);
const effectiveBarMode = computed<CanvasBarMode>(() => (
  store.metric === 'netDifference' ? barMode.value : 'result'
));

const evidenceRows = computed<CanvasTableRow[]>(() => {
  const sourceRows = store.selectedCell?.sourceRows || [];
  return sourceRows.map((row) => {
    const x = getCanvasDimensionValue(row, store.axis.x);
    const y = getCanvasDimensionValue(row, store.axis.y);
    const cell = store.analysis.cells.find((item) => item.key === `${x}\u241f${y}`);
    const rowLossShare = row.diferencia < 0 && store.analysis.kpis.grossLoss > 0
      ? Math.abs(row.diferencia) / store.analysis.kpis.grossLoss
      : 0;

    return {
      id: row.id,
      cadena: row.cadena,
      linea: row.linea,
      familia: row.familia,
      diferencia: formatCanvasKg(row.diferencia),
      brecha: formatCanvasKg(Math.abs(row.diferencia)),
      participacion: formatCanvasPercent(rowLossShare),
      desviacion: formatCanvasScore(cell?.peerDeviation ?? null),
    };
  });
});

const handleFile = async (file: File) => {
  await store.loadFile(file);
  workspace.resetContext();
  workspace.setInspectorOpen(false);
};

const changeFile = () => {
  store.reset();
  barMode.value = 'result';
  workspace.resetContext();
  workspace.setInspectorOpen(false);
};

const handleAxis = (target: 'x' | 'y', dimension: CanvasDimension) => {
  store.setAxisDimension(target, dimension);
  workspace.resetContext();
};

const handleMetric = (metric: CanvasMetric) => {
  store.setMetric(metric);
  if (metric !== 'netDifference') barMode.value = 'result';
  workspace.resetContext();
};

const setBarMode = (mode: CanvasBarMode) => {
  barMode.value = mode;
  store.selectCell(null);
  workspace.resetContext();
};

const handleFilterToggle = (value: string) => {
  store.toggleFilterValue(value);
  workspace.resetContext();
};

const handleAllFilters = () => {
  store.selectAllFilterValues();
  workspace.resetContext();
};

const selectCell = (key: string, source: CanvasSelectionSource) => {
  const isClearing = store.selectedCellKey === key;
  store.selectCell(isClearing ? null : key);
  if (isClearing) workspace.resetContext();
  else workspace.registerSelection(source);
};

const setInspectorTab = (tab: CanvasInspectorTab) => {
  workspace.setActiveTab(tab);
};

const setView = (mode: CanvasViewMode) => {
  if (mode === 'bar3d' && !webglAvailable.value) return;
  store.setViewMode(mode);
};

const handleWebglError = () => {
  webglAvailable.value = false;
  store.setViewMode('heatmap');
};

const syncFullscreenState = () => {
  isFullscreen.value = document.fullscreenElement === chartWorkspace.value;
};

const toggleFullscreen = async () => {
  fullscreenError.value = '';
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (chartWorkspace.value?.requestFullscreen) await chartWorkspace.value.requestFullscreen();
    else fullscreenError.value = 'Este navegador no permite ampliar Canvas a pantalla completa.';
  } catch {
    fullscreenError.value = 'No fue posible cambiar a pantalla completa. Revisa los permisos del navegador.';
  }
};

const handleViewportChange = (event: MediaQueryListEvent) => {
  if (!event.matches) workspace.setInspectorOpen(false);
};

const handleEscape = (event: KeyboardEvent) => {
  if (
    event.key === 'Escape'
    && !document.fullscreenElement
    && !desktopMedia?.matches
    && workspace.inspectorOpen.value
  ) workspace.setInspectorOpen(false);
};

onMounted(() => {
  webglAvailable.value = supportsCanvasWebGL();
  desktopMedia = window.matchMedia('(min-width: 1280px)');
  desktopMedia.addEventListener('change', handleViewportChange);
  document.addEventListener('fullscreenchange', syncFullscreenState);
  window.addEventListener('keydown', handleEscape);
  if (!webglAvailable.value || window.matchMedia('(max-width: 767px)').matches) {
    store.setViewMode('heatmap');
  }
});

onBeforeUnmount(() => {
  desktopMedia?.removeEventListener('change', handleViewportChange);
  document.removeEventListener('fullscreenchange', syncFullscreenState);
  window.removeEventListener('keydown', handleEscape);
  store.reset();
});
</script>

<template>
  <main
    class="bg-pic-background font-sans"
    :class="store.hasData ? 'h-full min-h-0 overflow-hidden p-2 sm:p-3' : 'min-h-full px-3 py-4 sm:px-5 lg:px-7'"
  >
    <div v-if="!store.hasData" class="mx-auto max-w-[1580px] space-y-4">
      <StdPageHeader
        eyebrow="Analítica / Laboratorio temporal"
        title="Canvas"
        description="Explora brechas de ventas en kg entre 2026 y 2025 mediante una matriz multidimensional."
        icon="fa-solid fa-cubes-stacked"
        :meta="fileMeta"
      />

      <StdAlert
        v-if="!webglAvailable"
        title="Vista 3D no disponible"
        description="Canvas utilizará automáticamente el mapa 2D porque este dispositivo no expone WebGL."
        tone="warning"
      />

      <StdSection
        eyebrow="Paso 1"
        title="Carga el comparativo"
        description="El archivo no sale de tu equipo y se descarta al abandonar Canvas o recargar la página."
        icon="fa-solid fa-file-excel"
      >
        <CanvasFileDropzone
          :file-name="store.fileName"
          :file-size="store.fileSize"
          :loading="store.isParsing"
          :issues="store.issues"
          @file="handleFile"
          @clear="store.reset"
        />

        <div v-if="store.issues.length" class="mt-4 space-y-2" aria-live="polite">
          <StdAlert
            v-for="issue in store.issues"
            :key="`${issue.code}-${issue.row || 0}`"
            :title="issue.row ? `Revisa la fila ${issue.row}` : 'No se pudo usar el archivo'"
            :description="issue.message"
            tone="danger"
          />
        </div>
      </StdSection>
    </div>

    <div
      v-else
      ref="chartWorkspace"
      class="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm"
      :class="isFullscreen ? 'h-screen w-screen rounded-none border-0 bg-pic-background p-2' : ''"
    >
      <header class="relative z-40 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-pic-border bg-pic-surface px-2 py-2 xl:h-14 xl:flex-nowrap xl:py-0">
        <div class="order-1 flex min-w-0 items-center gap-2 xl:w-44 xl:shrink-0">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pic-brand text-white shadow-sm">
            <i class="fa-solid fa-cubes-stacked"></i>
          </span>
          <div class="hidden min-w-0 sm:block">
            <p class="text-xs font-black text-pic-text-main">Canvas</p>
            <p class="truncate text-[9px] font-semibold text-pic-text-muted">{{ store.fileName }} · {{ store.rows.length }}</p>
          </div>
        </div>

        <div class="order-3 w-full md:order-3 xl:order-2 xl:min-w-0 xl:flex-1">
          <CanvasControls
            :axis="store.axis"
            :metric="store.metric"
            :filter-values="store.filterValues"
            :selected-filter-values="store.selectedFilterValues"
            @axis="handleAxis"
            @metric="handleMetric"
            @toggle-filter="handleFilterToggle"
            @all-filters="handleAllFilters"
          />
        </div>

        <div class="order-2 ml-auto flex shrink-0 items-center gap-1 xl:order-3">
          <StdSwitch
            v-if="activeView === 'bar3d' && store.metric === 'netDifference'"
            class="h-9 px-1.5"
            :model-value="effectiveBarMode === 'participation'"
            :label="effectiveBarMode === 'participation' ? 'Participación' : 'Resultado'"
            aria-label="Alternar entre resultado y participación"
            :title="effectiveBarMode === 'participation' ? 'Mostrar resultado por pérdida y ganancia' : `Desglosar por ${store.axis.filter}`"
            @update:model-value="setBarMode($event ? 'participation' : 'result')"
          />
          <div class="inline-grid h-9 grid-cols-2 gap-0.5 rounded-lg bg-pic-muted-surface p-0.5">
            <button type="button" class="rounded-md px-2 text-[10px] font-black transition" :class="activeView === 'bar3d' ? 'bg-pic-surface text-pic-brand shadow-sm' : 'text-pic-text-muted'" :disabled="!webglAvailable" aria-label="Vista 3D" @click="setView('bar3d')"><i class="fa-solid fa-cubes-stacked"></i></button>
            <button type="button" class="rounded-md px-2 text-[10px] font-black transition" :class="activeView === 'heatmap' ? 'bg-pic-surface text-pic-brand shadow-sm' : 'text-pic-text-muted'" aria-label="Mapa 2D" @click="setView('heatmap')"><i class="fa-solid fa-table-cells"></i></button>
          </div>
          <button v-if="activeView === 'bar3d'" type="button" class="grid h-9 w-9 place-items-center rounded-lg text-pic-text-muted transition hover:bg-pic-muted-surface hover:text-pic-brand" aria-label="Restablecer cámara" title="Restablecer cámara" @click="bar3d?.resetCamera()"><i class="fa-solid fa-camera-rotate"></i></button>
          <button type="button" class="relative grid h-9 w-9 place-items-center rounded-lg text-pic-text-muted transition hover:bg-pic-muted-surface hover:text-pic-brand" :aria-pressed="workspace.inspectorOpen.value" aria-label="Mostrar inspector" title="Inspector" @click="workspace.toggleInspector()">
            <i class="fa-solid fa-table-columns"></i>
          </button>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-pic-text-muted transition hover:bg-pic-muted-surface hover:text-pic-brand disabled:opacity-40" :disabled="!fullscreenSupported" :aria-label="isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'" :title="isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'" @click="toggleFullscreen"><i class="fa-solid" :class="isFullscreen ? 'fa-compress' : 'fa-expand'"></i></button>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-pic-text-muted transition hover:bg-pic-muted-surface hover:text-pic-brand" aria-label="Cambiar archivo" title="Cambiar archivo" @click="changeFile"><i class="fa-solid fa-file-arrow-up"></i></button>
        </div>
      </header>

      <div class="relative flex min-h-0 flex-1 overflow-hidden">
        <section class="relative min-w-0 flex-1 overflow-hidden bg-pic-surface" aria-label="Visualización principal de Canvas">
          <div class="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-8rem)] flex-wrap gap-1.5 sm:left-3 sm:top-3">
            <article class="rounded-lg border border-pic-border bg-pic-surface/95 px-3 py-2 shadow-sm backdrop-blur">
              <p class="text-[8px] font-black uppercase tracking-wide text-pic-text-muted">Diferencia neta</p>
              <p class="mt-0.5 font-mono text-xs font-black" :class="isLossScenario ? 'text-[hsl(var(--pic-accent-orange))]' : 'text-[hsl(var(--pic-accent-blue))]'">{{ formatCanvasCompactKg(store.analysis.kpis.netDifference) }}</p>
            </article>
            <article class="rounded-lg border border-pic-border bg-pic-surface/95 px-3 py-2 shadow-sm backdrop-blur">
              <p class="text-[8px] font-black uppercase tracking-wide text-pic-text-muted">Pérdidas brutas</p>
              <p class="mt-0.5 font-mono text-xs font-black text-[hsl(var(--pic-accent-orange))]">{{ formatCanvasCompactKg(store.analysis.kpis.grossLoss) }}</p>
            </article>
          </div>

          <div v-if="!webglAvailable || fullscreenError" class="absolute bottom-3 left-3 z-20 max-w-sm rounded-lg border border-[hsl(var(--pic-warning)/0.3)] bg-[hsl(var(--pic-warning)/0.1)] px-3 py-2 text-[10px] font-bold text-pic-text-main shadow-sm">
            {{ fullscreenError || 'WebGL no disponible: se utiliza el mapa 2D.' }}
          </div>

          <CanvasBar3D
            v-if="activeView === 'bar3d'"
            ref="bar3d"
            class="h-full min-h-0"
            :analysis="store.analysis"
            :metric="store.metric"
            :mode="effectiveBarMode"
            :filter-domain="store.filterValues"
            :selected-key="store.selectedCellKey"
            :fullscreen="isFullscreen"
            fill-available
            @select="selectCell($event, 'chart')"
            @webgl-error="handleWebglError"
          />
          <CanvasHeatmap
            v-else
            class="h-full min-h-0"
            :analysis="store.analysis"
            :metric="store.metric"
            :selected-key="store.selectedCellKey"
            :fullscreen="isFullscreen"
            fill-available
            @select="selectCell($event, 'chart')"
          />
        </section>

        <CanvasInspector
          :open="workspace.inspectorOpen.value"
          :active-tab="workspace.activeTab.value"
          :analysis="store.analysis"
          :selected-cell="store.selectedCell"
          :selected-key="store.selectedCellKey"
          :metric="store.metric"
          :evidence-rows="evidenceRows"
          @toggle="workspace.toggleInspector()"
          @tab="setInspectorTab"
          @select="selectCell($event, 'ranking')"
        />
      </div>
    </div>
  </main>
</template>
