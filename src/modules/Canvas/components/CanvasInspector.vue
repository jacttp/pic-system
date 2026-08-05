<script setup lang="ts">
import { computed } from 'vue';
import type {
  CanvasAnalysisResult,
  CanvasCell,
  CanvasInspectorTab,
  CanvasMetric,
  CanvasTableRow,
} from '../types/canvasTypes';
import { CANVAS_METRIC_LABELS } from '../types/canvasTypes';
import {
  formatCanvasCompactKg,
  formatCanvasKg,
  formatCanvasPercent,
  formatCanvasScore,
} from '../utils/canvasFormatters';
import CanvasRanking from './CanvasRanking.vue';

interface Props {
  open: boolean;
  activeTab: CanvasInspectorTab;
  unreadSelection: boolean;
  analysis: CanvasAnalysisResult;
  selectedCell: CanvasCell | null;
  selectedKey?: string | null;
  metric: CanvasMetric;
  evidenceRows: CanvasTableRow[];
}

const props = withDefaults(defineProps<Props>(), { selectedKey: null });
const emit = defineEmits<{
  (event: 'toggle'): void;
  (event: 'tab', tab: CanvasInspectorTab): void;
  (event: 'select', key: string): void;
}>();

const tabs: Array<{ id: CanvasInspectorTab; label: string; icon: string }> = [
  { id: 'priorities', label: 'Prioridades', icon: 'fa-solid fa-ranking-star' },
  { id: 'selection', label: 'Selección', icon: 'fa-solid fa-crosshairs' },
  { id: 'evidence', label: 'Evidencia', icon: 'fa-solid fa-list-ul' },
];

const selectedTitle = computed(() => props.selectedCell
  ? `${props.selectedCell.x} · ${props.selectedCell.y}`
  : 'Sin selección');
</script>

