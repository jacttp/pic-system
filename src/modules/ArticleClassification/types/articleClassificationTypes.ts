export type WorkflowStatus = 'PENDING' | 'IN_REVIEW' | 'SKIPPED' | 'APPROVED' | 'RESOLVED_EXTERNALLY';
export type QueueStatusFilter = 'ALL' | 'PENDING' | 'IN_REVIEW' | 'SKIPPED';

export type ClassificationField =
  | 'SkuReal'
  | 'Marca'
  | 'Grupo'
  | 'Status'
  | 'Nombre'
  | 'Canibalizacion'
  | 'EmpaqueA'
  | 'Categorias'
  | 'TipoCom'
  | 'Id_SkuRetail'
  | 'EmpaqueB'
  | 'Peso'
  | 'Contol'
  | 'TipoEsqDis'
  | 'GrupoOP';

export type ClassificationValue = string | number | null;
export type ClassificationValues = Record<ClassificationField, ClassificationValue>;
export type ClassificationCatalogs = Record<ClassificationField, Array<string | number>>;

export interface ClassificationFieldMetadata {
  valueType: 'text' | 'number';
  required: boolean;
  nullable: boolean;
  allowCustom: boolean;
  maxLength: number | null;
  optionCount: number;
  searchable: boolean;
}

export type ClassificationCatalogMetadata = Record<ClassificationField, ClassificationFieldMetadata>;

export interface ClassificationCatalogContract {
  values: ClassificationCatalogs;
  metadata: ClassificationCatalogMetadata;
  generatedAt: string | null;
}

export interface ClassificationQueueItem {
  ConceptId: number;
  SKUMuliix: string;
  WorkflowStatus: WorkflowStatus;
  DetectedAt: string;
  ClaimedByUserId: number | null;
  ClaimedByUsername: string | null;
  ClaimExpiresAt: string | null;
  SkipReason: string | null;
  SourceVersion: string;
}

export interface ClassificationAuditEntry {
  AuditId: number;
  Action: 'APPROVED' | 'SKIPPED' | 'REOPENED' | 'RESOLVED_EXTERNALLY';
  ActorUserId: number;
  ActorUsername: string;
  Before: Record<string, unknown> | null;
  After: Record<string, unknown> | null;
  SourceVersionBefore: string | null;
  SourceVersionAfter: string | null;
  CorrelationId: string;
  CreatedAt: string;
}

export interface ClassificationDetail extends ClassificationQueueItem, ClassificationValues {
  ClaimedAt: string | null;
  history: ClassificationAuditEntry[];
}

export interface ClassificationSummary {
  pending: number;
  inReview: number;
  skipped: number;
  total: number;
  approved: number;
  resolvedExternally: number;
  lastDetectedAt: string | null;
}

export interface ClassificationQueueResponse {
  data: ClassificationQueueItem[];
  page: number;
  limit: number;
  total: number;
}

export interface BulkSuggestionFailure {
  conceptId: number;
  SKUMuliix: string;
  message: string;
}

export interface BulkSuggestionProgress {
  running: boolean;
  total: number;
  processed: number;
  generated: number;
  alreadyPresent: number;
  failed: number;
  activeConceptIds: number[];
  failures: BulkSuggestionFailure[];
}

export interface ReviewPayload {
  sourceVersion: string;
  values: ClassificationValues;
  suggestionId: number | null;
}

export type SuggestionDecision = 'INFERRED' | 'COPIED_FROM_REFERENCE' | 'NOT_APPLICABLE' | 'UNKNOWN';
export type ConceptType = 'PRODUCT' | 'CHARGE' | 'RETURN' | 'SERVICE' | 'EQUIPMENT' | 'REBILLING' | 'OTHER';

export interface SuggestedField {
  value: ClassificationValue;
  decision: SuggestionDecision;
  evidenceReferenceIds: number[];
  modelConfidence: number;
  note: string;
}

export interface ArticleSuggestion {
  suggestionId: number;
  conceptId: number;
  requestKey: string;
  classifierModel: string;
  promptVersion: string;
  schemaVersion: string;
  embeddingModel: string;
  dimensions: number;
  indexVersion: string;
  result: {
    conceptType: ConceptType;
    requiresHumanAttention: boolean;
    warnings: string[];
    fields: Record<ClassificationField, SuggestedField>;
  };
  values: ClassificationValues;
  evidence: Record<ClassificationField, Omit<SuggestedField, 'value' | 'modelConfidence'>>;
  confidence: Record<ClassificationField, number>;
  neighbors: SimilarConcept[];
  openAIRequestId: string | null;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  latencyMs: number;
  requestedByUserId: number;
  requestedByUsername: string;
  createdAt: string;
}

export interface EmbeddingDimensionStatus {
  dimensions: number;
  references: number;
  pending: number;
}

export interface SimilarConcept {
  rank: number;
  SKUMuliix: string;
  values: ClassificationValues;
  score: number;
  vectorScore: number;
  lexicalScore: number;
}

export interface SimilarConceptsResult {
  status: 'READY' | 'NOT_EMBEDDED';
  model: string;
  dimensions: number;
  availableDimensions: EmbeddingDimensionStatus[];
  indexVersion: string;
  indexRebuiltAt: string;
  referenceCount?: number;
  neighbors: SimilarConcept[];
}
