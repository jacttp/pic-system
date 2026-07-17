<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from '@/components/ui/toast/use-toast';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import StdAlert from '@/modules/Shared/components/std/StdAlert.vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';
import ClassificationFieldsForm from '../components/ClassificationFieldsForm.vue';
import ClassificationHistory from '../components/ClassificationHistory.vue';
import ClassificationQueue from '../components/ClassificationQueue.vue';
import BulkSuggestionProgressPanel from '../components/BulkSuggestionProgressPanel.vue';
import SimilarConceptsPanel from '../components/SimilarConceptsPanel.vue';
import ClassificationUserGuideModal from '../components/ClassificationUserGuideModal.vue';
import { useArticleClassificationStore } from '../stores/articleClassificationStore';
import type { ClassificationValues, QueueStatusFilter } from '../types/articleClassificationTypes';

const store = useArticleClassificationStore();
const authStore = useAuthStore();
const { toast } = useToast();
const {
  queue, summary, catalogs, catalogMetadata, selected, neighbors, suggestion, neighborDimensions, page, total, search, status, totalPages,
  queueLoading, detailLoading, neighborsLoading, neighborsError, suggestionLoading, suggestionError,
  catalogsLoading, catalogsError, bulkProgress, saving, error,
} = storeToRefs(store);

const mobilePane = ref<'queue' | 'detail'>('queue');
const showUserGuide = ref(false);
let claimRenewalTimer: ReturnType<typeof setInterval> | null = null;
const currentUserId = computed(() => authStore.user?.id == null ? null : Number(authStore.user.id));

const metrics = computed(() => [
  { label: 'Sin tomar', value: summary.value.pending, icon: 'fa-regular fa-clock' },
  { label: 'En revisión', value: summary.value.inReview, icon: 'fa-solid fa-hand' },
  { label: 'Pospuestos', value: summary.value.skipped, icon: 'fa-solid fa-forward' },
  { label: 'Aprobados', value: summary.value.approved, icon: 'fa-solid fa-circle-check' },
]);

onMounted(() => {
  void store.initialize();
  claimRenewalTimer = window.setInterval(() => { void store.renewCurrentClaim(); }, 5 * 60 * 1000);
});
onBeforeUnmount(() => {
  if (claimRenewalTimer) window.clearInterval(claimRenewalTimer);
  void store.releaseCurrent(false);
});

const handleSelect = async (conceptId: number) => {
  try {
    await store.openConcept(conceptId);
    mobilePane.value = 'detail';
  } catch {
    toast({ title: 'No se pudo reservar', description: error.value || 'El concepto ya esta en revision.' });
  }
};

const handleBack = async () => {
  await store.releaseCurrent();
  mobilePane.value = 'queue';
};

const handleSave = async (values: ClassificationValues) => {
  try {
    await store.saveReview(values);
    mobilePane.value = 'queue';
    toast({ title: 'Clasificacion guardada', description: 'El concepto salio de la bandeja pendiente.' });
  } catch {
    toast({ title: 'No se guardo la clasificacion', description: error.value || 'Revisa los datos e intenta otra vez.' });
  }
};

const handleSkip = async (reason: string) => {
  try {
    await store.skipCurrent(reason);
    mobilePane.value = 'queue';
    toast({ title: 'Concepto pospuesto', description: 'El motivo quedo registrado en la auditoria.' });
  } catch {
    toast({ title: 'No se pudo posponer', description: error.value || 'Intenta nuevamente.' });
  }
};

const handleRefresh = async () => {
  try {
    await store.refresh();
    toast({ title: 'Bandeja actualizada', description: 'Se consultaron los conceptos detectados por los jobs.' });
  } catch {
    toast({ title: 'No se pudo actualizar', description: error.value || 'Intenta nuevamente.' });
  }
};

const handleSearch = async (value: string) => {
  if (value === search.value) return;
  try { await store.setSearch(value); } catch { /* El alert global muestra el error. */ }
};

const handleStatus = async (value: QueueStatusFilter) => {
  try { await store.setStatus(value); } catch { /* El alert global muestra el error. */ }
};

const handlePage = async (value: number) => {
  try { await store.setPage(value); } catch { /* El alert global muestra el error. */ }
};

const handleNeighborDimensions = async (value: number) => {
  await store.setNeighborDimensions(value);
};