<template>
  <button
    v-if="open"
    type="button"
    class="absolute inset-0 z-20 bg-slate-950/25 backdrop-blur-[1px] xl:hidden"
    aria-label="Cerrar inspector"
    @click="emit('toggle')"
  ></button>

  <aside
    class="z-30 flex shrink-0 flex-col overflow-hidden border-pic-border bg-pic-surface shadow-2xl transition-[width,transform] duration-200 xl:relative xl:h-full xl:border-l xl:shadow-none"
    :class="open
      ? 'absolute inset-x-0 bottom-0 h-[72%] rounded-t-2xl border-t sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-[360px] sm:rounded-none sm:border-l sm:border-t-0 xl:inset-auto xl:w-[360px]'
      : 'hidden xl:flex xl:w-11'"
    aria-label="Inspector de Canvas"
  >
    <template v-if="open">
      <header class="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-pic-border px-3">
        <div class="min-w-0">
          <p class="text-[9px] font-black uppercase tracking-[0.14em] text-pic-brand">Inspector</p>
          <p class="truncate text-xs font-black text-pic-text-main">{{ selectedTitle }}</p>
        </div>
        <button type="button" class="grid h-8 w-8 place-items-center rounded-md text-pic-text-muted transition hover:bg-pic-muted-surface hover:text-pic-brand" aria-label="Plegar inspector" @click="emit('toggle')">
          <i class="fa-solid fa-angles-right"></i>
        </button>
      </header>

      <nav class="grid shrink-0 grid-cols-3 gap-1 border-b border-pic-border bg-pic-muted-surface p-1.5" aria-label="Secciones del inspector">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="relative inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-[10px] font-black transition"
          :class="activeTab === tab.id ? 'bg-pic-surface text-pic-brand shadow-sm' : 'text-pic-text-muted hover:text-pic-text-main'"
          :aria-pressed="activeTab === tab.id"
          @click="emit('tab', tab.id)"
        >
          <i :class="tab.icon"></i>
          {{ tab.label }}
          <span v-if="tab.id === 'selection' && unreadSelection" class="absolute right-1.5 top-1.5 h-2 w-2 rounded-md bg-pic-brand" aria-label="Nueva selección"></span>
        </button>
      </nav>

      <div class="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
        <section v-if="activeTab === 'priorities'" aria-labelledby="canvas-priorities-title">
          <div class="grid grid-cols-2 gap-2">
            <article class="rounded-lg border border-pic-border bg-[hsl(var(--pic-accent-blue-soft))] p-3">
              <p class="text-[9px] font-black uppercase tracking-wide text-pic-text-muted">Ganancias</p>
              <p class="mt-1 font-mono text-sm font-black text-pic-text-main">{{ formatCanvasCompactKg(analysis.kpis.gains) }}</p>
            </article>
            <article class="rounded-lg border border-pic-border bg-pic-muted-surface p-3">
              <p class="text-[9px] font-black uppercase tracking-wide text-pic-text-muted">Cobertura</p>
              <p class="mt-1 font-mono text-sm font-black text-pic-text-main">{{ analysis.kpis.observedCombinations }}/{{ analysis.kpis.expectedCombinations }}</p>
            </article>
          </div>
          <div class="mt-4 flex items-center justify-between gap-2">
            <div>
              <p class="text-[9px] font-black uppercase tracking-wide text-pic-brand">Escenario activo</p>
              <h2 id="canvas-priorities-title" class="text-sm font-black text-pic-text-main">Ranking</h2>
            </div>
            <span class="rounded-md bg-pic-muted-surface px-2 py-1 font-mono text-[9px] font-bold text-pic-text-muted">Top 8</span>
          </div>
          <CanvasRanking class="mt-3" :cells="analysis.observedCells" :selected-key="selectedKey" @select="emit('select', $event)" />
        </section>

        <section v-else-if="activeTab === 'selection'" aria-live="polite">
          <template v-if="selectedCell">
            <div class="rounded-xl border border-pic-brand-border bg-pic-brand-soft p-4 shadow-[inset_4px_0_0_0_hsl(var(--pic-brand))]">
              <p class="text-[9px] font-black uppercase tracking-wide text-pic-brand">Combinación seleccionada</p>
              <h2 class="mt-1 text-base font-black text-pic-text-main">{{ selectedTitle }}</h2>
              <p class="mt-1 text-[10px] font-semibold text-pic-text-muted">{{ CANVAS_METRIC_LABELS[metric] }}</p>
              <p class="mt-3 font-mono text-2xl font-black text-pic-text-main">{{ formatCanvasKg(selectedCell.netDifference) }}</p>
            </div>

            <dl class="mt-3 grid grid-cols-2 gap-2">
              <div class="rounded-lg border border-pic-border p-3">
                <dt class="text-[9px] font-black uppercase text-pic-text-muted">Brecha absoluta</dt>
                <dd class="mt-1 font-mono text-xs font-black text-pic-text-main">{{ formatCanvasKg(selectedCell.absoluteGap) }}</dd>
              </div>
              <div class="rounded-lg border border-pic-border p-3">
                <dt class="text-[9px] font-black uppercase text-pic-text-muted">% pérdida</dt>
                <dd class="mt-1 font-mono text-xs font-black text-pic-text-main">{{ formatCanvasPercent(selectedCell.lossShare) }}</dd>
              </div>
              <div class="rounded-lg border border-pic-border p-3">
                <dt class="text-[9px] font-black uppercase text-pic-text-muted">Cobertura</dt>
                <dd class="mt-1 font-mono text-xs font-black text-pic-text-main">{{ selectedCell.observedCount }}/{{ selectedCell.expectedCount }}</dd>
              </div>
              <div class="rounded-lg border border-pic-border p-3">
                <dt class="text-[9px] font-black uppercase text-pic-text-muted">Score par</dt>
                <dd class="mt-1 font-mono text-xs font-black text-pic-text-main">{{ formatCanvasScore(selectedCell.peerDeviation) }}</dd>
              </div>
            </dl>

            <div class="mt-3 rounded-lg border border-pic-border bg-pic-muted-surface p-3">
              <p class="text-[9px] font-black uppercase tracking-wide text-pic-text-muted">Benchmark robusto</p>
              <div class="mt-2 grid grid-cols-2 gap-3 text-xs">
                <div><span class="block text-[9px] font-bold text-pic-text-muted">Mediana</span><strong class="font-mono text-pic-text-main">{{ formatCanvasKg(selectedCell.peerMedian) }}</strong></div>
                <div><span class="block text-[9px] font-bold text-pic-text-muted">MAD</span><strong class="font-mono text-pic-text-main">{{ formatCanvasKg(selectedCell.peerMad) }}</strong></div>
              </div>
            </div>

            <button type="button" class="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-pic-brand-border bg-pic-surface text-xs font-black text-pic-brand transition hover:bg-pic-brand hover:text-white" @click="emit('tab', 'evidence')">
              <i class="fa-solid fa-list-ul"></i>
              Ver {{ selectedCell.sourceRows.length }} filas fuente
            </button>
          </template>
          <div v-else class="grid min-h-64 place-items-center rounded-xl border border-dashed border-pic-border bg-pic-muted-surface p-6 text-center">
            <div>
              <span class="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-pic-surface text-pic-brand shadow-sm"><i class="fa-solid fa-arrow-pointer"></i></span>
              <p class="mt-3 text-sm font-black text-pic-text-main">Selecciona una barra o prioridad</p>
              <p class="mt-1 text-xs font-semibold leading-5 text-pic-text-muted">El tooltip ofrece una lectura rápida; este panel conserva el análisis detallado.</p>
            </div>
          </div>
        </section>

        <section v-else aria-live="polite">
          <template v-if="selectedCell">
            <div class="flex items-end justify-between gap-3">
              <div>
                <p class="text-[9px] font-black uppercase tracking-wide text-pic-brand">Filas fuente</p>
                <h2 class="text-sm font-black text-pic-text-main">{{ selectedTitle }}</h2>
              </div>
              <span class="rounded-md bg-pic-muted-surface px-2 py-1 font-mono text-[9px] font-bold text-pic-text-muted">{{ evidenceRows.length }}</span>
            </div>
            <div class="mt-3 space-y-2">
              <article v-for="row in evidenceRows" :key="row.id" class="rounded-lg border border-pic-border bg-pic-surface p-3 shadow-sm">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-xs font-black text-pic-text-main">{{ row.cadena }}</p>
                    <p class="mt-0.5 truncate text-[10px] font-semibold text-pic-text-muted">{{ row.linea }} · {{ row.familia }}</p>
                  </div>
                  <span class="shrink-0 font-mono text-[10px] font-black" :class="String(row.diferencia).startsWith('-') ? 'text-[hsl(var(--pic-accent-orange))]' : 'text-[hsl(var(--pic-accent-blue))]'">{{ row.diferencia }}</span>
                </div>
                <dl class="mt-2 grid grid-cols-3 gap-1 border-t border-pic-border pt-2 text-[9px]">
                  <div><dt class="font-bold text-pic-text-muted">Brecha</dt><dd class="mt-0.5 font-mono font-black text-pic-text-main">{{ row.brecha }}</dd></div>
                  <div><dt class="font-bold text-pic-text-muted">% pérdida</dt><dd class="mt-0.5 font-mono font-black text-pic-text-main">{{ row.participacion }}</dd></div>
                  <div><dt class="font-bold text-pic-text-muted">Score</dt><dd class="mt-0.5 font-mono font-black text-pic-text-main">{{ row.desviacion }}</dd></div>
                </dl>
              </article>
            </div>
          </template>
          <div v-else class="grid min-h-64 place-items-center rounded-xl border border-dashed border-pic-border bg-pic-muted-surface p-6 text-center">
            <div>
              <span class="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-pic-surface text-pic-brand shadow-sm"><i class="fa-solid fa-list-check"></i></span>
              <p class="mt-3 text-sm font-black text-pic-text-main">Evidencia bajo selección</p>
              <p class="mt-1 text-xs font-semibold leading-5 text-pic-text-muted">Selecciona una combinación para consultar únicamente las filas que la construyen.</p>
            </div>
          </div>
        </section>
      </div>
    </template>

    <nav v-else class="flex h-full flex-col items-center gap-1 py-2" aria-label="Inspector plegado">
      <button type="button" class="mb-2 grid h-8 w-8 place-items-center rounded-md text-pic-brand transition hover:bg-pic-brand-soft" aria-label="Abrir inspector" @click="emit('toggle')">
        <i class="fa-solid fa-angles-left"></i>
      </button>
      <button v-for="tab in tabs" :key="tab.id" type="button" class="relative grid h-9 w-9 place-items-center rounded-md text-pic-text-muted transition hover:bg-pic-muted-surface hover:text-pic-brand" :aria-label="tab.label" @click="emit('tab', tab.id)">
        <i :class="tab.icon"></i>
        <span v-if="tab.id === 'selection' && unreadSelection" class="absolute right-1 top-1 h-2 w-2 rounded-md bg-pic-brand"></span>
      </button>
    </nav>
  </aside>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
</style>
