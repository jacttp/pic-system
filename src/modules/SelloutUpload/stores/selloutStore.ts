import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { selloutApi } from '../services/selloutApi'
import type {
  SelloutChain,
  SelloutCommitData,
  SelloutHistoryEntry,
  SelloutHistoryFilters,
  SelloutPreviewData,
} from '../types/sellout'

const now = new Date()

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) return error.response?.data?.message || error.message || fallback
  return error instanceof Error ? error.message : fallback
}

export const useSelloutStore = defineStore('selloutUpload', () => {
  const year = ref(now.getFullYear())
  const month = ref(now.getMonth() + 1)
  const files = reactive<Record<SelloutChain, File | null>>({ SORIANA: null, WALMART: null })
  const previewData = ref<SelloutPreviewData | null>(null)
  const lastCommit = ref<SelloutCommitData | null>(null)
  const isPreviewing = ref(false)
  const isCommitting = ref(false)
  const error = ref('')

  const historyEntries = ref<SelloutHistoryEntry[]>([])
  const historyTotal = ref(0)
  const isLoadingHistory = ref(false)
  const historyFilters = reactive<SelloutHistoryFilters>({
    page: 1,
    limit: 10,
    chain: '',
    status: '',
  })

  const hasFiles = computed(() => Boolean(files.SORIANA || files.WALMART))
  const canCommit = computed(() => Boolean(previewData.value?.previewToken) && !isCommitting.value)

  const invalidatePreview = () => {
    previewData.value = null
    lastCommit.value = null
    error.value = ''
  }

  const setFile = (chain: SelloutChain, file: File | null) => {
    files[chain] = file
    invalidatePreview()
  }

  const setPeriod = (nextYear: number, nextMonth: number) => {
    year.value = nextYear
    month.value = nextMonth
    invalidatePreview()
  }

  const preview = async () => {
    if (!hasFiles.value) return
    isPreviewing.value = true
    error.value = ''
    try {
      previewData.value = await selloutApi.preview(year.value, month.value, files.SORIANA, files.WALMART)
    } catch (cause) {
      previewData.value = null
      error.value = getErrorMessage(cause, 'No fue posible analizar los archivos.')
      throw cause
    } finally {
      isPreviewing.value = false
    }
  }

  const commit = async () => {
    if (!previewData.value) return
    isCommitting.value = true
    error.value = ''
    try {
      lastCommit.value = await selloutApi.commit(
        year.value,
        month.value,
        files.SORIANA,
        files.WALMART,
        previewData.value.previewToken,
      )
      files.SORIANA = null
      files.WALMART = null
      previewData.value = null
      await fetchHistory()
    } catch (cause) {
      error.value = getErrorMessage(cause, 'No fue posible completar la carga.')
      throw cause
    } finally {
      isCommitting.value = false
    }
  }

  const fetchHistory = async () => {
    isLoadingHistory.value = true
    try {
      const response = await selloutApi.history(historyFilters)
      historyEntries.value = response.entries
      historyTotal.value = response.pagination.total
    } catch (cause) {
      error.value = getErrorMessage(cause, 'No fue posible consultar el historial.')
    } finally {
      isLoadingHistory.value = false
    }
  }

  return {
    year,
    month,
    files,
    previewData,
    lastCommit,
    isPreviewing,
    isCommitting,
    error,
    historyEntries,
    historyTotal,
    historyFilters,
    isLoadingHistory,
    hasFiles,
    canCommit,
    setFile,
    setPeriod,
    preview,
    commit,
    fetchHistory,
  }
})
