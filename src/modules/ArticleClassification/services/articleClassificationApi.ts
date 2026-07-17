import api from '@/api/axios';
import type {
  ClassificationCatalogs,
  ClassificationCatalogContract,
  ClassificationCatalogMetadata,
  ClassificationDetail,
  ClassificationQueueResponse,
  ClassificationSummary,
  QueueStatusFilter,
  ReviewPayload,
  ArticleSuggestion,
  SimilarConceptsResult,
  ClassificationQueueItem,
} from '../types/articleClassificationTypes';

const V2 = import.meta.env.VITE_API_V2_PATH;
const BASE = `${V2}/article-classification`;

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface CatalogApiEnvelope extends ApiEnvelope<ClassificationCatalogs> {
  metadata: ClassificationCatalogMetadata;
  generatedAt?: string;
}

const normalizeQueueItem = (item: ClassificationQueueItem): ClassificationQueueItem => ({
  ...item,
  ConceptId: Number(item.ConceptId),
  ClaimedByUserId: item.ClaimedByUserId === null ? null : Number(item.ClaimedByUserId),
});

const normalizeDetail = (detail: ClassificationDetail): ClassificationDetail => ({
  ...detail,
  ConceptId: Number(detail.ConceptId),
  ClaimedByUserId: detail.ClaimedByUserId === null ? null : Number(detail.ClaimedByUserId),
});

export const articleClassificationApi = {
  async getQueue(params: {
    page: number;
    limit: number;
    search: string;
    status: QueueStatusFilter;
  }): Promise<ClassificationQueueResponse> {
    const { data } = await api.get<ApiEnvelope<ClassificationQueueResponse['data']> & Omit<ClassificationQueueResponse, 'data'>>(
      `${BASE}/queue`,
      { params },
    );
    return {
      data: data.data.map(normalizeQueueItem),
      page: Number(data.page),
      limit: Number(data.limit),
      total: Number(data.total),
    };
  },

  async getSummary(): Promise<ClassificationSummary> {
    const { data } = await api.get<ApiEnvelope<ClassificationSummary>>(`${BASE}/queue/summary`);
    return data.data;
  },

  async getCatalogs(): Promise<ClassificationCatalogContract> {
    const { data } = await api.get<CatalogApiEnvelope>(`${BASE}/catalogs`);
    return {
      values: data.data,
      metadata: data.metadata || ({} as ClassificationCatalogMetadata),
      generatedAt: data.generatedAt || null,
    };
  },

  async getDetail(conceptId: number): Promise<ClassificationDetail> {
    const { data } = await api.get<ApiEnvelope<ClassificationDetail>>(`${BASE}/${conceptId}`);
    return normalizeDetail(data.data);
  },

  async getNeighbors(conceptId: number, dimensions: number): Promise<SimilarConceptsResult> {
    const { data } = await api.get<ApiEnvelope<SimilarConceptsResult>>(`${BASE}/${conceptId}/neighbors`, {
      params: { dimensions },
    });
    return data.data;
  },

  async getSuggestion(conceptId: number): Promise<ArticleSuggestion | null> {
    const { data } = await api.get<ApiEnvelope<ArticleSuggestion | null>>(`${BASE}/${conceptId}/suggestion`);
    return data.data;
  },

  async generateSuggestion(conceptId: number, sourceVersion: string, requestKey: string): Promise<ArticleSuggestion> {
    const { data } = await api.post<ApiEnvelope<ArticleSuggestion>>(`${BASE}/${conceptId}/suggestions`, {
      sourceVersion,
      requestKey,
    });
    return data.data;
  },

  async claim(conceptId: number): Promise<void> {
    await api.post(`${BASE}/${conceptId}/claim`);
  },

  async releaseClaim(conceptId: number): Promise<void> {
    await api.delete(`${BASE}/${conceptId}/claim`);
  },

  async review(conceptId: number, payload: ReviewPayload): Promise<void> {
    await api.patch(`${BASE}/${conceptId}/review`, payload);
  },

  async skip(conceptId: number, reason: string): Promise<void> {
    await api.post(`${BASE}/${conceptId}/skip`, { reason });
  },
};
