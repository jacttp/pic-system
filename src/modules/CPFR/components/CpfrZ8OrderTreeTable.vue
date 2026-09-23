<script setup lang="ts">
import { computed, ref } from 'vue'
import { StdButton } from '@/modules/Shared/components/std'
import type { Z8ManagerOrder, Z8OrderKey, Z8WeeklyOrder } from '../types/cpfrZ8ManagerTypes'
import CpfrZ8SkuLine from './CpfrZ8SkuLine.vue'

const props = defineProps<{ orders: Z8WeeklyOrder[]; details: Record<string, Z8ManagerOrder>; loadingOrderKeys: Record<string, boolean>; selected: Z8OrderKey[]; embedded?: boolean }>()
const emit = defineEmits<{ (e: 'expand', order: Z8WeeklyOrder): void; (e: 'toggle', order: Z8WeeklyOrder): void; (e: 'edit', detail: Z8ManagerOrder): void }>()
const expanded = ref(new Set<string>())
const key = (order: Z8OrderKey) => `${order.id_cliente}|${order.num_pedido}|${order.fec_pedido_cadena}`
const rows = computed(() => props.orders.map(order => {
  const orderKey = key(order)
  return { ...order, orderKey, expanded: expanded.value.has(orderKey), detail: props.details[orderKey] || null, loading: !!props.loadingOrderKeys[orderKey], checked: props.selected.some(item => key(item) === orderKey) }
}))
const summary = computed(() => ({
  orders: props.orders.length,
  skus: props.orders.reduce((sum, order) => sum + order.total_skus, 0),
  requested: props.orders.every(order => order.cantidad_solicitada_pz != null)
    ? props.orders.reduce((sum, order) => sum + Number(order.cantidad_solicitada_pz), 0)
    : null,
  sent: props.orders.every(order => order.cantidad_enviada_pz != null)
    ? props.orders.reduce((sum, order) => sum + Number(order.cantidad_enviada_pz), 0)
    : null,
}))
function toggle(order: Z8WeeklyOrder) {
  const orderKey = key(order), next = new Set(expanded.value)
  if (next.has(orderKey)) next.delete(orderKey)
  else {
    next.add(orderKey)
    if (!props.details[orderKey] && !props.loadingOrderKeys[orderKey]) emit('expand', order)
  }
  expanded.value = next
}
function number(value: number | null | undefined) { return value == null ? '—' : `${value.toLocaleString('es-MX')} pzas` }
function quantity(value: number | null) { return value == null ? '—' : value.toLocaleString('es-MX') }
function label(order: Z8WeeklyOrder) { return order.tipo === 'oc' ? 'OC oficial' : order.tipo === 'z8carnes' ? `Z8 Carnes${order.letra ? ` ${order.letra}` : ''}` : `Z8${order.letra ? ` ${order.letra}` : ''}` }
function badgeClass(order: Z8WeeklyOrder) {
  return order.extraordinario
    ? 'cpfr-z8-extra-badge'
    : 'cpfr-z8-traditional-badge'
}
</script>

