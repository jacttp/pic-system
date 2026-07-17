import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { articleClassificationApi } from '../services/articleClassificationApi';
import type {
  ClassificationCatalogs,
  ClassificationCatalogMetadata,
  ClassificationDetail,
  ClassificationQueueItem,
  ClassificationSummary,
  ClassificationValues,
  QueueStatusFilter,
  SimilarConceptsResult,
  ArticleSuggestion,
  BulkSuggestionProgress,
  BatchPreview,
  BatchReviewResult,
} from '../types/articleClassificationTypes';

const EMPTY_SUMMARY: ClassificationSummary = {
  pending: 0,
  inReview: 0,
  skipped: 0,
  total: 0,
  approved: 0,
  resolvedExternally: 0,
  lastDetectedAt: null,
};

const EMPTY_CATALOGS: ClassificationCatalogs = {
  SkuReal: [], Marca: [], Grupo: [], Status: [], Nombre: [], Canibalizacion: [],
  EmpaqueA: [], Categorias: [], TipoCom: [], Id_SkuRetail: [], EmpaqueB: [],
  Peso: [], Contol: [], TipoEsqDis: [], GrupoOP: [],
};

const EMPTY_CATALOG_METADATA = {} as ClassificationCatalogMetadata;

const EMPTY_BULK_PROGRESS: BulkSuggestionProgress = {
  running: false,
  total: 0,
  processed: 0,
  generated: 0,
  alreadyPresent: 0,
  failed: 0,
  activeConceptIds: [],
  failures: [],
};

const EMPTY_BATCH_PREVIEW: BatchPreview = {
  pending: 0,
  reservedByOther: 0,
  eligible: 0,
  proposalsAvailable: 0,
  readyToApprove: 0,
  invalidDrafts: 0,
  missingSuggestion: 0,
};

const BULK_CONCURRENCY = 2;

const errorMessage = (error: unknown, fallback: string) => {
  const candidate = error as { response?: { data?: { message?: string } } };
  return candidate.response?.data?.message || fallback;
};

