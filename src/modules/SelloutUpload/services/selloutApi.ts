import api from '@/api/axios'
import type {
  SelloutCommitData,
  SelloutHistoryEntry,
  SelloutHistoryFilters,
  SelloutPreviewData,
} from '../types/sellout'

const BASE_PATH = `${import.meta.env.VITE_API_V2_PATH}/upload-sellout`

interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

const createForm = (year: number, month: number, sorianaFile: File | null, walmartFile: File | null) => {
  const form = new FormData()
  form.append('year', String(year))
  form.append('month', String(month))
  if (sorianaFile) form.append('sorianaFile', sorianaFile)
  if (walmartFile) form.append('walmartFile', walmartFile)
  return form
}

export const selloutApi = {
  async preview(year: number, month: number, sorianaFile: File | null, walmartFile: File | null) {
    const form = createForm(year, month, sorianaFile, walmartFile)
    const { data } = await api.post<ApiResponse<SelloutPreviewData>>(`${BASE_PATH}/preview`, form)
    return data.data
  },

  async commit(
    year: number,
    month: number,
    sorianaFile: File | null,
    walmartFile: File | null,
    previewToken: string,
  ) {
    const form = createForm(year, month, sorianaFile, walmartFile)
    form.append('previewToken', previewToken)
    const { data } = await api.post<ApiResponse<SelloutCommitData>>(`${BASE_PATH}/commit`, form)
    return data.data
  },

  async history(filters: SelloutHistoryFilters) {
    const params = new URLSearchParams({
      page: String(filters.page),
      limit: String(filters.limit),
    })
    if (filters.chain) params.set('chain', filters.chain)
    if (filters.status) params.set('status', filters.status)
    if (filters.year && filters.month) {
      params.set('year', String(filters.year))
      params.set('month', String(filters.month))
    }
    const { data } = await api.get<ApiResponse<SelloutHistoryEntry[]> & {
      pagination: { page: number; limit: number; total: number }
    }>(`${BASE_PATH}/history?${params.toString()}`)
    return { entries: data.data, pagination: data.pagination }
  },
}