<template>
  <section :class="embedded ? 'z8-order-section font-sans' : 'z8-order-section overflow-hidden rounded-xl border border-pic-border bg-pic-surface font-sans'">
    <header class="space-y-2 border-b border-pic-border py-3">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h3 class="text-base font-bold text-pic-text-main">Órdenes de la semana <span class="font-mono text-pic-text-muted">{{ orders.length }}</span></h3>
          <p class="text-xs text-pic-text-muted">Las OC se despliegan de forma independiente para consultar sus SKU.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2 sm:justify-end"><slot name="actions" /></div>
      </div>
      <dl v-if="orders.length" class="grid grid-cols-2 gap-2 rounded-lg border border-pic-border bg-pic-muted-surface p-2 sm:grid-cols-4">
        <div class="flex flex-col items-start gap-1 border-pic-border px-2 py-1 sm:border-r"><dt><span class="inline-flex rounded-md border border-pic-border bg-pic-surface px-1.5 py-0.5 text-[10px] font-semibold text-pic-text-muted">Órdenes</span></dt><dd class="font-mono text-sm font-bold tabular-nums text-pic-text-main">{{ summary.orders }}</dd></div>
        <div class="flex flex-col items-start gap-1 border-pic-border px-2 py-1 sm:border-r"><dt><span class="inline-flex rounded-md border border-pic-border bg-pic-surface px-1.5 py-0.5 text-[10px] font-semibold text-pic-text-muted">SKU en OC</span></dt><dd class="font-mono text-sm font-bold tabular-nums text-pic-text-main">{{ summary.skus }}</dd></div>
        <div class="flex flex-col items-start gap-1 rounded-md bg-pic-brand-soft px-2 py-1"><dt><span class="inline-flex rounded-md border border-pic-brand-border bg-pic-surface px-1.5 py-0.5 text-[10px] font-bold text-pic-brand">Solicitadas</span></dt><dd class="font-mono text-base font-extrabold tabular-nums text-pic-brand">{{ quantity(summary.requested) }} <span class="text-[10px] font-semibold">pzas</span></dd></div>
        <div class="flex flex-col items-start gap-1 px-2 py-1"><dt><span class="inline-flex rounded-md border border-pic-border bg-pic-surface px-1.5 py-0.5 text-[10px] font-semibold text-pic-text-muted">Enviadas</span></dt><dd class="font-mono text-sm font-bold tabular-nums text-pic-text-main">{{ quantity(summary.sent) }} <span class="text-[10px] font-medium">pzas</span></dd></div>
      </dl>
    </header>
    <p v-if="!orders.length" class="p-6 text-sm text-pic-text-muted">Esta tienda no tiene órdenes en la semana actual.</p>
    <div v-else class="z8-order-table-container overflow-x-auto" :class="embedded ? '' : 'rounded-b-xl'">
      <div class="z8-mobile-cards divide-y divide-pic-border">
        <article v-for="order in rows" :key="key(order)" class="p-3" :class="order.tipo === 'oc' && order.eventos_en_fecha.length ? 'bg-pic-brand-soft/50' : ''">
          <div class="flex items-start gap-2">
            <input v-if="order.tipo !== 'oc'" type="checkbox" :checked="order.checked" :aria-label="`Seleccionar ${order.num_pedido} para eliminar`" @change="emit('toggle', order)" />
            <button type="button" class="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-pic-brand" :aria-expanded="order.expanded" @click="toggle(order)">
              <span class="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-pic-text-main">
                <span v-if="order.tipo !== 'oc'" class="inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold leading-none" :class="badgeClass(order)">{{ label(order) }}</span>
                <span v-else>{{ label(order) }}</span>
                <span>· {{ order.estado_resumen === 'mixto' ? 'Estados mixtos' : order.estado_resumen }}</span>
              </span>
              <span class="block break-all font-mono text-xs text-pic-text-muted">{{ order.num_pedido }}</span>
              <span v-if="order.capacidades.bloqueo_eliminacion" class="mt-1 block text-[10px] text-pic-text-muted">{{ order.capacidades.bloqueo_eliminacion }}</span>
              <span class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-pic-text-muted"><span>Creado {{ order.fec_pedido_cadena }}</span><span class="inline-flex flex-wrap items-center gap-1">Fin embarque <span v-for="date in order.fechas_fin_embarque" :key="date" class="cpfr-shipment-date-badge inline-flex rounded-md border px-1.5 py-0.5 font-semibold">{{ date }}</span><span v-if="!order.fechas_fin_embarque.length">—</span></span><span>Envío {{ order.fec_envio || '—' }}</span></span>
              <span class="mt-1 block text-xs font-medium">{{ order.total_skus }} SKU · Solicitadas {{ number(order.cantidad_solicitada_pz) }} · Enviadas {{ number(order.cantidad_enviada_pz) }}</span>
            </button>
          </div>
          <div v-if="order.expanded" class="mt-3 border-t border-pic-border pt-2">
            <p v-if="order.loading" class="text-xs text-pic-text-muted" role="status">Cargando SKU…</p>
            <template v-else-if="order.detail">
              <p v-if="order.detail.fechas_fin_embarque?.length > 1" class="text-xs font-semibold text-pic-warning">Distintas fechas de fin de embarque.</p>
              <div class="mt-2 overflow-hidden rounded-lg border border-pic-border bg-pic-surface" role="table" :aria-label="`SKU de ${order.num_pedido}`">
                <div role="row" class="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-2 border-b border-pic-border bg-pic-muted-surface px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-pic-text-muted sm:grid-cols-[minmax(0,1fr)_6rem_6rem] sm:px-3">
                  <div role="columnheader">SKU / descripción</div><div role="columnheader" class="text-right">Solicitadas</div><div role="columnheader" class="text-right">Enviadas</div>
                </div>
                <div role="rowgroup"><CpfrZ8SkuLine v-for="line in order.detail.lineas" :key="line.sku_muliix" :line="line" /></div>
              </div>
              <div v-if="order.detail.capacidades.puede_editar" class="flex justify-end pt-2"><StdButton size="sm" variant="secondary" icon="fa-solid fa-pen" @click="emit('edit', order.detail)">Editar extraordinario</StdButton></div>
            </template>
            <p v-else class="text-xs text-pic-text-muted">Sin cálculo persistido.</p>
          </div>
        </article>
      </div>
      <table class="z8-desktop-table w-full min-w-[760px] text-left text-xs" aria-label="Órdenes por OC y SKU">
        <thead class="bg-pic-muted-surface text-pic-text-muted"><tr><th class="w-12 px-3 py-2">Sel.</th><th class="px-3 py-2">OC / tipo</th><th class="px-3 py-2">Estado</th><th class="px-3 py-2">Fechas</th><th class="px-3 py-2 text-right">SKU</th><th class="px-3 py-2 text-right">Solicitadas (pzas)</th><th class="px-3 py-2 text-right">Enviadas (pzas)</th></tr></thead>
        <tbody>
          <template v-for="order in rows" :key="key(order)">
            <tr class="border-t border-pic-border" :class="order.tipo === 'oc' && order.eventos_en_fecha.length ? 'bg-pic-brand-soft/50' : ''">
              <td class="px-3 py-3"><input v-if="order.tipo !== 'oc'" type="checkbox" :checked="order.checked" :title="order.capacidades.bloqueo_eliminacion || 'Seleccionar para eliminar'" :aria-label="`Seleccionar ${order.num_pedido} para eliminar`" @change="emit('toggle', order)" /></td>
              <td class="px-3 py-3"><button type="button" class="flex max-w-56 items-start gap-2 text-left focus-visible:outline-2 focus-visible:outline-pic-brand" :aria-expanded="order.expanded" @click="toggle(order)"><i class="fa-solid fa-chevron-right mt-0.5 transition-transform" :class="order.expanded ? 'rotate-90' : ''" /><span><span v-if="order.tipo !== 'oc'" class="inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold leading-none" :class="badgeClass(order)">{{ label(order) }}</span><span v-else class="block font-semibold text-pic-text-main">{{ label(order) }}</span><span class="mt-0.5 block break-all font-mono text-[10px] text-pic-text-muted">{{ order.num_pedido }}</span></span></button></td>
              <td class="px-3 py-3 font-semibold">{{ order.estado_resumen === 'mixto' ? 'Estados mixtos' : order.estado_resumen }}<span v-if="order.tipo !== 'oc' && order.capacidades.bloqueo_eliminacion" class="mt-1 block max-w-40 text-[10px] font-normal text-pic-text-muted">{{ order.capacidades.bloqueo_eliminacion }}</span></td>
              <td class="px-3 py-3 text-pic-text-muted"><span class="block">Creado {{ order.fec_pedido_cadena }}</span><span class="mt-0.5 flex flex-wrap items-center gap-1">Fin embarque <span v-for="date in order.fechas_fin_embarque" :key="date" class="cpfr-shipment-date-badge inline-flex rounded-md border px-1.5 py-0.5 font-semibold">{{ date }}</span><span v-if="!order.fechas_fin_embarque.length">—</span></span><span class="mt-0.5 block">Envío {{ order.fec_envio || '—' }}</span></td>
              <td class="px-3 py-3 text-right font-mono">{{ order.total_skus }}</td><td class="px-3 py-3 text-right font-mono">{{ number(order.cantidad_solicitada_pz) }}</td><td class="px-3 py-3 text-right font-mono">{{ number(order.cantidad_enviada_pz) }}</td>
            </tr>
            <tr v-if="order.expanded" class="border-t border-pic-border bg-pic-muted-surface"><td colspan="7" class="p-3 sm:p-4">
              <p v-if="order.loading" class="text-xs text-pic-text-muted" role="status">Cargando SKU…</p>
              <div v-else-if="order.detail" class="space-y-2">
                <p v-if="order.detail.fechas_fin_embarque?.length > 1" class="text-xs font-semibold text-pic-warning">Las líneas tienen distintas fechas de fin de embarque.</p>
                <p v-if="order.detail.motivo" class="text-xs text-pic-text-muted">Motivo: {{ order.detail.motivo }} {{ order.detail.detalle_motivo || '' }}</p>
                <div class="overflow-hidden rounded-lg border border-pic-border bg-pic-surface" role="table" :aria-label="`SKU de ${order.num_pedido}`">
                  <div role="row" class="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-2 border-b border-pic-border bg-pic-muted-surface px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-pic-text-muted sm:grid-cols-[minmax(0,1fr)_6rem_6rem] sm:px-3">
                    <div role="columnheader">SKU / descripción</div><div role="columnheader" class="text-right">Solicitadas</div><div role="columnheader" class="text-right">Enviadas</div>
                  </div>
                  <div role="rowgroup"><CpfrZ8SkuLine v-for="line in order.detail.lineas" :key="line.sku_muliix" :line="line" /></div>
                </div>
                <div v-if="order.detail.capacidades.puede_editar" class="flex justify-end pt-2"><StdButton size="sm" variant="secondary" icon="fa-solid fa-pen" @click="emit('edit', order.detail)">Editar extraordinario</StdButton></div>
              </div>
              <p v-else class="text-xs text-pic-text-muted">Sin cálculo persistido; consulta las líneas fuente.</p>
            </td></tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>
<style scoped>
/* pic-ui-allow-hardcoded-color: conserva los tonos Z8 de CpfrOrderTable.escenarioCls. */
.cpfr-z8-traditional-badge { border-color: #e9d5ff; background-color: #f3e8ff; color: #7e22ce; }
/* Rosa oscuro identifica funcionalmente los Z8 extraordinarios. */
.cpfr-z8-extra-badge { border-color: #f9a8d4; background-color: #fce7f3; color: #9d174d; }
/* pic-ui-allow-hardcoded-color: iguala el badge amarillo de fin de embarque en CpfrOrderTable. */
.cpfr-shipment-date-badge { border-color: #fde68a; background-color: #fffbeb; color: #b45309; }
.z8-order-table-container { container-type: inline-size; }
.z8-mobile-cards { display: block; }
.z8-desktop-table { display: none; }
@container (min-width: 760px) {
  .z8-mobile-cards { display: none; }
  .z8-desktop-table { display: table; }
}
</style>
