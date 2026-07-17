<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from '@/components/ui/toast/use-toast';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import StdAlert from '@/modules/Shared/components/std/StdAlert.vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
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
  catalogsLoading, catalogsError, bulkProgress, batchPreview, batchPreviewLoading, batchRunning, batchResult, saving, error,
} = storeToRefs(store);

const mobilePane = ref<'queue' | 'detail'>('queue');
const showUserGuide = ref(false);
const showBatchApproval = ref(false);
const deleteSuggestionMode = ref<'one' | 'all' | null>(null);
let claimRenewalTimer: ReturnType<typeof setInterval> | null = null;
const currentUserId = computed(() => authStore.user?.id == null ? null : Number(authStore.user.id));
const showDeleteSuggestionConfirmation = computed({
  get: () => deleteSuggestionMode.value !== null,
  set: (visible: boolean) => { if (!visible) deleteSuggestionMode.value = null; },
});
const deleteSuggestionRunning = computed(() => (
  deleteSuggestionMode.value === 'all' ? batchRunning.value : suggestionLoading.value
));
const batchHeadline = computed(() => {
  if (batchPreviewLoading.value) return 'Actualizando estado';
  if (batchPreview.value.readyToApprove > 0) return `${batchPreview.value.readyToApprove} listos para aprobar`;
  if (batchPreview.value.proposalsAvailable > 0) return `${batchPreview.value.proposalsAvailable} propuestas por revisar`;
  if (batchPreview.value.missingSuggestion > 0) return `${batchPreview.value.missingSuggestion} conceptos sin propuesta`;
  if (batchPreview.value.invalidDrafts > 0) return `${batchPreview.value.invalidDrafts} borradores requieren atención`;
  return 'Sin acciones pendientes';
});
const batchDetail = computed(() => {
  const parts: string[] = [];
  if (batchPreview.value.proposalsAvailable > 0) parts.push(`${batchPreview.value.proposalsAvailable} con propuesta`);
  if (batchPreview.value.missingSuggestion > 0) parts.push(`${batchPreview.value.missingSuggestion} sin propuesta`);
  if (batchPreview.value.invalidDrafts > 0) parts.push(`${batchPreview.value.invalidDrafts} por corregir`);
  if (batchPreview.value.reservedByOther > 0) parts.push(`${batchPreview.value.reservedByOther} reservados`);
  return parts.join(' · ') || 'La bandeja no requiere acciones masivas.';
});

const batchSkippedCount = computed(() => (
  batchPreview.value.reservedByOther
  + batchPreview.value.invalidDrafts
  + batchPreview.value.missingSuggestion
  + batchPreview.value.proposalsAvailable
));

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

