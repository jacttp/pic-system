<script setup lang="ts">
import { computed } from 'vue'
import { useUploadMetasStore } from '../stores/uploadMetasStore'
import { Button } from '@/components/ui/button'

const store = useUploadMetasStore()

const totalPages = () => Math.ceil(store.totalRecords / store.pagination.limit) || 1

const handlePageChange = async (newPage: number) => {
  if (newPage < 1 || newPage > totalPages()) return
  store.pagination.page = newPage
  await store.fetchMetas()
}

const formatDate = (dateStr?: string) => {
  if (!dateStr || dateStr.startsWith('1900')) return '—'
  return dateStr.split('T')[0]
}

const formatNum = (val: number) =>
  val != null ? val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
</script>

<template>
  <div class="flex flex-col h-full rounded-xl border bg-white shadow-sm relative overflow-hidden">

    <!-- Loading -->
    <div
      v-if="store.isLoading"
      class="flex flex-col items-center justify-center py-16 text-slate-500 flex-1"
    >
      <i class="fa-solid fa-circle-notch fa-spin text-3xl mb-3 text-teal-500"></i>
      <p class="font-medium text-slate-600">Cargando metas...</p>
    </div>

    <!-- Empty -->
    <div
      v-else-if="store.records.length === 0"
      class="flex flex-col items-center justify-center py-16 text-slate-400 flex-1 border-dashed border-2 border-slate-200 m-4 rounded-lg"
    >
      <i class="fa-solid fa-chart-bar text-4xl mb-3 text-slate-300"></i>
      <p class="text-slate-500 font-medium">No hay registros de metas.</p>
      <p class="text-xs text-slate-400 mt-1">Sube un archivo Excel para comenzar.</p>
    </div>

    <!-- Table -->
    <div v-else class="flex-1 overflow-auto">
      <table class="w-full text-sm text-left text-slate-600">
        <thead class="sticky top-0 z-10 text-xs text-slate-50 bg-slate-800 uppercase font-semibold">
          <tr>
            <th class="px-4 py-3 tracking-wide">Cliente Muliix</th>
            <th class="px-4 py-3 tracking-wide">Clientesima</th>
            <th class="px-4 py-3 tracking-wide">Fecha</th>
            <th class="px-4 py-3 tracking-wide">SKU</th>
            <th class="px-4 py-3 tracking-wide">AAA</th>
            <th class="px-4 py-3 text-right tracking-wide">Fact. Kg</th>
            <th class="px-4 py-3 text-right tracking-wide">Fact. $$</th>
            <th class="px-4 py-3 text-right tracking-wide">Meta Kg</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in store.records"
            :key="idx"
            class="border-b border-slate-100 last:border-0 hover:bg-teal-50/40 transition-colors"
          >
            <td class="px-4 py-2.5 font-medium text-slate-800">{{ row.ClienteMuliix || '—' }}</td>
            <td class="px-4 py-2.5 text-slate-600">{{ row.Clientesima || '—' }}</td>
            <td class="px-4 py-2.5 text-slate-500 font-mono text-xs">{{ formatDate(row.Fecha) }}</td>
            <td class="px-4 py-2.5 text-slate-600 font-mono text-xs">{{ row.Skum || '—' }}</td>
            <td class="px-4 py-2.5 text-slate-500">{{ row.aaa || '—' }}</td>
            <td class="px-4 py-2.5 text-right">
              <span class="inline-block bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 rounded text-xs">
                {{ formatNum(row.Fact_Kg) }}
              </span>
            </td>
            <td class="px-4 py-2.5 text-right">
              <span class="inline-block bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded text-xs">
                ${{ formatNum(row['Fact_$$']) }}
              </span>
            </td>
            <td class="px-4 py-2.5 text-right">
              <span class="inline-block bg-teal-50 text-teal-700 font-bold px-2.5 py-0.5 rounded text-xs">
                {{ formatNum(row.Meta_Kg) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination footer -->
    <div
      v-if="!store.isLoading && store.records.length > 0"
      class="flex items-center justify-between px-6 py-3 border-t bg-slate-50/80"
    >
      <div class="text-sm text-slate-500 font-medium">
        Mostrando
        <span class="text-slate-700 font-semibold">{{ store.records.length }}</span>
        de
        <span class="text-slate-700 font-semibold">{{ store.totalRecords }}</span>
        registros
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="font-medium text-slate-600 border-slate-200 hover:bg-slate-50"
          :disabled="store.pagination.page === 1 || store.isLoading"
          @click="handlePageChange(store.pagination.page - 1)"
        >
          <i class="fa-solid fa-chevron-left mr-1.5 text-xs"></i> Anterior
        </Button>

        <div class="px-4 py-1 text-sm font-semibold text-slate-700 bg-white rounded border border-slate-100">
          {{ store.pagination.page }} / {{ totalPages() }}
        </div>

        <Button
          variant="outline"
          size="sm"
          class="font-medium text-slate-600 border-slate-200 hover:bg-slate-50"
          :disabled="store.pagination.page >= totalPages() || store.isLoading"
          @click="handlePageChange(store.pagination.page + 1)"
        >
          Siguiente <i class="fa-solid fa-chevron-right ml-1.5 text-xs"></i>
        </Button>
      </div>
    </div>

  </div>
</template>
