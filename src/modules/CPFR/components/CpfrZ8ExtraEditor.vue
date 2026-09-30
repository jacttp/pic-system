<script setup lang="ts">
import { computed } from 'vue'
import { StdAlert, StdButton } from '@/modules/Shared/components/std'
import { Z8_REASON_LABELS } from '../types/cpfrZ8ManagerTypes'
import type { Z8CatalogItem, Z8ManagerStore, Z8Tipo } from '../types/cpfrZ8ManagerTypes'

const props = defineProps<{
  storeName: string; kind: Z8Tipo; letter: string | null; editing: boolean
  storeInfo: Pick<Z8ManagerStore, 'id_cliente' | 'Jefatura' | 'dia_cadena' | 'dia_ventas' | 'fecha_atencion'>
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
const dayLabels: Record<number, string> = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo' }
const officialDateLabel = computed(() => {
  const value = props.storeInfo.fecha_atencion
  if (!value) return 'Sin fecha configurada'
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? 'Sin fecha configurada' : date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
})

function formatMetric(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('es-MX', { maximumFractionDigits: 2 })
}

function coverage(item: Z8CatalogItem): number | null {
  const inventory = item.inv_actual_kg
  const sellout = item.promedio_sellout_kg
  if (inventory == null || !Number.isFinite(inventory) || sellout == null || !Number.isFinite(sellout) || sellout <= 0 || item.unidad_inventario <= 0) return null
  const pieces = Math.max(0, Number(props.quantities[item.sku_muliix] || 0))
  return (inventory + pieces * item.unidad_inventario) / sellout
}
</script>

<template>
  <div class="cpfr-extra-editor flex min-h-0 w-full flex-col gap-4 font-sans">
    <header class="cpfr-z8-extra-border flex flex-col justify-between gap-3 border-l-4 bg-pic-surface px-4 py-3 sm:flex-row sm:items-center sm:px-5">
      <div class="min-w-0">
        <p class="text-[10px] font-black uppercase tracking-[0.16em] text-pic-brand">Captura extraordinaria</p>
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
      <section class="z8-catalog flex min-h-[24rem] min-w-0 flex-col overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm lg:min-h-0">
        <header class="flex shrink-0 flex-col gap-3 bg-pic-nav px-4 py-3 text-pic-nav-text sm:flex-row sm:items-center sm:justify-between">
          <div><h4 id="z8-catalog-title" class="text-sm font-bold">Catálogo Z8</h4><p class="mt-0.5 text-xs text-pic-nav-text-muted">{{ visible.length }} de {{ catalog.length }} productos disponibles</p></div>
          <label class="relative block w-full sm:max-w-xs"><span class="sr-only">Buscar SKU</span><i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted" aria-hidden="true" /><input :value="skuSearch" type="search" placeholder="Buscar por nombre o SKU" aria-label="Buscar por nombre o SKU" class="h-10 w-full rounded-lg border border-pic-border bg-pic-surface pl-9 pr-3 text-sm text-pic-text-main outline-none transition focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border" @input="emit('update:skuSearch', ($event.target as HTMLInputElement).value)" /></label>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto" role="table" aria-labelledby="z8-catalog-title">
          <div role="rowgroup" class="z8-column-head sticky top-0 z-10 border-t border-pic-nav-muted bg-pic-nav px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-pic-nav-text-muted">
            <div role="row" class="z8-catalog-columns">
              <span role="columnheader">Producto / SKU</span>
              <span role="columnheader" class="text-right">Inventario <span class="block text-[9px] normal-case tracking-normal">piezas</span></span>
              <span role="columnheader" class="text-right">Sellout prom. <span class="block text-[9px] normal-case tracking-normal">piezas / semana</span></span>
              <span role="columnheader" class="text-right">Cobertura <span class="block text-[9px] normal-case tracking-normal">semanas</span></span>
              <span role="columnheader" class="text-right text-pic-nav-text">Solicitar <span class="block text-[9px] normal-case tracking-normal">piezas</span></span>
            </div>
          </div>
          <div role="rowgroup" class="divide-y divide-pic-border">
          <div v-if="!visible.length" class="grid min-h-48 place-items-center px-5 text-center text-sm text-pic-text-muted">No hay productos que coincidan con la búsqueda.</div>
          <div v-for="item in visible" :key="item.sku_muliix" role="row" class="z8-catalog-row items-center px-4 py-3 transition-colors hover:bg-pic-muted-surface/70 focus-within:bg-pic-brand-soft/40" :class="quantities[item.sku_muliix] > 0 ? 'bg-pic-brand-soft/40' : ''">
            <div role="cell" class="z8-product-cell min-w-0">
              <p class="break-words text-sm font-semibold leading-5 text-pic-text-main">{{ item.sku_nombre }}</p>
              <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-pic-text-muted"><span class="font-mono">{{ item.sku_muliix }}</span><span>Múltiplo de {{ item.pzas_bolsa }} pzas</span></div>
              <p v-if="item.antecedentes.length" class="mt-1 text-[11px] font-semibold text-pic-warning">Ya solicitado en {{ item.antecedentes.map(row => row.num_pedido).join(', ') }}</p>
              <p v-if="invalidQuantities.has(item.sku_muliix)" class="mt-1 text-[11px] font-semibold text-pic-danger">Captura múltiplos de {{ item.pzas_bolsa }} piezas.</p>
            </div>
            <div role="cell" class="z8-metric-cell text-xs" :title="`Inventario disponible: ${formatMetric(item.inv_actual_kg)} kg`">
              <span class="z8-metric-label mb-1 block text-[10px] text-pic-text-muted">Inventario · pz</span>
              <span class="font-mono font-semibold tabular-nums text-pic-text-main">{{ formatMetric(item.inv_actual_pz) }}</span>
            </div>
            <div role="cell" class="z8-metric-cell text-xs" :title="`Sellout promedio semanal: ${formatMetric(item.promedio_sellout_kg)} kg`">
              <span class="z8-metric-label mb-1 block text-[10px] text-pic-text-muted">Sellout · pz/sem</span>
              <span class="font-mono font-semibold tabular-nums text-pic-text-main">{{ formatMetric(item.promedio_sellout_pz) }}</span>
            </div>
            <div role="cell" class="z8-metric-cell text-xs" :title="coverage(item) == null ? 'Sin datos suficientes para calcular la cobertura.' : 'Inventario más las piezas capturadas, dividido entre el sellout promedio semanal.'">
              <span class="z8-metric-label mb-1 block text-[10px] text-pic-text-muted">Cobertura · sem</span>
              <span class="font-mono font-semibold tabular-nums text-pic-text-main">{{ formatMetric(coverage(item)) }}</span>
            </div>
            <div role="cell" class="z8-quantity-cell">
              <label class="block"><span class="z8-metric-label mb-1 block text-[10px] font-bold uppercase tracking-wide text-pic-text-muted">Piezas</span><input :value="quantities[item.sku_muliix] || ''" type="number" min="0" :step="item.pzas_bolsa" :aria-label="`Piezas de ${item.sku_nombre}`" :aria-invalid="invalidQuantities.has(item.sku_muliix)" class="h-10 w-full rounded-lg border border-pic-brand-border bg-pic-surface px-2 text-right font-mono text-sm font-bold tabular-nums text-pic-text-main outline-none transition focus:border-pic-brand focus:ring-2 focus:ring-pic-brand/15 aria-[invalid=true]:border-pic-danger" @input="emit('quantity', item.sku_muliix, Number(($event.target as HTMLInputElement).value || 0))" /></label>
            </div>
          </div>
          </div>
        </div>
      </section>

      <section class="flex min-w-0 flex-col rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5" aria-labelledby="z8-order-data-title">
        <header class="border-b border-pic-border pb-4">
          <h4 id="z8-order-data-title" class="text-sm font-bold text-pic-text-main">Datos del pedido</h4>
          <p class="mt-4 text-[10px] font-semibold uppercase tracking-wide text-pic-text-muted">Tienda destino</p>
          <h5 class="mt-1 break-words text-base font-bold leading-6 text-pic-text-main">{{ storeName }}</h5>
          <dl class="mt-3 space-y-2 text-xs">
            <div class="flex items-baseline justify-between gap-3"><dt class="text-pic-text-muted">ID tienda</dt><dd class="break-all text-right font-mono font-semibold text-pic-text-main">{{ storeInfo.id_cliente }}</dd></div>
            <div class="flex items-baseline justify-between gap-3"><dt class="text-pic-text-muted">Jefatura</dt><dd class="text-right font-medium text-pic-text-main">{{ storeInfo.Jefatura || 'Sin asignar' }}</dd></div>
            <div class="flex items-baseline justify-between gap-3"><dt class="text-pic-text-muted">Día de pedido cadena</dt><dd class="text-right font-medium text-pic-text-main">{{ dayLabels[storeInfo.dia_cadena] || 'Sin configurar' }}</dd></div>
          </dl>
          <div class="mt-4 border-l-2 border-pic-brand bg-pic-brand-soft/50 px-3 py-2.5">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-pic-text-muted">Envío oficial</p>
            <p class="mt-1 text-sm font-bold text-pic-text-main">{{ dayLabels[storeInfo.dia_ventas] || 'Sin día configurado' }}</p>
            <time v-if="storeInfo.fecha_atencion" :datetime="storeInfo.fecha_atencion" class="mt-0.5 block text-xs text-pic-text-muted">{{ officialDateLabel }}</time>
            <p v-else class="mt-0.5 text-xs text-pic-text-muted">{{ officialDateLabel }}</p>
          </div>
        </header>
        <div class="mt-5 space-y-4">
          <label class="block text-xs font-bold text-pic-text-main">Fecha de envío del extraordinario<input :value="shipDate" type="date" :min="today" :max="weekEnd" class="mt-1.5 h-11 w-full rounded-lg border border-pic-border bg-pic-surface px-3 text-sm outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand/15" @input="emit('update:shipDate', ($event.target as HTMLInputElement).value)" /></label>
          <label class="block text-xs font-bold text-pic-text-main">Motivo<select :value="reason" class="mt-1.5 h-11 w-full rounded-lg border border-pic-border bg-pic-surface px-3 text-sm outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand/15" @change="emit('update:reason', ($event.target as HTMLSelectElement).value)"><option value="">Selecciona un motivo</option><option v-for="(label, code) in Z8_REASON_LABELS" :key="code" :value="code">{{ label }}</option></select></label>
          <label v-if="reason === 'otro'" class="block text-xs font-bold text-pic-text-main">Detalle del motivo<textarea :value="reasonDetail" class="mt-1.5 min-h-24 w-full rounded-lg border border-pic-border bg-pic-surface p-3 text-sm font-normal outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand/15" placeholder="Explica el motivo de la excepción" @input="emit('update:reasonDetail', ($event.target as HTMLTextAreaElement).value)" /></label>
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
.z8-catalog { container-type: inline-size; }
.z8-column-head { display: none; }
.z8-catalog-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) 6.5rem; gap: 0.75rem; }
.z8-product-cell { grid-column: 1 / 4; }
.z8-quantity-cell { grid-column: 4; grid-row: 1 / 3; }
@container (min-width: 44rem) {
  .z8-column-head { display: block; }
  .z8-catalog-columns, .z8-catalog-row { display: grid; grid-template-columns: minmax(0, 1fr) 5.5rem 6.5rem 5.5rem 7rem; gap: 1rem; }
  .z8-product-cell, .z8-quantity-cell { grid-column: auto; grid-row: auto; }
  .z8-metric-cell { text-align: right; }
  .z8-metric-label { display: none; }
}
@container (max-width: 24rem) {
  .z8-catalog-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .z8-product-cell { grid-column: 1 / 3; }
  .z8-quantity-cell { grid-column: 3; grid-row: 1; }
}
@media (min-width: 1024px) {
  .cpfr-extra-editor { height: calc(100dvh - 7.5rem); }
}
</style>
