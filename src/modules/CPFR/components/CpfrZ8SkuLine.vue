<script setup lang="ts">
import { computed } from 'vue'
import type { Z8ManagerOrder } from '../types/cpfrZ8ManagerTypes'

type Z8SkuLine = Z8ManagerOrder['lineas'][number]

const props = defineProps<{ line: Z8SkuLine }>()
const adjustment = computed(() => Number(props.line.ajuste || 0) + Number(props.line.ajuste_mix || 0))
const showBase = computed(() => props.line.cantidad_final_uni != null && (Number(props.line.cantidad_final_uni) !== 0 || adjustment.value !== 0))
const adjustmentLabel = computed(() => `${adjustment.value > 0 ? '+' : ''}${adjustment.value.toLocaleString('es-MX')}`)
function quantity(value: number | null | undefined) {
  return value == null ? '—' : value.toLocaleString('es-MX')
}
</script>

<template>
  <div role="row" class="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-2 border-b border-pic-border px-2.5 py-2 text-xs transition-colors last:border-b-0 hover:bg-pic-brand-soft/40 sm:grid-cols-[minmax(0,1fr)_6rem_6rem] sm:px-3">
    <div role="cell" class="min-w-0">
      <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        <h5 class="truncate text-xs font-semibold leading-4 text-pic-text-main">{{ line.sku_nombre || line.sku_muliix }}</h5>
        <span class="inline-flex shrink-0 rounded-md bg-pic-muted-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-pic-text-muted">{{ line.sku_muliix }}</span>
        <span class="inline-flex shrink-0 rounded-md border border-pic-border bg-pic-surface px-1.5 py-0.5 text-[10px] font-medium text-pic-text-muted">{{ line.estado }}</span>
      </div>
      <p v-if="showBase" class="mt-0.5 text-[10px] leading-3 text-pic-text-muted">Base {{ quantity(line.cantidad_final_uni) }}<template v-if="adjustment !== 0"> · Ajuste {{ adjustmentLabel }}</template> pzas</p>
      <p v-else-if="line.cantidad_final_uni == null && line.cantidad_solicitada_pz == null" class="mt-0.5 text-[10px] leading-3 text-pic-text-muted">Sin cálculo persistido</p>
    </div>

    <div role="cell" class="rounded-md bg-pic-brand-soft/70 px-1.5 py-1 text-right font-mono text-sm font-extrabold tabular-nums text-pic-text-main">
      <span class="sr-only">Solicitadas: </span>{{ quantity(line.cantidad_solicitada_pz) }}<span class="ml-0.5 text-[9px] font-medium text-pic-text-muted">pzas</span>
    </div>
    <div role="cell" class="px-1.5 py-1 text-right font-mono text-xs font-semibold tabular-nums text-pic-text-main">
      <span class="sr-only">Enviadas: </span>{{ quantity(line.cantidad_enviada_pz) }}<span class="ml-0.5 text-[9px] font-medium text-pic-text-muted">pzas</span>
    </div>
  </div>
</template>