export const useArticleClassificationStore = defineStore('article-classification', () => {
  const queue = ref<ClassificationQueueItem[]>([]);
  const summary = ref<ClassificationSummary>({ ...EMPTY_SUMMARY });
  const catalogs = ref<ClassificationCatalogs>({ ...EMPTY_CATALOGS });
  const catalogMetadata = ref<ClassificationCatalogMetadata>({ ...EMPTY_CATALOG_METADATA });
  const catalogsGeneratedAt = ref<string | null>(null);
  const selected = ref<ClassificationDetail | null>(null);
  const neighbors = ref<SimilarConceptsResult | null>(null);
  const suggestion = ref<ArticleSuggestion | null>(null);
  const neighborDimensions = ref(256);
  const page = ref(1);
  const limit = ref(25);
  const total = ref(0);
  const search = ref('');
  const status = ref<QueueStatusFilter>('ALL');
  const queueLoading = ref(false);
  const detailLoading = ref(false);
  const saving = ref(false);
  const neighborsLoading = ref(false);
  const neighborsError = ref<string | null>(null);
  const suggestionLoading = ref(false);
  const suggestionError = ref<string | null>(null);
  const catalogsLoading = ref(false);
  const catalogsError = ref<string | null>(null);
  const bulkProgress = ref<BulkSuggestionProgress>({ ...EMPTY_BULK_PROGRESS });
  const batchPreview = ref<BatchPreview>({ ...EMPTY_BATCH_PREVIEW });
  const batchPreviewLoading = ref(false);
  const batchRunning = ref(false);
  const batchResult = ref<BatchReviewResult | null>(null);
  const error = ref<string | null>(null);

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));

  async function fetchQueue() {
    queueLoading.value = true;
    error.value = null;
    try {
      const result = await articleClassificationApi.getQueue({
        page: page.value,
        limit: limit.value,
        search: search.value,
        status: status.value,
      });
      queue.value = result.data;
      total.value = result.total;
      page.value = result.page;
    } catch (requestError) {
      error.value = errorMessage(requestError, 'No fue posible cargar la bandeja.');
      throw requestError;
    } finally {
      queueLoading.value = false;
    }
  }

  async function fetchSummary() {
    summary.value = await articleClassificationApi.getSummary();
  }

  async function fetchCatalogs() {
    catalogsLoading.value = true;
    catalogsError.value = null;
    try {
      const contract = await articleClassificationApi.getCatalogs();
      catalogs.value = contract.values;
      catalogMetadata.value = contract.metadata;
      catalogsGeneratedAt.value = contract.generatedAt;
    } catch (requestError) {
      catalogsError.value = errorMessage(
        requestError,
        'No fue posible cargar las opciones historicas. Puedes continuar capturando manualmente.',
      );
    } finally {
      catalogsLoading.value = false;
    }
  }

  async function initialize() {
    error.value = null;
    try {
      await Promise.all([fetchQueue(), fetchSummary(), fetchCatalogs(), fetchBatchPreview()]);
    } catch (requestError) {
      error.value = errorMessage(requestError, 'No fue posible iniciar el modulo.');
    }
  }

  async function fetchBatchPreview() {
    batchPreviewLoading.value = true;
    try {
      batchPreview.value = await articleClassificationApi.getBatchPreview();
    } catch (requestError) {
      error.value = errorMessage(requestError, 'No fue posible cargar el estado del lote.');
      throw requestError;
    } finally {
      batchPreviewLoading.value = false;
    }
  }

  async function openConcept(conceptId: number) {
    if (bulkProgress.value.running) throw new Error('Espera a que termine la generacion masiva.');
    if (selected.value?.ConceptId === conceptId) return;
    detailLoading.value = true;
    error.value = null;
    let claimed = false;
    try {
      if (selected.value) await releaseCurrent();
      await articleClassificationApi.claim(conceptId);
      claimed = true;
      const detail = await articleClassificationApi.getDetail(conceptId);
      selected.value = detail;
      // Preserve the queue order and its scroll position while reflecting the claim locally.
      // A server reload sorts claimed items first, which makes the selected row jump to the top.
      queue.value = queue.value.map((item) =>
        item.ConceptId === conceptId
          ? { ...item, WorkflowStatus: detail.WorkflowStatus, ClaimedByUserId: detail.ClaimedByUserId, ClaimedByUsername: detail.ClaimedByUsername }
          : item,
      );
      void fetchNeighbors();
      void fetchSuggestion();
      await fetchSummary();
    } catch (requestError) {
      if (claimed && !selected.value) {
        try { await articleClassificationApi.releaseClaim(conceptId); } catch { /* Expirara de forma segura. */ }
      }
      error.value = errorMessage(requestError, 'No fue posible abrir el concepto.');
      throw requestError;
    } finally {
      detailLoading.value = false;
    }
  }

  async function renewCurrentClaim() {
    if (!selected.value || saving.value) return;
    try {
      await articleClassificationApi.claim(selected.value.ConceptId);
    } catch (requestError) {
      error.value = errorMessage(requestError, 'La reserva no pudo renovarse; guarda o recarga el concepto.');
    }
  }

  async function releaseCurrent(refresh = true) {
    const conceptId = selected.value?.ConceptId;
    selected.value = null;
    neighbors.value = null;
    neighborsError.value = null;
    neighborsLoading.value = false;
    suggestion.value = null;
    suggestionError.value = null;
    suggestionLoading.value = false;
    if (!conceptId) return;
    try {
      await articleClassificationApi.releaseClaim(conceptId);
      if (refresh) await Promise.all([fetchQueue(), fetchSummary()]);
    } catch (requestError) {
      if (refresh) error.value = errorMessage(requestError, 'No fue posible liberar la reserva.');
    }
  }

  async function saveReview(values: ClassificationValues) {
    if (!selected.value) return;
    saving.value = true;
    error.value = null;
    try {
      await articleClassificationApi.review(selected.value.ConceptId, {
        sourceVersion: selected.value.SourceVersion,
        values,
        suggestionId: suggestion.value?.suggestionId || null,
      });
      selected.value = null;
      neighbors.value = null;
      suggestion.value = null;
      await Promise.all([fetchQueue(), fetchSummary(), fetchBatchPreview()]);
    } catch (requestError) {
      error.value = errorMessage(requestError, 'No fue posible guardar la clasificacion.');
      throw requestError;
    } finally {
      saving.value = false;
    }
  }

  async function skipCurrent(reason: string) {
    if (!selected.value) return;
    saving.value = true;
    error.value = null;
    try {
      await articleClassificationApi.skip(selected.value.ConceptId, reason);
      selected.value = null;
      neighbors.value = null;
      suggestion.value = null;
      await Promise.all([fetchQueue(), fetchSummary(), fetchBatchPreview()]);
    } catch (requestError) {
      error.value = errorMessage(requestError, 'No fue posible posponer el concepto.');
      throw requestError;
    } finally {
      saving.value = false;
    }
  }

  async function refresh() {
    error.value = null;
    try {
      await Promise.all([fetchQueue(), fetchSummary(), fetchBatchPreview()]);
    } catch (requestError) {
      error.value = errorMessage(requestError, 'No fue posible actualizar la bandeja.');
      throw requestError;
    }
  }

  async function saveDraft(values: ClassificationValues) {
    if (!selected.value || saving.value) return;
    saving.value = true;
    error.value = null;
    try {
      await articleClassificationApi.saveDraft(selected.value.ConceptId, {
        sourceVersion: selected.value.SourceVersion,
        values,
        suggestionId: suggestion.value?.suggestionId || null,
        draftRevision: selected.value.draft?.revision || 0,
      });
      selected.value = await articleClassificationApi.getDetail(selected.value.ConceptId);
      await fetchBatchPreview();
    } catch (requestError) {
      error.value = errorMessage(requestError, 'No fue posible guardar el borrador.');
      throw requestError;
    } finally {
      saving.value = false;
    }
  }

  async function applyBatchSuggestions() {
    if (batchRunning.value) return;
    batchRunning.value = true;
    error.value = null;
    try {
      const result = await articleClassificationApi.applyBatchSuggestions();
      batchPreview.value = result.preview;
      if (selected.value) selected.value = await articleClassificationApi.getDetail(selected.value.ConceptId);
      return result.applied;
    } catch (requestError) {
      error.value = errorMessage(requestError, 'No fue posible aplicar las propuestas al lote.');
      throw requestError;
    } finally {
      batchRunning.value = false;
    }
  }

  async function reviewBatch() {
    if (batchRunning.value) return null;
    batchRunning.value = true;
    batchResult.value = null;
    error.value = null;
    try {
      const result = await articleClassificationApi.reviewBatch();
      batchResult.value = result;
      if (selected.value) {
        selected.value = null;
        neighbors.value = null;
        suggestion.value = null;
      }
      await Promise.all([fetchQueue(), fetchSummary(), fetchBatchPreview()]);
      return result;
    } catch (requestError) {
      error.value = errorMessage(requestError, 'No fue posible aprobar el lote.');
      throw requestError;
    } finally {
      batchRunning.value = false;
    }
  }

  async function fetchNeighbors() {
    if (!selected.value) return;
    const conceptId = selected.value.ConceptId;
    const dimensions = neighborDimensions.value;
    neighborsLoading.value = true;
    neighborsError.value = null;
    try {
      const result = await articleClassificationApi.getNeighbors(conceptId, dimensions);
      if (selected.value?.ConceptId === conceptId && neighborDimensions.value === dimensions) {
        neighbors.value = result;
      }
    } catch (requestError) {
      if (selected.value?.ConceptId === conceptId && neighborDimensions.value === dimensions) {
        neighbors.value = null;
        neighborsError.value = errorMessage(requestError, 'No fue posible recuperar antecedentes similares.');
      }
    } finally {
      if (selected.value?.ConceptId === conceptId && neighborDimensions.value === dimensions) {
        neighborsLoading.value = false;
      }
    }
  }

  async function setNeighborDimensions(value: number) {
    neighborDimensions.value = value;
    await fetchNeighbors();
  }

  async function fetchSuggestion() {
    if (!selected.value) return;
    const conceptId = selected.value.ConceptId;
    suggestionLoading.value = true;
    suggestionError.value = null;
    try {
      const result = await articleClassificationApi.getSuggestion(conceptId);
      if (selected.value?.ConceptId === conceptId) suggestion.value = result;
    } catch (requestError) {
      if (selected.value?.ConceptId === conceptId) {
        suggestion.value = null;
        suggestionError.value = errorMessage(requestError, 'No fue posible cargar la sugerencia.');
      }
    } finally {
      if (selected.value?.ConceptId === conceptId) suggestionLoading.value = false;
    }
  }

  async function generateSuggestion() {
    if (!selected.value || suggestionLoading.value || bulkProgress.value.running) return;
    const conceptId = selected.value.ConceptId;
    suggestionLoading.value = true;
    suggestionError.value = null;
    try {
      const result = await articleClassificationApi.generateSuggestion(
        conceptId,
        selected.value.SourceVersion,
        crypto.randomUUID(),
      );
      if (selected.value?.ConceptId === conceptId) suggestion.value = result;
    } catch (requestError) {
      if (selected.value?.ConceptId === conceptId) {
        suggestionError.value = errorMessage(requestError, 'OpenAI no pudo generar una sugerencia valida.');
      }
      throw requestError;
    } finally {
      if (selected.value?.ConceptId === conceptId) suggestionLoading.value = false;
    }
  }

  async function loadAllQueueItems() {
    const items: ClassificationQueueItem[] = [];
    let nextPage = 1;
    let expectedTotal = 0;
    do {
      const result = await articleClassificationApi.getQueue({
        page: nextPage,
        limit: 100,
        search: '',
        status: 'ALL',
      });
      items.push(...result.data);
      expectedTotal = result.total;
      nextPage += 1;
    } while (items.length < expectedTotal);
    return items;
  }

  async function generateAllSuggestions() {
    if (bulkProgress.value.running) return;
    const items = await loadAllQueueItems();
    bulkProgress.value = {
      ...EMPTY_BULK_PROGRESS,
      running: true,
      total: items.length,
      failures: [],
      activeConceptIds: [],
    };

    let cursor = 0;
    const processItem = async (item: ClassificationQueueItem) => {
      const conceptId = item.ConceptId;
      const isCurrent = selected.value?.ConceptId === conceptId;
      let claimedForBatch = false;
      bulkProgress.value.activeConceptIds = [...bulkProgress.value.activeConceptIds, conceptId];
      try {
        const existing = await articleClassificationApi.getSuggestion(conceptId);
        if (existing) {
          bulkProgress.value.alreadyPresent += 1;
          if (isCurrent) suggestion.value = existing;
          return;
        }

        if (!isCurrent) {
          await articleClassificationApi.claim(conceptId);
          claimedForBatch = true;
        }
        const generated = await articleClassificationApi.generateSuggestion(
          conceptId,
          item.SourceVersion,
          crypto.randomUUID(),
        );
        bulkProgress.value.generated += 1;
        if (selected.value?.ConceptId === conceptId) suggestion.value = generated;
      } catch (requestError) {
        bulkProgress.value.failed += 1;
        bulkProgress.value.failures.push({
          conceptId,
          SKUMuliix: item.SKUMuliix,
          message: errorMessage(requestError, 'No fue posible generar la propuesta.'),
        });
      } finally {
        if (claimedForBatch) {
          try { await articleClassificationApi.releaseClaim(conceptId); } catch { /* La reserva expira de forma segura. */ }
        }
        bulkProgress.value.activeConceptIds = bulkProgress.value.activeConceptIds.filter(id => id !== conceptId);
        bulkProgress.value.processed += 1;
      }
    };

    const worker = async () => {
      while (cursor < items.length) {
        const item = items[cursor];
        cursor += 1;
        await processItem(item);
      }
    };

    try {
      await Promise.all(Array.from({ length: Math.min(BULK_CONCURRENCY, items.length) }, () => worker()));
    } finally {
      bulkProgress.value.running = false;
      bulkProgress.value.activeConceptIds = [];
      try {
        await Promise.all([fetchQueue(), fetchSummary(), fetchBatchPreview()]);
      } catch (requestError) {
        error.value = errorMessage(requestError, 'Las propuestas terminaron, pero no se pudo actualizar la bandeja.');
      }
    }
  }

  async function setSearch(value: string) {
    search.value = value;
    page.value = 1;
    await fetchQueue();
  }

  async function setStatus(value: QueueStatusFilter) {
    status.value = value;
    page.value = 1;
    await fetchQueue();
  }

  async function setPage(value: number) {
    page.value = Math.min(Math.max(1, value), totalPages.value);
    await fetchQueue();
  }

  return {
    queue, summary, catalogs, catalogMetadata, catalogsGeneratedAt, selected, neighbors, suggestion, neighborDimensions, page, limit, total, search, status,
    queueLoading, detailLoading, neighborsLoading, neighborsError, suggestionLoading, suggestionError,
    catalogsLoading, catalogsError,
    bulkProgress, batchPreview, batchPreviewLoading, batchRunning, batchResult, saving, error, totalPages,
    initialize, fetchQueue, fetchSummary, openConcept, releaseCurrent, renewCurrentClaim,
    saveReview, saveDraft, skipCurrent, refresh, fetchBatchPreview, applyBatchSuggestions, reviewBatch, fetchNeighbors, setNeighborDimensions, fetchSuggestion,
    generateSuggestion, generateAllSuggestions, setSearch, setStatus, setPage,
  };
});
