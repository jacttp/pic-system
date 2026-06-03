<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { useUploadOcStore } from '../stores/uploadOcStore'

import ChainTabs from '../components/ChainTabs.vue'
import OrderFilters from '../components/OrderFilters.vue'
import OrdersTable from '../components/OrdersTable.vue'
import UploadZone from '../components/UploadZone.vue'

const store = useUploadOcStore()
const { toast } = useToast()

onMounted(async () => {
  await store.fetchOrders()
})

const onUploadSuccess = (message: string) => {
  const inserted = store.uploadStats.inserted
  const omitted = store.uploadStats.omitted
  const total = store.uploadStats.totalSent
  const title = inserted > 0
    ? 'Carga procesada'
    : 'Carga sin inserciones'
  const description = total > 0
    ? `${inserted} insertados, ${omitted} omitidos de ${total} registros enviados.`
    : message

  toast({
    title,
    description,
    variant: 'default',
  })
}

const onUploadError = (error: string) => {
  toast({
    title: 'Error de carga',
    description: error,
    variant: 'destructive',
  })
}

const hasUploadResult = computed(() => !!store.uploadStats.message)
const resultIsWarning = computed(() => store.uploadStats.status === 'warning')
const resultIsError = computed(() => store.uploadStats.status === 'error')
const resultTitle = computed(() => {
  if (resultIsError.value) return 'Carga no procesada'
  if (resultIsWarning.value) return 'Carga procesada sin inserciones'
  return 'Carga procesada'
})
const normalizedChain = computed(() => {
  const chain = store.uploadStats.chain
  if (!chain) return 'Cadena no especificada'
  if (chain.toUpperCase() === 'SORIANA') return 'Soriana'
  return chain
})
</script>

<template>
  <div class="flex h-full flex-col gap-4 overflow-hidden bg-[#f8fafc] px-4 pb-5 pt-5 sm:px-6 xl:px-8 xl:pt-7">
    <div class="flex shrink-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="flex min-w-0 flex-col gap-1.5">
        <div class="flex items-center gap-3">
          <h1 class="text-[26px] font-black leading-tight text-slate-950">
            Carga de Órdenes de Compra
          </h1>
          <span class="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[11px] font-bold text-slate-400">
            i
          </span>
        </div>
        <p class="text-sm font-medium text-slate-500">
          Importa archivos Excel de clientes y visualiza el historial normalizado.
        </p>
      </div>

      <ChainTabs class="xl:self-end" />
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
      <div class="flex min-h-0 flex-col gap-3">
        <UploadZone
          @upload-success="onUploadSuccess"
          @upload-error="onUploadError"
        />

        <div
          class="shrink rounded-2xl border bg-white p-4 shadow-[0_14px_35px_rgba(15,23,42,0.04)] 2xl:p-5"
          :class="hasUploadResult
            ? resultIsError
              ? 'border-rose-200'
              : resultIsWarning
                ? 'border-amber-200'
                : 'border-emerald-200'
            : 'border-slate-200/80'"
        >
          <h4 class="mb-3 flex items-center gap-3 text-base font-black text-slate-900">
            <span
              class="flex h-7 w-7 items-center justify-center rounded-lg"
              :class="hasUploadResult
                ? resultIsError
                  ? 'bg-rose-50 text-rose-600'
                  : resultIsWarning
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-emerald-600'
                : 'text-slate-700'"
            >
              <i v-if="hasUploadResult" :class="resultIsError ? 'fa-solid fa-circle-xmark' : resultIsWarning ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check'"></i>
              <i v-else class="fa-solid fa-file-shield text-lg"></i>
            </span>
            {{ hasUploadResult ? resultTitle : 'Reglas de carga' }}
            <span v-if="!hasUploadResult" class="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-400">
              i
            </span>
          </h4>

          <div v-if="hasUploadResult" class="space-y-3">
            <div class="grid grid-cols-3 gap-2">
              <div class="rounded-xl bg-slate-50 p-3">
                <p class="text-[10px] font-black uppercase text-slate-400">Enviados</p>
                <p class="text-lg font-black text-slate-900">{{ store.uploadStats.totalSent }}</p>
              </div>
              <div class="rounded-xl bg-emerald-50 p-3">
                <p class="text-[10px] font-black uppercase text-emerald-600">Insertados</p>
                <p class="text-lg font-black text-emerald-700">{{ store.uploadStats.inserted }}</p>
              </div>
              <div class="rounded-xl bg-amber-50 p-3">
                <p class="text-[10px] font-black uppercase text-amber-600">Omitidos</p>
                <p class="text-lg font-black text-amber-700">{{ store.uploadStats.omitted }}</p>
              </div>
            </div>

            <div class="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-[13px] font-semibold text-slate-700">
              <div class="flex items-center justify-between gap-3">
                <span>{{ normalizedChain }}</span>
                <span>{{ store.uploadStats.files }} archivo(s)</span>
              </div>
              <p class="mt-1 text-slate-500">{{ store.uploadStats.message }}</p>
            </div>

            <ul v-if="store.uploadStats.reasons.length" class="space-y-1.5 text-[13px] font-medium leading-relaxed text-slate-700">
              <li v-for="reason in store.uploadStats.reasons" :key="reason" class="flex gap-2">
                <i class="fa-solid fa-circle-info mt-1 text-[11px] text-slate-400"></i>
                <span>{{ reason }}</span>
              </li>
            </ul>
          </div>

          <ul v-else class="space-y-2 text-[13px] font-medium leading-relaxed text-slate-700">
            <li class="flex gap-3">
              <i class="fa-regular fa-circle-check mt-1 text-xs text-brand-500"></i>
              <span>El procesamiento se realiza en tu navegador para mayor velocidad.</span>
            </li>
            <li class="flex gap-3">
              <i class="fa-regular fa-circle-check mt-1 text-xs text-brand-500"></i>
              <span>Se ignorarán los registros que compartan el mismo Número de Pedido, Cadena y SKU.</span>
            </li>
          </ul>

          
        </div>
      </div>

      <div class="flex min-h-0 flex-col gap-4">
        <OrderFilters />
        <OrdersTable />
      </div>
    </div>
  </div>
</template>
