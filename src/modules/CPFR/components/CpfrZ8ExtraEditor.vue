<script setup lang="ts">
import { computed } from 'vue'
import { StdAlert, StdButton } from '@/modules/Shared/components/std'
import { Z8_REASON_LABELS } from '../types/cpfrZ8ManagerTypes'
import type { Z8CatalogItem, Z8Tipo } from '../types/cpfrZ8ManagerTypes'

const props = defineProps<{
  storeName: string; kind: Z8Tipo; letter: string | null; editing: boolean
  pastOfficialDay: boolean; today: string; weekEnd: string
  catalog: Z8CatalogItem[]; quantities: Record<string, number>
  reason: string; reasonDetail: string; shipDate: string; skuSearch: string
  totalSkus: number; totalPieces: number; valid: boolean; saving: boolean
}>()
const emit = defineEmits<{
  (e: 'quantity', sku: string, value: number): void
  (e: 'update:reason', value: string): void
  (e: 'update:reasonDetail', value: string): void
  (e: 'update:shipDate', value: string): void
  (e: 'update:skuSearch', value: string): void
  (e: 'save'): void
}>()
const visible = computed(() => props.catalog.filter(item => `${item.sku_muliix} ${item.sku_nombre}`.toLowerCase().includes(props.skuSearch.toLowerCase())))
const invalidQuantities = computed(() => new Set(visible.value.filter(item => {
  const quantity = Number(props.quantities[item.sku_muliix] || 0)
  return quantity > 0 && (!Number.isInteger(quantity) || !item.pzas_bolsa || quantity % item.pzas_bolsa !== 0)
}).map(item => item.sku_muliix)))
</script>

