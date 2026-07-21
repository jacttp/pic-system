<script setup lang="ts">
import { computed, ref } from 'vue'
import { StdAlert, StdButton, StdSection } from '@/modules/Shared/components/std'
import type { SelloutPreviewChain, SelloutPreviewData } from '../types/sellout'

interface Props {
  preview: SelloutPreviewData
  committing?: boolean
}

const props = withDefaults(defineProps<Props>(), { committing: false })
const emit = defineEmits<{ (event: 'confirm'): void }>()
const showConfirmation = ref(false)

const totals = computed(() => props.preview.chains.reduce((summary, chain) => ({
  prepared: summary.prepared + chain.stats.preparedRows,
  existing: summary.existing + chain.stats.existingRows,
  omitted: summary.omitted + chain.stats.discardedInvalidDate,
}), { prepared: 0, existing: 0, omitted: 0 }))

const chainName = (chain: SelloutPreviewChain) => chain.chain === 'SORIANA' ? 'Soriana' : 'Walmart'
const sampleColumns = (chain: SelloutPreviewChain) => Object.keys(chain.sample[0] || {})
const formatNumber = (value: number) => value.toLocaleString('es-MX')

const confirm = () => {
  showConfirmation.value = false
  emit('confirm')
}
</script>

<template>
  <StdSection
    eyebrow="Paso 2"
    title="Manifiesto de reemplazo"
    description="Revisa el periodo, el rango reportado y el impacto antes de sustituir los datos existentes."
    icon="fa-solid fa-clipboard-check"
  >
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-xl bg-slate-900 p-3 text-white">
        <p class="text-[10px] font-black uppercase text-slate-400">Periodo destino</p>
        <p class="mt-1 text-lg font-black tabular-nums">{{ String(preview.period.month).padStart(2, '0') }}/{{ preview.period.year }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p class="text-[10px] font-black uppercase text-slate-400">Preparados</p>
        <p class="mt-1 text-lg font-black tabular-nums text-slate-900">{{ formatNumber(totals.prepared) }}</p>
      </div>
      <div class="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p class="text-[10px] font-black uppercase text-amber-600">Se reemplazan</p>
        <p class="mt-1 text-lg font-black tabular-nums text-amber-800">{{ formatNumber(totals.existing) }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-3">
        <p class="text-[10px] font-black uppercase text-slate-400">Archivos</p>
        <p class="mt-1 text-lg font-black tabular-nums text-slate-900">{{ preview.chains.length }}</p>
      </div>
    </div>

    <div class="mt-4 space-y-4">
      <article v-for="chain in preview.chains" :key="chain.chain" class="overflow-hidden rounded-xl border border-slate-200">
        <header class="flex flex-col gap-3 bg-slate-800 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-black">{{ chain.chain === 'SORIANA' ? 'SO' : 'WM' }}</span>
            <div class="min-w-0">
              <h3 class="text-sm font-black">{{ chainName(chain) }} · {{ chain.targetTable }}</h3>
              <p class="truncate text-[11px] font-semibold text-slate-400">{{ chain.file.name }}</p>
            </div>
          </div>
          <p class="text-xs font-black tabular-nums text-slate-200">
            {{ chain.dateRange.min }} → {{ chain.dateRange.max }}
          </p>
        </header>

        <div class="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4">
          <div class="bg-white px-4 py-3">
            <p class="text-[10px] font-black uppercase text-slate-400">Leídas</p>
            <p class="mt-1 text-sm font-black text-slate-900">{{ formatNumber(chain.stats.sourceRows) }}</p>
          </div>
          <div class="bg-white px-4 py-3">
            <p class="text-[10px] font-black uppercase text-slate-400">Preparadas</p>
            <p class="mt-1 text-sm font-black text-pic-success">{{ formatNumber(chain.stats.preparedRows) }}</p>
          </div>
          <div class="bg-white px-4 py-3">
            <p class="text-[10px] font-black uppercase text-slate-400">Fechas completadas</p>
            <p class="mt-1 text-sm font-black text-slate-900">{{ formatNumber(chain.stats.defaultedDates) }}</p>
          </div>
          <div class="bg-white px-4 py-3">
            <p class="text-[10px] font-black uppercase text-slate-400">Fechas omitidas</p>
            <p class="mt-1 text-sm font-black" :class="chain.stats.discardedInvalidDate ? 'text-pic-warning' : 'text-slate-900'">
              {{ formatNumber(chain.stats.discardedInvalidDate) }}
            </p>
          </div>
        </div>

        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[680px] text-left text-xs">
            <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
              <tr><th v-for="column in sampleColumns(chain)" :key="column" class="px-4 py-2.5">{{ column }}</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(row, index) in chain.sample" :key="index" class="hover:bg-slate-50">
                <td v-for="column in sampleColumns(chain)" :key="column" class="px-4 py-2.5 font-semibold text-slate-700">{{ row[column] ?? 'NULL' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="space-y-2 p-3 md:hidden">
          <article v-for="(row, index) in chain.sample.slice(0, 3)" :key="index" class="rounded-lg bg-slate-50 p-3">
            <div v-for="column in sampleColumns(chain)" :key="column" class="flex items-start justify-between gap-3 border-b border-slate-200 py-1.5 last:border-0">
              <span class="text-[10px] font-black uppercase text-slate-400">{{ column }}</span>
              <span class="text-right text-xs font-black text-slate-800">{{ row[column] ?? 'NULL' }}</span>
            </div>
          </article>
        </div>
      </article>
    </div>

    <StdAlert
      v-if="totals.omitted"
      class="mt-4"
      tone="warning"
      title="Se encontraron fechas inválidas en Soriana"
      :description="`${formatNumber(totals.omitted)} filas serán omitidas, conforme a la transformación vigente.`"
    />

    <div class="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p class="max-w-2xl text-xs font-semibold leading-5 text-slate-500">
        La confirmación elimina el periodo indicado y carga el conjunto preparado dentro de una sola transacción.
      </p>
      <StdButton variant="primary" icon="fa-solid fa-shield-check" :disabled="committing" @click="showConfirmation = true">
        {{ committing ? 'Aplicando reemplazo...' : 'Confirmar reemplazo' }}
      </StdButton>
    </div>
  </StdSection>

  <Teleport to="body">
    <div v-if="showConfirmation" class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" @click.self="showConfirmation = false">
      <div class="w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div class="flex items-start gap-4">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><i class="fa-solid fa-arrows-rotate"></i></span>
          <div>
            <p class="text-[10px] font-black uppercase text-amber-600">Confirmación requerida</p>
            <h3 class="mt-1 text-lg font-black text-slate-950">Reemplazar sellout del periodo</h3>
            <p class="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Se eliminarán {{ formatNumber(totals.existing) }} registros existentes y se cargarán {{ formatNumber(totals.prepared) }} registros preparados.
            </p>
          </div>
        </div>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <StdButton variant="secondary" @click="showConfirmation = false">Cancelar</StdButton>
          <StdButton variant="primary" icon="fa-solid fa-check" @click="confirm">Sí, reemplazar periodo</StdButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