const handleGenerateSuggestion = async () => {
  try {
    await store.generateSuggestion();
    toast({ title: 'Propuesta generada', description: 'Revísala campo por campo antes de guardar.' });
  } catch {
    toast({ title: 'No se generó la propuesta', description: suggestionError.value || 'OpenAI no devolvió una propuesta válida.' });
  }
};

const handleGenerateAllSuggestions = async () => {
  const confirmed = window.confirm(
    'Se generaran propuestas para toda la bandeja que aun no tenga una. Esto consume creditos de OpenAI, pero no aprueba ni inserta registros en ArticulosIC. ¿Continuar?',
  );
  if (!confirmed) return;
  try {
    await store.generateAllSuggestions();
    toast({
      title: 'Generacion masiva terminada',
      description: `${bulkProgress.value.generated} nuevas, ${bulkProgress.value.alreadyPresent} existentes y ${bulkProgress.value.failed} fallidas.`,
    });
  } catch {
    toast({ title: 'No se pudo iniciar el lote', description: error.value || 'Revisa la conexion e intenta nuevamente.' });
  }
};
</script>

<template>
  <main class="min-h-full bg-pic-background px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
    <div class="mx-auto max-w-[1660px] space-y-4">
      <StdPageHeader
        eyebrow="Datos maestros - Bandeja diaria"
        title="Clasificacion de articulos"
        description="Conceptos detectados desde VentasIC por los jobs; al aprobar se crea su registro en ArticulosIC."
        icon="fa-solid fa-tags"
        :meta="`${summary.total} por resolver`"
      >
        <template #actions>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full border border-pic-border bg-pic-surface text-xs text-pic-text-muted shadow-sm transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
            aria-label="Abrir guía de uso"
            title="Guía de uso"
            @click="showUserGuide = true"
          >
            <i class="fa-solid fa-question" aria-hidden="true"></i>
          </button>
          <StdButton
            size="sm"
            :icon="bulkProgress.running ? 'fa-solid fa-gears fa-beat-fade' : 'fa-solid fa-wand-magic-sparkles'"
            :disabled="bulkProgress.running || queueLoading || summary.total === 0"
            @click="handleGenerateAllSuggestions"
          >
            {{ bulkProgress.running ? `${bulkProgress.processed}/${bulkProgress.total}` : 'Generar pendientes' }}
          </StdButton>
          <StdButton
            size="sm"
            :icon="queueLoading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-rotate'"
            :disabled="queueLoading"
            @click="handleRefresh"
          >
            Actualizar bandeja
          </StdButton>
        </template>
      </StdPageHeader>

      <ClassificationUserGuideModal v-model="showUserGuide" />

      <section class="grid grid-cols-2 overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm sm:grid-cols-4" aria-label="Resumen de la bandeja">
        <article v-for="metric in metrics" :key="metric.label" class="flex items-center gap-2 border-b border-r border-pic-border px-3 py-2.5 last:border-r-0 sm:border-b-0">
          <i :class="metric.icon" class="w-4 text-center text-xs text-pic-brand" aria-hidden="true"></i>
          <p class="text-lg font-bold leading-none tabular-nums text-pic-text-main">{{ metric.value }}</p>
          <p class="min-w-0 truncate text-[9px] font-bold uppercase tracking-wide text-pic-text-muted">{{ metric.label }}</p>
        </article>
      </section>

      <StdAlert
        v-if="error"
        tone="danger"
        title="El modulo necesita atencion"
        :description="error"
      />

      <BulkSuggestionProgressPanel :progress="bulkProgress" />

      <section class="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[330px_minmax(0,1fr)_280px]">
        <div :class="mobilePane === 'detail' ? 'hidden lg:block' : 'block'">
          <ClassificationQueue
            :items="queue"
            :loading="queueLoading"
            :selected-id="selected ? Number(selected.ConceptId) : null"
            :current-user-id="currentUserId"
            :search="search"
            :status="status"
            :page="page"
            :total-pages="totalPages"
            :total="total"
            :disabled="bulkProgress.running"
            @select="handleSelect"
            @search="handleSearch"
            @status="handleStatus"
            @page="handlePage"
          />
        </div>

        <div :class="mobilePane === 'queue' ? 'hidden lg:block' : 'block'" class="min-w-0">
          <div v-if="detailLoading" class="flex min-h-[520px] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <div class="text-center">
              <i class="fa-solid fa-circle-notch fa-spin text-2xl text-pic-brand"></i>
              <p class="mt-3 text-xs font-black uppercase tracking-wide text-slate-500">Reservando concepto</p>
            </div>
          </div>

          <ClassificationFieldsForm
            v-else-if="selected"
            :detail="selected"
            :catalogs="catalogs"
            :catalog-metadata="catalogMetadata"
            :catalogs-loading="catalogsLoading"
            :catalogs-error="catalogsError"
            :saving="saving"
            :suggestion="suggestion"
            :suggestion-loading="suggestionLoading"
            :suggestion-error="suggestionError"
            @save="handleSave"
            @skip="handleSkip"
            @back="handleBack"
            @generate-suggestion="handleGenerateSuggestion"
          />

          <div v-else class="workbench-empty flex min-h-[520px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white px-6 text-center shadow-sm lg:h-[calc(100vh-235px)] lg:min-h-[560px]">
            <div class="relative max-w-sm">
              <span class="mx-auto flex h-16 w-16 rotate-3 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl text-pic-brand shadow-xl shadow-slate-300/40">
                <i class="fa-solid fa-tag"></i>
              </span>
              <p class="mt-5 text-base font-black text-slate-900">Selecciona un concepto</p>
              <p class="mt-2 text-xs font-semibold leading-5 text-slate-500">Al abrirlo quedara reservado durante 15 minutos. Ningun campo se guarda hasta que confirmes la revision.</p>
              <div class="mx-auto mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[10px] font-bold text-slate-500 shadow-sm">
                <i class="fa-solid fa-lock text-pic-brand"></i> SKUMuliix nunca se edita
              </div>
            </div>
          </div>

          <details v-if="selected" class="mt-4 rounded-xl border border-pic-border bg-pic-surface 2xl:hidden">
            <summary class="cursor-pointer px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-pic-text-main hover:bg-pic-brand-soft">
              <i class="fa-solid fa-magnifying-glass-chart mr-2 text-pic-brand"></i>Evidencia y actividad
            </summary>
            <div class="space-y-4 border-t border-pic-border p-3">
              <SimilarConceptsPanel :result="neighbors" :dimensions="neighborDimensions" :loading="neighborsLoading" :error="neighborsError" @dimensions="handleNeighborDimensions" @retry="store.fetchNeighbors" />
              <ClassificationHistory :entries="selected.history" />
            </div>
          </details>
        </div>

        <div v-if="selected" class="hidden space-y-4 2xl:block">
          <details open class="rounded-xl border border-pic-border bg-pic-surface">
            <summary class="cursor-pointer px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-pic-text-main hover:bg-pic-brand-soft">Evidencia similar</summary>
            <div class="border-t border-pic-border p-2"><SimilarConceptsPanel :result="neighbors" :dimensions="neighborDimensions" :loading="neighborsLoading" :error="neighborsError" @dimensions="handleNeighborDimensions" @retry="store.fetchNeighbors" /></div>
          </details>
          <details class="rounded-xl border border-pic-border bg-pic-surface">
            <summary class="cursor-pointer px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-pic-text-main hover:bg-pic-brand-soft">Actividad</summary>
            <div class="border-t border-pic-border p-2"><ClassificationHistory :entries="selected.history" /></div>
          </details>
        </div>
        <aside v-else class="hidden rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 2xl:block">
          <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Reglas activas</p>
          <ul class="mt-4 space-y-3 text-[11px] font-semibold leading-4 text-slate-500">
            <li class="flex gap-2"><i class="fa-solid fa-check mt-0.5 text-pic-brand"></i><span>Al aprobar se inserta el registro completo en ArticulosIC.</span></li>
            <li class="flex gap-2"><i class="fa-solid fa-check mt-0.5 text-pic-brand"></i><span>SQL NULL y texto “NULL” significan ausencia.</span></li>
            <li class="flex gap-2"><i class="fa-solid fa-check mt-0.5 text-pic-brand"></i><span>“NO” es un valor valido y se conserva.</span></li>
          </ul>
        </aside>
      </section>
    </div>
  </main>
</template>

<style scoped>
.workbench-empty {
  background-color: rgb(255 255 255);
  background-image:
    radial-gradient(circle at 50% 45%, hsl(var(--pic-brand) / 0.08), transparent 34%),
    linear-gradient(rgb(148 163 184 / 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgb(148 163 184 / 0.07) 1px, transparent 1px);
  background-size: auto, 28px 28px, 28px 28px;
}
</style>