<template>
  <div class="cpfr-extra-editor flex min-h-0 w-full flex-col gap-4 font-sans">
    <header class="cpfr-z8-extra-border flex flex-col justify-between gap-3 border-l-4 bg-pic-surface px-4 py-3 sm:flex-row sm:items-center sm:px-5">
      <div class="min-w-0">
        <p class="text-[10px] font-black uppercase tracking-[0.16em] text-pic-brand">Captura extraordinaria · {{ storeName }}</p>
        <h3 class="mt-0.5 text-xl font-extrabold tracking-tight text-pic-text-main">{{ editing ? 'Editar' : 'Crear' }} Z8{{ kind === 'z8carnes' ? ' Carnes' : '' }} {{ editing ? '' : letter }}</h3>
        <p class="mt-0.5 text-xs text-pic-text-muted">Selecciona productos y captura cantidades en piezas.</p>
      </div>
      <div class="flex shrink-0 items-center gap-3 rounded-xl bg-pic-muted-surface px-4 py-2.5" aria-live="polite">
        <div class="text-center"><p class="font-mono text-xl font-black leading-5 text-pic-text-main">{{ totalSkus }}</p><p class="mt-1 text-[10px] font-bold uppercase tracking-wide text-pic-text-muted">SKU</p></div>
        <span class="h-8 border-l border-pic-border" aria-hidden="true" />
        <div class="text-center"><p class="font-mono text-xl font-black leading-5 text-pic-brand">{{ totalPieces.toLocaleString('es-MX') }}</p><p class="mt-1 text-[10px] font-bold uppercase tracking-wide text-pic-text-muted">Piezas</p></div>
      </div>
    </header>

    <StdAlert v-if="pastOfficialDay" tone="warning" title="El día oficial ya pasó" description="Después de crear, este pedido no podrá editarse desde el gestor." />

    <div class="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,23rem)]">
      <section class="flex min-h-[24rem] min-w-0 flex-col overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm lg:min-h-0">
        <header class="flex shrink-0 flex-col gap-2 border-b border-pic-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h4 class="text-sm font-extrabold text-pic-text-main">Catálogo Z8</h4><p class="mt-0.5 text-xs text-pic-text-muted">{{ visible.length }} de {{ catalog.length }} productos disponibles</p></div>
          <label class="relative block w-full sm:max-w-sm"><span class="sr-only">Buscar SKU</span><i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted" aria-hidden="true" /><input :value="skuSearch" type="search" placeholder="Buscar por nombre o SKU" aria-label="Buscar por nombre o SKU" class="h-10 w-full rounded-lg border border-pic-border bg-pic-background pl-9 pr-3 text-sm outline-none transition focus:border-pic-brand focus:ring-2 focus:ring-pic-brand/15" @input="emit('update:skuSearch', ($event.target as HTMLInputElement).value)" /></label>
        </header>
        <div class="min-h-0 flex-1 divide-y divide-pic-border overflow-y-auto">
          <div v-if="!visible.length" class="grid min-h-48 place-items-center px-5 text-center text-sm text-pic-text-muted">No hay productos que coincidan con la búsqueda.</div>
          <div v-for="item in visible" :key="item.sku_muliix" class="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-pic-muted-surface/70 sm:grid-cols-[minmax(0,1fr)_9rem] sm:px-5">
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-pic-text-main" :title="item.sku_nombre">{{ item.sku_nombre }}</p>
              <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-pic-text-muted"><span class="font-mono">{{ item.sku_muliix }}</span><span class="rounded-md bg-pic-muted-surface px-1.5 py-0.5 font-semibold">Múltiplo {{ item.pzas_bolsa }} pzas</span></div>
              <p v-if="item.antecedentes.length" class="mt-1 text-[11px] font-semibold text-pic-warning">Ya solicitado en {{ item.antecedentes.map(row => row.num_pedido).join(', ') }}</p>
              <p v-if="invalidQuantities.has(item.sku_muliix)" class="mt-1 text-[11px] font-semibold text-pic-danger">Captura múltiplos de {{ item.pzas_bolsa }} piezas.</p>
            </div>
            <label class="block"><span class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-pic-text-muted">Piezas</span><input :value="quantities[item.sku_muliix] || ''" type="number" min="0" :step="item.pzas_bolsa" :aria-label="`Piezas de ${item.sku_nombre}`" :aria-invalid="invalidQuantities.has(item.sku_muliix)" class="h-10 w-full rounded-lg border border-pic-border bg-white px-2 text-right font-mono text-sm font-bold text-pic-text-main outline-none transition focus:border-pic-brand focus:ring-2 focus:ring-pic-brand/15 aria-[invalid=true]:border-pic-danger" @input="emit('quantity', item.sku_muliix, Number(($event.target as HTMLInputElement).value || 0))" /></label>
          </div>
        </div>
      </section>

      <section class="flex min-w-0 flex-col rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
        <div><h4 class="text-sm font-extrabold text-pic-text-main">Datos del pedido</h4><p class="mt-1 text-xs text-pic-text-muted">Completa el envío y registra el motivo excepcional.</p></div>
        <div class="mt-5 space-y-4">
          <label class="block text-xs font-bold text-pic-text-main">Fecha de envío<input :value="shipDate" type="date" :min="today" :max="weekEnd" class="mt-1.5 h-11 w-full rounded-lg border border-pic-border bg-white px-3 text-sm outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand/15" @input="emit('update:shipDate', ($event.target as HTMLInputElement).value)" /></label>
          <label class="block text-xs font-bold text-pic-text-main">Motivo<select :value="reason" class="mt-1.5 h-11 w-full rounded-lg border border-pic-border bg-white px-3 text-sm outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand/15" @change="emit('update:reason', ($event.target as HTMLSelectElement).value)"><option value="">Selecciona un motivo</option><option v-for="(label, code) in Z8_REASON_LABELS" :key="code" :value="code">{{ label }}</option></select></label>
          <label v-if="reason === 'otro'" class="block text-xs font-bold text-pic-text-main">Detalle del motivo<textarea :value="reasonDetail" class="mt-1.5 min-h-24 w-full rounded-lg border border-pic-border bg-white p-3 text-sm font-normal outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand/15" placeholder="Explica el motivo de la excepción" @input="emit('update:reasonDetail', ($event.target as HTMLTextAreaElement).value)" /></label>
        </div>
        <div class="mt-auto pt-6">
          <div class="mb-3 flex items-center justify-between border-t border-pic-border pt-3 text-xs"><span class="font-semibold text-pic-text-muted">Total solicitado</span><span class="font-mono text-base font-black text-pic-text-main">{{ totalPieces.toLocaleString('es-MX') }} pzas</span></div>
          <StdButton class="w-full" size="md" variant="primary" icon="fa-solid fa-floppy-disk" :disabled="!valid || saving" @click="emit('save')">{{ saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar pedido' }}</StdButton>
          <p class="mt-2 text-center text-[11px] text-pic-text-muted">{{ !totalSkus ? 'Captura al menos un SKU para continuar.' : !valid ? 'Revisa fecha, motivo y múltiplos antes de guardar.' : 'Revisa las cantidades antes de confirmar.' }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Identificador funcional solicitado para los extraordinarios B–G. */
.cpfr-z8-extra-border { border-color: #9d174d; }
.cpfr-extra-editor { min-height: calc(100dvh - 7.5rem); }
@media (min-width: 1024px) {
  .cpfr-extra-editor { height: calc(100dvh - 7.5rem); }
}
</style>
