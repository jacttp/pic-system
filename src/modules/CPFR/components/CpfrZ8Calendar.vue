<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Z8ManagerCalendar } from '../types/cpfrZ8ManagerTypes'

const props = defineProps<{ data: Z8ManagerCalendar; selected: string; storeId?: string | null; storeName?: string | null }>()
const emit = defineEmits<{ (e: 'select', day: string): void }>()
const month = ref(props.data.context.today.slice(0, 7))
const months = computed(() => [...new Set([props.data.context.weekStart.slice(0, 7), props.data.context.weekEnd.slice(0, 7)])])
const monthIndex = computed(() => months.value.indexOf(month.value))
const title = computed(() => new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month.value}-01T12:00:00Z`)))
const scopedEvents = computed(() => props.data.eventos.filter(event => !props.storeId || String(event.id_cliente) === String(props.storeId)))
const cells = computed(() => {
  const first = new Date(`${month.value}-01T12:00:00Z`)
  const offset = (first.getUTCDay() || 7) - 1
  const start = new Date(first); start.setUTCDate(1 - offset)
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  const count = Math.ceil((offset + last) / 7) * 7
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start); date.setUTCDate(start.getUTCDate() + index)
    const key = date.toISOString().slice(0, 10)
    const events = scopedEvents.value.filter(item => item.fecha === key)
    const summary = props.storeId ? null : props.data.dias.find(item => item.fecha === key)
    const orderIdentity = (event: typeof events[number]) => event.pedido ? `${event.pedido.id_cliente}|${event.pedido.num_pedido}|${event.pedido.fec_pedido_cadena}` : ''
    const stores = new Set(events.map(item => String(item.id_cliente)))
    const created = new Set(events.filter(item => item.tipo === 'pedido_creado').map(orderIdentity).filter(Boolean))
    const shipments = new Set(events.filter(item => item.tipo === 'fin_embarque').map(item => `${orderIdentity(item)}|${item.fecha}`).filter(value => !value.startsWith('|')))
    const attention = new Set(events.filter(item => item.tipo === 'atencion_oficial').map(item => String(item.id_cliente)))
    return { key, day: date.getUTCDate(), sameMonth: key.startsWith(month.value), inWeek: key >= props.data.context.weekStart && key <= props.data.context.weekEnd, events, stores: summary?.tiendas_relacionadas ?? stores.size, created: summary?.pedidos_creados ?? created.size, shipment: summary?.pedidos_fin_embarque ?? shipments.size, attention: summary?.tiendas_atencion_oficial ?? attention.size }
  })
})
function changeMonth(direction: -1 | 1) {
  const next = months.value[monthIndex.value + direction]
  if (next) month.value = next
}
</script>

<template>
  <section class="rounded-xl border border-pic-border bg-pic-surface p-3 font-sans sm:p-4" aria-label="Calendario semanal Z8">
    <header class="mb-4 flex items-center justify-between gap-2">
      <div class="min-w-0"><h3 class="text-sm font-bold capitalize text-pic-text-main">{{ title }}</h3><p v-if="storeId" class="mt-0.5 truncate text-[10px] font-medium text-pic-brand" :title="storeName || storeId">{{ storeName || storeId }} · eventos de esta tienda</p><p v-else class="mt-0.5 text-[10px] font-medium text-pic-text-muted">Eventos de todas las tiendas</p></div>
      <div class="flex items-center gap-1">
        <button type="button" class="mr-1 rounded-lg border border-pic-border px-2.5 py-1.5 text-xs font-bold text-pic-text-main hover:bg-pic-brand-soft focus-visible:outline-2 focus-visible:outline-pic-brand" @click="month = data.context.today.slice(0, 7); emit('select', data.context.today)">Hoy</button>
        <template v-if="months.length > 1">
          <button type="button" :disabled="monthIndex <= 0" class="grid h-8 w-8 place-items-center rounded-lg text-pic-text-muted hover:bg-pic-brand-soft focus-visible:outline-2 focus-visible:outline-pic-brand disabled:opacity-30" aria-label="Mes anterior de la semana" @click="changeMonth(-1)"><i class="fa-solid fa-chevron-left" /></button>
          <button type="button" :disabled="monthIndex >= months.length - 1" class="grid h-8 w-8 place-items-center rounded-lg text-pic-text-muted hover:bg-pic-brand-soft focus-visible:outline-2 focus-visible:outline-pic-brand disabled:opacity-30" aria-label="Mes siguiente de la semana" @click="changeMonth(1)"><i class="fa-solid fa-chevron-right" /></button>
        </template>
      </div>
    </header>
    <div class="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-pic-text-muted sm:text-xs"><span v-for="day in ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']" :key="day" class="py-1">{{ day }}</span></div>
    <div class="mt-1 grid grid-cols-7 gap-1">
      <button v-for="cell in cells" :key="cell.key" type="button" :disabled="!cell.inWeek" :aria-label="`${cell.key}: ${cell.stores} tiendas; ${cell.created} pedidos creados; ${cell.shipment} fines de embarque; ${cell.attention} atenciones oficiales${!cell.inWeek ? '; fuera de la semana gestionada' : ''}`" :title="`${cell.key} · ${cell.stores} tiendas · ${cell.created} pedidos creados · ${cell.shipment} fines de embarque · ${cell.attention} atenciones oficiales${!cell.inWeek ? ' · Fuera de la semana gestionada' : ''}`" :aria-current="cell.key === data.context.today ? 'date' : undefined" class="relative flex min-h-[4.25rem] flex-col items-stretch justify-start rounded-lg border px-1.5 py-1.5 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pic-brand sm:min-h-[4.5rem]" :class="[cell.key === selected ? 'border-pic-brand bg-pic-brand font-bold text-white' : cell.inWeek ? 'border-transparent bg-pic-brand-soft text-pic-text-main hover:border-pic-brand' : 'border-transparent text-pic-text-muted', cell.key === data.context.today ? 'ring-2 ring-pic-brand ring-offset-1' : '', !cell.sameMonth ? 'opacity-50' : '']" @click="emit('select', cell.key)">
        <span class="flex items-center justify-between font-mono font-semibold"><span>{{ cell.day }}</span><i v-if="cell.key === data.context.today" class="fa-solid fa-circle-dot text-[9px]" aria-hidden="true" /></span>
        <span v-if="cell.created || cell.shipment || cell.attention" class="mt-1 grid gap-0.5" aria-hidden="true">
          <span v-if="cell.created" class="flex items-center justify-between rounded px-1 py-0.5 text-[9px] leading-3" :class="cell.key === selected ? 'bg-white/15 text-white' : 'bg-pic-brand-soft text-pic-brand'"><i class="fa-solid fa-file-circle-plus" /><span class="font-mono font-bold">{{ cell.created }}</span></span>
          <span v-if="cell.shipment" class="cpfr-shipment-date-indicator flex items-center justify-between rounded border px-1 py-0.5 text-[9px] leading-3"><i class="fa-solid fa-truck" /><span class="font-mono font-bold">{{ cell.shipment }}</span></span>
          <span v-if="cell.attention" class="flex items-center justify-between rounded px-1 py-0.5 text-[9px] leading-3" :class="cell.key === selected ? 'bg-white/15 text-white' : 'bg-pic-muted-surface text-pic-text-muted'"><i class="fa-solid fa-shop" /><span class="font-mono font-bold">{{ cell.attention }}</span></span>
        </span>
      </button>
    </div>
    <p class="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-pic-border pt-3 text-[10px] text-pic-text-muted"><span><i class="fa-solid fa-file-circle-plus mr-1 text-pic-brand" />Pedido creado</span><span><i class="fa-solid fa-truck cpfr-shipment-legend mr-1" />Fin de embarque</span><span><i class="fa-solid fa-shop mr-1" />Atención oficial</span></p>
  </section>
</template>

<style scoped>
/* pic-ui-allow-hardcoded-color: comparte el amarillo de fin de embarque definido en CpfrOrderTable. */
.cpfr-shipment-date-indicator { border-color: #fde68a; background-color: #fffbeb; color: #b45309; }
.cpfr-shipment-legend { color: #b45309; }
</style>
