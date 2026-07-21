<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { StdButton, StdDataTable, StdSection } from '@/modules/Shared/components/std'
import { useSelloutStore } from '../stores/selloutStore'
import type { SelloutHistoryStatus } from '../types/sellout'

const store = useSelloutStore()
const { historyEntries, historyFilters, historyTotal, isLoadingHistory } = storeToRefs(store)
const filterYear = ref<number | ''>('')
const filterMonth = ref<number | ''>('')
const monthOptions = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const columns = [
  { key: 'chain', label: 'Cadena' },
  { key: 'period', label: 'Periodo' },
  { key: 'file', label: 'Archivo' },
  { key: 'result', label: 'Resultado', align: 'right' as const },
  { key: 'user', label: 'Usuario' },
  { key: 'status', label: 'Estado', align: 'center' as const },
]

const rows = computed<Array<Record<string, unknown>>>(() => historyEntries.value.map((entry) => ({
  id: entry.UploadId,
  chain: entry.ChainKey,
  period: entry.PeriodStart?.slice(0, 7),
  file: entry.OriginalFileName,
  result: entry.InsertedRowCount ?? entry.PreparedRowCount,
  user: entry.UploadedByName || `Usuario #${entry.UploadedBy ?? '—'}`,
  status: entry.Status,
  startedAt: entry.StartedAt,
  omitted: entry.OmittedRowCount,
  error: entry.ErrorMessage,
})))

const totalPages = computed(() => Math.max(1, Math.ceil(historyTotal.value / historyFilters.value.limit)))
const statusMeta: Record<SelloutHistoryStatus, { label: string; className: string }> = {
  SUCCEEDED: { label: 'Completada', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  FAILED: { label: 'Fallida', className: 'border-red-200 bg-red-50 text-red-700' },
  PROCESSING: { label: 'Procesando', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  INTERRUPTED: { label: 'Interrumpida', className: 'border-amber-200 bg-amber-50 text-amber-700' },
}

const formatDateTime = (value: unknown) => {
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const reloadFromFirstPage = () => {
  if (filterYear.value && filterMonth.value) {
    historyFilters.value.year = Number(filterYear.value)
    historyFilters.value.month = Number(filterMonth.value)
  } else {
    delete historyFilters.value.year
    delete historyFilters.value.month
  }
  historyFilters.value.page = 1
  store.fetchHistory()
}

const changePage = (delta: number) => {
  historyFilters.value.page = Math.min(totalPages.value, Math.max(1, historyFilters.value.page + delta))
  store.fetchHistory()
}
</script>

<template>
  <StdSection
    eyebrow="Trazabilidad"
    title="Historial operativo"
    description="Cada archivo conserva periodo, usuario, conteos y resultado de la transacción."
    icon="fa-solid fa-clock-rotate-left"
  >
    <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[170px_180px_130px_150px_minmax(0,1fr)]">
      <label class="block">
        <span class="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Cadena</span>
        <select v-model="historyFilters.chain" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-pic-brand-border focus:ring-2 focus:ring-pic-brand-border" @change="reloadFromFirstPage">
          <option value="">Todas</option>
          <option value="SORIANA">Soriana</option>
          <option value="WALMART">Walmart</option>
        </select>
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Estado</span>
        <select v-model="historyFilters.status" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-pic-brand-border focus:ring-2 focus:ring-pic-brand-border" @change="reloadFromFirstPage">
          <option value="">Todos</option>
          <option value="SUCCEEDED">Completada</option>
          <option value="FAILED">Fallida</option>
          <option value="PROCESSING">Procesando</option>
          <option value="INTERRUPTED">Interrumpida</option>
        </select>
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Año</span>
        <input v-model.number="filterYear" type="number" min="2000" max="2100" placeholder="Todos" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-pic-brand-border focus:ring-2 focus:ring-pic-brand-border" @change="reloadFromFirstPage">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Mes</span>
        <select v-model="filterMonth" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-pic-brand-border focus:ring-2 focus:ring-pic-brand-border" @change="reloadFromFirstPage">
          <option value="">Todos</option>
          <option v-for="(month, index) in monthOptions" :key="month" :value="index + 1">{{ month }}</option>
        </select>
      </label>
      <div class="flex items-end justify-start lg:justify-end">
        <StdButton variant="secondary" icon="fa-solid fa-rotate" :disabled="isLoadingHistory" @click="store.fetchHistory()">
          Actualizar
        </StdButton>
      </div>
    </div>

    <StdDataTable
      :columns="columns"
      :rows="rows"
      :loading="isLoadingHistory"
      :show-actions="false"
      empty-title="Sin cargas registradas"
      empty-description="El historial aparecerá después de confirmar la primera carga sellout."
    >
      <template #cell-chain="{ value }">
        <span class="inline-flex items-center gap-2 font-black text-slate-900">
          <span class="h-2.5 w-2.5 rounded-sm" :class="value === 'SORIANA' ? 'bg-pic-accent-teal' : 'bg-pic-accent-blue'"></span>
          {{ value === 'SORIANA' ? 'Soriana' : 'Walmart' }}
        </span>
      </template>
      <template #cell-file="{ row, value }">
        <div class="max-w-[260px]">
          <p class="truncate font-black text-slate-800">{{ value }}</p>
          <p class="mt-0.5 text-[10px] font-semibold text-slate-400">{{ formatDateTime(row.startedAt) }}</p>
        </div>
      </template>
      <template #cell-result="{ row, value }">
        <div class="text-right">
          <p class="font-black tabular-nums text-slate-900">{{ Number(value).toLocaleString('es-MX') }}</p>
          <p v-if="Number(row.omitted)" class="text-[10px] font-bold text-amber-600">{{ Number(row.omitted).toLocaleString('es-MX') }} omitidas</p>
        </div>
      </template>
      <template #cell-status="{ row, value }">
        <div class="inline-flex items-center gap-1.5">
          <span class="inline-flex rounded-lg border px-2 py-1 text-[10px] font-black uppercase" :class="statusMeta[value as SelloutHistoryStatus]?.className">
            {{ statusMeta[value as SelloutHistoryStatus]?.label || value }}
          </span>
          <i v-if="row.error" class="fa-solid fa-circle-info text-xs text-red-500" :title="String(row.error)"></i>
        </div>
      </template>
    </StdDataTable>

    <div class="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-xs font-semibold text-slate-500">
        {{ historyTotal.toLocaleString('es-MX') }} operaciones · página {{ historyFilters.page }} de {{ totalPages }}
      </p>
      <div class="flex gap-2">
        <StdButton variant="secondary" size="sm" icon="fa-solid fa-chevron-left" :disabled="historyFilters.page <= 1 || isLoadingHistory" @click="changePage(-1)">Anterior</StdButton>
        <StdButton variant="secondary" size="sm" icon="fa-solid fa-chevron-right" :disabled="historyFilters.page >= totalPages || isLoadingHistory" @click="changePage(1)">Siguiente</StdButton>
      </div>
    </div>
  </StdSection>
</template>