const handleSaveDraft = async (values: ClassificationValues) => {
  try {
    await store.saveDraft(values);
    toast({ title: 'Borrador guardado', description: 'Aún no se creó ningún artículo en ArticulosIC.' });
  } catch {
    toast({ title: 'No se guardó el borrador', description: error.value || 'Recarga el concepto e intenta nuevamente.' });
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

const handleDeleteSuggestion = () => { deleteSuggestionMode.value = 'one'; };

const confirmDeleteSuggestions = async () => {
  const mode = deleteSuggestionMode.value;
  if (!mode) return;
  try {
    if (mode === 'one') {
      await store.deleteSuggestion();
      toast({ title: 'Propuesta borrada', description: 'El concepto queda disponible para captura manual o para generar otra propuesta.' });
    } else {
      const result = await store.deleteAllUnusedSuggestions();
      if (result) {
        toast({
          title: 'Propuestas borradas',
          description: `${result.deleted} propuestas eliminadas en ${result.affectedConcepts} conceptos.`,
        });
      }
    }
    deleteSuggestionMode.value = null;
  } catch {
    toast({
      title: mode === 'one' ? 'No se pudo borrar la propuesta' : 'No se pudieron borrar las propuestas',
      description: (mode === 'one' ? suggestionError.value : error.value) || 'Recarga e intenta nuevamente.',
    });
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

const handleApplyBatch = async () => {
  try {
    const applied = await store.applyBatchSuggestions();
    toast({
      title: 'Propuestas preparadas',
      description: applied ? `${applied} borradores listos para revisión y aprobación.` : 'No había propuestas nuevas por aplicar.',
    });
  } catch {
    toast({ title: 'No se aplicaron las propuestas', description: error.value || 'Intenta nuevamente.' });
  }
};

const handleDeleteAllSuggestions = () => { deleteSuggestionMode.value = 'all'; };

const handleReviewBatch = async () => {
  try {
    const result = await store.reviewBatch();
    showBatchApproval.value = false;
    if (!result) return;
    toast({
      title: 'Lote procesado',
      description: `${result.saved.length} guardados, ${result.failed.length + result.conflicted.length} pendientes y ${result.resolvedExternally.length} resueltos externamente.`,
    });
  } catch {
    toast({ title: 'No se pudo aprobar el lote', description: error.value || 'Los conceptos pendientes no se modificaron.' });
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
          <StdButton
            size="icon"
            variant="ghost"
            icon="fa-solid fa-question"
            aria-label="Abrir guía de uso"
            title="Guía de uso"
            @click="showUserGuide = true"
          />
          <StdButton
            size="icon"
            variant="ghost"
            :icon="queueLoading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-rotate'"
            :disabled="queueLoading"
            aria-label="Actualizar datos"
            title="Vuelve a consultar la lista, el total por resolver y el estado del lote; no genera ni aplica propuestas."
            @click="handleRefresh"
          />
        </template>
      </StdPageHeader>

      <ClassificationUserGuideModal v-model="showUserGuide" />

      <section class="relative overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm" aria-label="Acciones para toda la bandeja">
        <span class="absolute inset-y-0 left-0 w-1 bg-pic-brand" aria-hidden="true"></span>
        <div class="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-pic-brand">Revisión por lote</p>
            <p class="mt-1 text-sm font-black text-pic-text-main">{{ batchHeadline }}</p>
            <p class="mt-1 text-xs font-semibold leading-5 text-pic-text-muted">{{ batchDetail }}</p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <StdButton
              v-if="bulkProgress.running || (!batchPreviewLoading && batchPreview.missingSuggestion > 0)"
              size="sm"
              :variant="batchPreview.proposalsAvailable === 0 && batchPreview.readyToApprove === 0 ? 'primary' : 'secondary'"
              :icon="bulkProgress.running ? 'fa-solid fa-gears fa-beat-fade' : 'fa-solid fa-wand-magic-sparkles'"
              :disabled="bulkProgress.running || batchRunning || queueLoading"
              @click="handleGenerateAllSuggestions"
            >
              {{ bulkProgress.running ? `${bulkProgress.processed}/${bulkProgress.total}` : 'Generar propuestas' }}
            </StdButton>
            <StdButton
              v-if="!batchPreviewLoading && batchPreview.proposalsAvailable > 0"
              size="sm"
              :variant="batchPreview.readyToApprove === 0 ? 'primary' : 'secondary'"
              icon="fa-solid fa-arrow-down"
              :disabled="batchRunning"
              @click="handleApplyBatch"
            >
              Aplicar
            </StdButton>
            <StdButton
              v-if="!batchPreviewLoading && batchPreview.readyToApprove > 0"
              size="sm"
              variant="primary"
              :icon="batchRunning ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check-double'"
              :disabled="batchRunning"
              @click="showBatchApproval = true"
            >
              Aprobar lote
            </StdButton>
            <StdButton
              v-if="!batchPreviewLoading && batchPreview.proposalsAvailable > 0"
              size="icon"
              variant="ghost"
              class="self-end sm:ml-1 sm:self-auto"
              icon="fa-regular fa-trash-can"
              :disabled="batchRunning"
              aria-label="Borrar todas las propuestas sin aplicar"
              title="Borrar todas las propuestas sin aplicar"
              @click="handleDeleteAllSuggestions"
            />
          </div>
        </div>
        <div v-if="batchResult" class="border-t border-pic-brand-border bg-pic-brand-soft/40 px-4 py-2.5 text-xs font-semibold text-pic-text-main">
          Último lote: {{ batchResult.saved.length }} guardados, {{ batchResult.failed.length }} fallidos, {{ batchResult.conflicted.length }} en conflicto y {{ batchResult.resolvedExternally.length }} resueltos externamente.
        </div>
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
            @save-draft="handleSaveDraft"
            @skip="handleSkip"
            @back="handleBack"
            @generate-suggestion="handleGenerateSuggestion"
            @delete-suggestion="handleDeleteSuggestion"
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

      <ModalDialog v-model="showBatchApproval" title="Aprobar lote" size="lg">
        <div class="space-y-4">
          <div class="rounded-lg border border-pic-brand-border bg-pic-brand-soft p-4">
            <p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-brand">Confirmación de lote</p>
            <p class="mt-2 text-sm font-bold leading-5 text-pic-text-main">
              Se crearán {{ batchPreview.readyToApprove }} filas en ArticulosIC, una por cada borrador válido.
            </p>
          </div>
          <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div class="rounded-lg border border-pic-border p-3 text-center"><dt class="text-[9px] font-bold uppercase text-pic-text-muted">Listos</dt><dd class="mt-1 text-lg font-black text-pic-brand">{{ batchPreview.readyToApprove }}</dd></div>
            <div class="rounded-lg border border-pic-border p-3 text-center"><dt class="text-[9px] font-bold uppercase text-pic-text-muted">Sin propuesta</dt><dd class="mt-1 text-lg font-black text-pic-text-main">{{ batchPreview.missingSuggestion }}</dd></div>
            <div class="rounded-lg border border-pic-border p-3 text-center"><dt class="text-[9px] font-bold uppercase text-pic-text-muted">Inválidos</dt><dd class="mt-1 text-lg font-black text-pic-warning">{{ batchPreview.invalidDrafts }}</dd></div>
            <div class="rounded-lg border border-pic-border p-3 text-center"><dt class="text-[9px] font-bold uppercase text-pic-text-muted">Omitidos</dt><dd class="mt-1 text-lg font-black text-pic-text-main">{{ batchSkippedCount }}</dd></div>
          </dl>
          <p class="text-xs font-semibold leading-5 text-pic-text-muted">
            Cada concepto se valida y guarda por separado. Un conflicto o fallo queda pendiente para revisión manual y no revierte los registros ya creados.
          </p>
        </div>
        <template #footer>
          <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <StdButton :disabled="batchRunning" @click="showBatchApproval = false">Cancelar</StdButton>
            <StdButton variant="primary" icon="fa-solid fa-check-double" :disabled="batchRunning" @click="handleReviewBatch">Crear artículos</StdButton>
          </div>
        </template>
      </ModalDialog>

      <ModalDialog
        v-model="showDeleteSuggestionConfirmation"
        :title="deleteSuggestionMode === 'all' ? 'Borrar todas las propuestas' : 'Borrar propuesta'"
        size="lg"
      >
        <div class="space-y-4">
          <div class="rounded-lg border border-[hsl(var(--pic-danger)/0.24)] bg-[hsl(var(--pic-danger)/0.06)] p-4">
            <p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-danger">Propuestas sin aplicar</p>
            <p class="mt-2 text-sm font-bold leading-5 text-pic-text-main">
              <template v-if="deleteSuggestionMode === 'all'">
                Se borrarán las propuestas de {{ batchPreview.proposalsAvailable }} conceptos elegibles sin borrador.
              </template>
              <template v-else>
                Se borrará únicamente la propuesta visible de este concepto.
              </template>
            </p>
          </div>
          <p class="text-xs font-semibold leading-5 text-pic-text-muted">
            No se modificará ArticulosIC. Las propuestas ya aplicadas, los borradores y las reservas de otra persona se conservarán.
          </p>
        </div>
        <template #footer>
          <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <StdButton :disabled="deleteSuggestionRunning" @click="showDeleteSuggestionConfirmation = false">Cancelar</StdButton>
            <StdButton
              variant="danger"
              :icon="deleteSuggestionRunning ? 'fa-solid fa-circle-notch fa-spin' : 'fa-regular fa-trash-can'"
              :disabled="deleteSuggestionRunning"
              @click="confirmDeleteSuggestions"
            >
              {{ deleteSuggestionMode === 'all' ? 'Borrar todas' : 'Borrar propuesta' }}
            </StdButton>
          </div>
        </template>
      </ModalDialog>
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
