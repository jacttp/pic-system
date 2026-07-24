export type SelloutChain = 'SORIANA' | 'WALMART' | 'CHEDRAUI'
export type SelloutHistoryStatus = 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'INTERRUPTED'

export interface SelloutPreviewStats {
  sourceRows: number
  preparedRows: number
  discardedInvalidDate: number
  defaultedDates: number
  unmappedStoreRows: number
  provisionalStoreRows: number
  historicalRowsToReclassify: number
  existingRows: number
}

export interface SelloutUnmappedStore {
  storeCode: string
  storeName: string
  rowCount: number
}

export interface SelloutProvisionalStore extends SelloutUnmappedStore {
  temporaryCode: string
  ventaUSum: number
  inventarioUSum: number
}

export interface SelloutReclassificationCandidate {
  storeCode: string
  matrix: string
  temporaryCode: string
  rowCount: number
}

export interface SelloutPreviewChain {
  chain: SelloutChain
  targetTable: 'ExportPIC' | 'ExportPIC2' | 'exportpic3'
  file: {
    name: string
    size: number
    sha256: string
  }
  stats: SelloutPreviewStats
  unmappedStores: SelloutUnmappedStore[]
  provisionalStores: SelloutProvisionalStore[]
  reclassificationCandidates: SelloutReclassificationCandidate[]
  dateRange: { min: string | null; max: string | null }
  sample: Array<Record<string, string | number | null>>
}

export interface SelloutPreviewData {
  period: { year: number; month: number }
  previewToken: string
  chains: SelloutPreviewChain[]
}

export interface SelloutCommitChain {
  uploadId: number
  chain: SelloutChain
  deletedRows: number
  insertedRows: number
  provisionalRows: number
  reclassifiedRows: number
}

export interface SelloutCommitData {
  batchId: string
  period: { year: number; month: number }
  chains: SelloutCommitChain[]
}

export interface SelloutHistoryEntry {
  UploadId: number
  BatchId: string
  ChainKey: SelloutChain
  OriginalFileName: string
  FileSizeBytes: number
  FileSha256: string
  PeriodStart: string
  PeriodEnd: string
  SourceRowCount: number
  PreparedRowCount: number
  OmittedRowCount: number
  ProvisionalRowCount: number
  ProvisionalStores: SelloutProvisionalStore[]
  ReclassifiedRowCount: number
  ExistingRowCount: number
  DeletedRowCount: number | null
  InsertedRowCount: number | null
  Status: SelloutHistoryStatus
  ErrorMessage: string | null
  UploadedBy: number | null
  UploadedByName: string | null
  StartedAt: string
  CompletedAt: string | null
}

export interface SelloutHistoryFilters {
  page: number
  limit: number
  chain: '' | SelloutChain
  status: '' | SelloutHistoryStatus
  year?: number
  month?: number
}
