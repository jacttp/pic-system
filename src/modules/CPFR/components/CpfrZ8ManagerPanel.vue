<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { StdAlert, StdButton } from '@/modules/Shared/components/std'
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue'
import { useCpfrStore } from '../stores/cpfrStore'
import { useCpfrZ8ManagerStore } from '../stores/cpfrZ8ManagerStore'
import { cpfrApi } from '../services/cpfrApi'
import type { Z8CatalogItem, Z8ExtraCreateInput, Z8ExtraUpdateInput, Z8ManagerStore, Z8Tipo } from '../types/cpfrZ8ManagerTypes'
import { Z8_REASON_LABELS } from '../types/cpfrZ8ManagerTypes'

const emit = defineEmits<{ (e: 'close'): void; (e: 'deleted'): void; (e: 'created', numPedido: string): void }>()
const cpfr = useCpfrStore()
const manager = useCpfrZ8ManagerStore()
const view = ref<'stores' | 'detail' | 'editor'>('stores')
const type = ref<Z8Tipo>('z8')
const storeSearch = ref('')
const skuSearch = ref('')
const quantities = ref<Record<string, number>>({})
const reason = ref('')
const reasonDetail = ref('')
const shipDate = ref('')
const duplicateDialog = ref(false)
const deleteDialog = ref(false)
const legacyDeleteDialog = ref(false)
const legacyDeleting = ref(false)
const confirmed = ref(new Set<string>())
const editingExisting = ref(false)
const solicitudId = ref('')
const today = new Date().toISOString().slice(0, 10)

const stores = computed(() => {
  const term = storeSearch.value.trim().toLowerCase()
  return term ? manager.stores.filter(s => `${s.id_cliente} ${s.nombre_tienda} ${s.Jefatura || ''}`.toLowerCase().includes(term)) : manager.stores
})
const currentSeries = computed(() => manager.selectedStore?.series[type.value] || null)
const catalog = computed(() => manager.catalog.filter(item => `${item.sku_muliix} ${item.sku_nombre}`.toLowerCase().includes(skuSearch.value.toLowerCase())))
const lines = computed(() => manager.catalog.map(item => ({ ...item, cantidad_pz: Number(quantities.value[item.sku_muliix] || 0) })).filter(item => item.cantidad_pz > 0))
const duplicates = computed(() => lines.value.filter(item => item.antecedentes.length > 0))
const canSave = computed(() => lines.value.length > 0 && !!shipDate.value && !!reason.value && (reason.value !== 'otro' || !!reasonDetail.value.trim()))
const shipDateMax = computed(() => manager.context.year ? isoWeekRange(manager.context.year, manager.context.week).end : '')

function typeLabel(value: Z8Tipo) { return value === 'z8carnes' ? 'Z8 Carnes' : 'Z8' }
function uuid() { return globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/[x]/g, () => Math.floor(Math.random() * 16).toString(16)) }
function defaultShipDate(store: Z8ManagerStore) {
  const now = new Date(); const day = now.getDay() || 7; const delta = store.dia_ventas - day
  if (delta < 0) return ''; const date = new Date(now); date.setDate(now.getDate() + delta); return date.toISOString().slice(0, 10)
}
function quantityStep(item: Z8CatalogItem) { return item.pzas_bolsa || 1 }
function isoWeekRange(year: number, week: number) {
  const jan4 = new Date(Date.UTC(year, 0, 4)); const day = jan4.getUTCDay() || 7
  const monday = new Date(jan4); monday.setUTCDate(jan4.getUTCDate() - day + 1 + ((week - 1) * 7))
  const start = monday.toISOString().slice(0, 10); const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6)
  return { start, end: sunday.toISOString().slice(0, 10) }
}
function setQuantity(item: Z8CatalogItem, event: Event) { quantities.value = { ...quantities.value, [item.sku_muliix]: Number((event.target as HTMLInputElement).value || 0) } }
async function openStore(store: Z8ManagerStore) { await manager.selectStore(store); view.value = 'detail' }
async function edit(typeValue: Z8Tipo) {
  if (!manager.selectedStore?.series[typeValue].original || !manager.selectedStore.series[typeValue].siguiente_letra) return
  editingExisting.value = false; solicitudId.value = uuid(); type.value = typeValue; quantities.value = {}; reason.value = ''; reasonDetail.value = ''; confirmed.value = new Set(); skuSearch.value = ''; shipDate.value = defaultShipDate(manager.selectedStore)
  await manager.loadCatalog(typeValue); view.value = 'editor'
}
async function editExisting() {
  if (!manager.detail?.es_extraordinario || !manager.selectedStore) return
  editingExisting.value = true; type.value = manager.detail.num_pedido.toLowerCase().includes('carne') ? 'z8carnes' : 'z8'
  quantities.value = Object.fromEntries(manager.detail.lineas.map(line => [line.sku_muliix, Number(line.cantidad_final_uni || 0)]))
  reason.value = manager.detail.motivo || ''; reasonDetail.value = manager.detail.detalle_motivo || ''; shipDate.value = manager.detail.fec_envio || ''; confirmed.value = new Set(); skuSearch.value = ''
  await manager.loadCatalog(type.value, manager.detail.num_pedido); view.value = 'editor'
}
async function inspect(order: { id_cliente: string; num_pedido: string; fec_pedido_cadena: string }) { await manager.loadOrder(order) }
async function save() {
  if (!manager.selectedStore || !canSave.value) return
  if (duplicates.value.some(item => !confirmed.value.has(item.sku_muliix))) { duplicateDialog.value = true; return }
  const lineas = lines.value.map(item => ({ sku_muliix: item.sku_muliix, cantidad_pz: item.cantidad_pz }))
  const confirmaciones_repetidos = duplicates.value.filter(item => item.antecedentes_token).map(item => ({ sku_muliix: item.sku_muliix, antecedentes_token: item.antecedentes_token! }))
  try {
    const order = editingExisting.value && manager.detail
      ? await manager.updateExtra({ ...manager.detail, nom_cadena: manager.context.nom_cadena, version: manager.detail.version, fec_envio: shipDate.value, motivo: reason.value, detalle_motivo: reasonDetail.value || undefined, lineas, confirmaciones_repetidos } as Z8ExtraUpdateInput)
      : await manager.createExtra({ solicitud_id: solicitudId.value, id_cliente: manager.selectedStore.id_cliente, nom_cadena: manager.context.nom_cadena, year: manager.context.year, week: manager.context.week, tipo: type.value, fec_envio: shipDate.value, motivo: reason.value, detalle_motivo: reasonDetail.value || undefined, lineas, confirmaciones_repetidos } as Z8ExtraCreateInput)
    emit('created', order.num_pedido); emit('deleted'); view.value = 'detail'; await manager.selectStore(manager.selectedStore)
  } catch { /* el store mantiene la captura */ }
}
async function confirmDuplicates() { confirmed.value = new Set(duplicates.value.map(item => item.sku_muliix)); duplicateDialog.value = false; await save() }
async function remove() { if (!manager.detail) return; await manager.removeExtra(manager.detail); deleteDialog.value = false; emit('deleted') }
async function removeLegacyDrafts() {
  if (!cpfr.filters.dia || !manager.context.year) return
  legacyDeleting.value = true
  try {
    const range = isoWeekRange(manager.context.year, manager.context.week)
    await cpfrApi.deleteZ8Drafts({ fec_inicio: range.start, fec_fin: range.end, nom_cadena: manager.context.nom_cadena, dia_ventas: cpfr.filters.dia })
    await manager.loadStores(manager.context); legacyDeleteDialog.value = false; emit('deleted')
  } finally { legacyDeleting.value = false }
}

onMounted(async () => { if (cpfr.currentWeek) await manager.loadStores({ year: cpfr.currentWeek.anio, week: cpfr.currentWeek.semana, nom_cadena: cpfr.nom_cadena, dia: cpfr.filters.dia }) })
</script>

<template>
  <div class="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" @click="emit('close')" />
  <aside class="fixed inset-y-0 right-0 z-50 flex w-full max-w-6xl flex-col border-l border-pic-border bg-pic-background shadow-2xl">
    <header class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-pic-border bg-pic-surface px-4 py-3 sm:px-5">
      <div class="flex min-w-0 items-center gap-3"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pic-brand text-white"><i class="fa-solid fa-truck-fast"></i></span><div><p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-brand">CPFR / excepción semanal</p><h2 class="text-base font-extrabold text-pic-text-main">Gestión de Z8 extraordinarios</h2><p class="text-xs text-pic-text-muted">{{ manager.context.year ? `Semana ${manager.context.week}/${manager.context.year} · ${manager.context.nom_cadena}` : 'Cargando…' }}</p></div></div>
      <div class="flex gap-2"><StdButton v-if="view === 'stores'" variant="danger" size="sm" :disabled="!cpfr.filters.dia" icon="fa-solid fa-trash" @click="legacyDeleteDialog = true">Limpiar borradores</StdButton><StdButton v-if="view !== 'stores'" variant="secondary" size="sm" icon="fa-solid fa-arrow-left" @click="view = view === 'editor' ? 'detail' : 'stores'">Regresar</StdButton><button class="grid h-9 w-9 place-items-center rounded-lg text-pic-text-muted hover:bg-pic-brand-soft hover:text-pic-brand" aria-label="Cerrar" @click="emit('close')"><i class="fa-solid fa-xmark"></i></button></div>
    </header>
    <main class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
      <StdAlert v-if="manager.error" class="mb-4" tone="danger" title="No fue posible completar la operación" :description="manager.error" />

      <section v-if="view === 'stores'" class="space-y-4">
        <div class="flex flex-col gap-3 rounded-xl border border-pic-border bg-pic-surface p-4 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-brand">Tiendas del día</p><h3 class="mt-1 text-sm font-extrabold text-pic-text-main">Consulta la situación semanal antes de crear una excepción</h3></div><label class="relative w-full sm:w-72"><i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i><input v-model="storeSearch" type="search" placeholder="Buscar tienda o ID" class="h-10 w-full rounded-lg border border-pic-border bg-pic-surface pl-9 pr-3 text-sm font-semibold outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border" /></label></div>
        <div v-if="manager.loadingStores" class="py-16 text-center text-sm text-pic-text-muted"><i class="fa-solid fa-circle-notch fa-spin mr-2 text-pic-brand"></i>Cargando tiendas…</div>
        <div v-else-if="!stores.length" class="py-16 text-center text-sm text-pic-text-muted">No hay tiendas para los filtros activos.</div>
        <div v-else class="grid gap-3 lg:grid-cols-2"><button v-for="store in stores" :key="store.id_cliente" type="button" class="group rounded-xl border border-pic-border bg-pic-surface p-4 text-left transition hover:border-pic-brand-border hover:bg-pic-brand-soft" @click="openStore(store)"><div class="flex items-start justify-between gap-3"><div><p class="font-mono text-[10px] font-bold text-pic-text-muted">{{ store.id_cliente }}</p><h3 class="mt-1 text-sm font-extrabold text-pic-text-main">{{ store.nombre_tienda || 'Tienda sin nombre' }}</h3><p class="mt-1 text-xs text-pic-text-muted">{{ store.Jefatura || 'Sin jefatura' }} · Día {{ store.dia_ventas }}</p></div><i class="fa-solid fa-arrow-right mt-2 text-pic-text-muted group-hover:text-pic-brand"></i></div><div class="mt-4 grid grid-cols-2 gap-2"><div v-for="kind in (['z8', 'z8carnes'] as Z8Tipo[])" :key="kind" class="rounded-lg bg-pic-muted-surface px-3 py-2"><p class="text-[10px] font-black uppercase tracking-wide text-pic-text-muted">{{ typeLabel(kind) }}</p><p class="mt-1 text-xs font-bold text-pic-text-main">{{ store.series[kind].original ? `${store.series[kind].consumidas} extra(s)` : 'Original faltante' }}</p></div></div></button></div>
      </section>

      <section v-else-if="view === 'detail' && manager.selectedStore" class="space-y-4">
        <div class="flex flex-col gap-3 rounded-xl border border-pic-border bg-pic-surface p-4 sm:flex-row sm:items-center sm:justify-between"><div><p class="font-mono text-[10px] font-bold text-pic-text-muted">{{ manager.selectedStore.id_cliente }}</p><h3 class="mt-1 text-lg font-extrabold text-pic-text-main">{{ manager.selectedStore.nombre_tienda }}</h3><p class="text-xs text-pic-text-muted">Calendario de pedidos oficiales, Z8 y Z8 Carnes.</p></div><div class="flex flex-wrap gap-2"><StdButton v-for="kind in (['z8', 'z8carnes'] as Z8Tipo[])" :key="kind" size="sm" :variant="manager.selectedStore.series[kind].original ? 'primary' : 'secondary'" :disabled="!manager.selectedStore.series[kind].original || !manager.selectedStore.series[kind].siguiente_letra" icon="fa-solid fa-plus" @click="edit(kind)">{{ typeLabel(kind) }} {{ manager.selectedStore.series[kind].siguiente_letra || 'sin cupo' }}</StdButton></div></div>
        <StdAlert v-if="!manager.selectedStore.series.z8.original && !manager.selectedStore.series.z8carnes.original" tone="warning" title="Falta el pedido tradicional" description="Un extraordinario requiere que exista primero el Z8 tradicional del mismo tipo y semana." />
        <section class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface"><header class="border-b border-pic-border bg-pic-muted-surface px-4 py-3"><h4 class="text-sm font-bold text-pic-text-main">Pedidos del calendario</h4></header><div v-if="manager.loadingDetail" class="p-8 text-center text-sm text-pic-text-muted"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Cargando calendario…</div><div v-else-if="!manager.calendar.length" class="p-8 text-center text-sm text-pic-text-muted">No hay pedidos persistidos en este mes.</div><div v-else class="divide-y divide-pic-border"><button v-for="order in manager.calendar" :key="`${order.num_pedido}-${order.fec_pedido_cadena}`" type="button" class="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-pic-brand-soft sm:flex-row sm:items-center sm:justify-between" @click="inspect(order)"><div><p class="font-mono text-xs font-bold" :class="order.es_extraordinario ? 'text-[#9d174d]' : 'text-pic-text-main'">{{ order.num_pedido }}</p><p class="mt-1 text-xs text-pic-text-muted">{{ order.fec_envio || 'Sin fecha de envío' }} · {{ order.estado }} · {{ order.total_skus }} SKU</p></div><p class="text-xs font-bold tabular-nums text-pic-text-main">{{ Number(order.total_piezas).toLocaleString('es-MX') }} pzas <span v-if="order.motivo" class="ml-2 text-[#9d174d]">{{ Z8_REASON_LABELS[order.motivo] }}</span></p></button></div></section>
        <article v-if="manager.detail" class="rounded-xl border border-pic-border bg-pic-surface p-4"><div class="flex flex-wrap items-start justify-between gap-3"><div><p class="font-mono text-xs font-bold" :class="manager.detail.es_extraordinario ? 'text-[#9d174d]' : 'text-pic-text-main'">{{ manager.detail.num_pedido }}</p><p class="mt-1 text-xs text-pic-text-muted">{{ manager.detail.fec_envio || 'Sin fecha' }} · {{ manager.detail.estado }}</p><p v-if="manager.detail.motivo" class="mt-2 text-xs font-medium text-pic-text-main">{{ Z8_REASON_LABELS[manager.detail.motivo] }}<span v-if="manager.detail.detalle_motivo">: {{ manager.detail.detalle_motivo }}</span></p></div><div class="flex gap-2"><StdButton v-if="manager.detail.es_extraordinario && !manager.detail.eliminado && ['pendiente','borrador'].includes(manager.detail.estado)" variant="secondary" size="sm" icon="fa-solid fa-pen" @click="editExisting">Editar</StdButton><StdButton v-if="manager.detail.es_extraordinario && !manager.detail.eliminado && ['pendiente','borrador'].includes(manager.detail.estado)" variant="danger" size="sm" icon="fa-solid fa-trash" @click="deleteDialog = true">Eliminar</StdButton></div></div><div class="mt-4 divide-y divide-pic-border border-y border-pic-border"><div v-for="line in manager.detail.lineas" :key="line.sku_muliix" class="flex items-center justify-between gap-3 py-2"><span class="text-xs font-semibold text-pic-text-main">{{ line.sku_nombre || line.sku_muliix }}</span><span class="font-mono text-xs font-bold tabular-nums">{{ Number(line.cantidad_final_uni || 0) + Number(line.ajuste || 0) + Number(line.ajuste_mix || 0) }} pzas</span></div></div></article>
      </section>

      <section v-else-if="view === 'editor' && manager.selectedStore" class="space-y-4">
        <div class="rounded-xl border border-[#9d174d]/30 bg-pic-surface p-4 shadow-[inset_4px_0_0_0_#9d174d]"><p class="text-[10px] font-black uppercase tracking-[0.14em] text-[#9d174d]">{{ editingExisting ? 'Edición de extraordinario' : `Extraordinario ${currentSeries?.siguiente_letra || ''}` }}</p><h3 class="mt-1 text-lg font-extrabold text-pic-text-main">{{ typeLabel(type) }} para {{ manager.selectedStore.nombre_tienda }}</h3><p class="mt-1 text-xs text-pic-text-muted">Captura manual: este pedido no será recalculado ni sometido a Mix.</p></div>
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]"><section class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface"><header class="flex flex-col gap-3 border-b border-pic-border p-3 sm:flex-row sm:items-center sm:justify-between"><h4 class="text-sm font-bold text-pic-text-main">Catálogo {{ typeLabel(type) }}</h4><label class="relative w-full sm:w-64"><i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i><input v-model="skuSearch" class="h-9 w-full rounded-lg border border-pic-border bg-pic-surface pl-9 pr-3 text-xs font-semibold outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border" placeholder="Buscar artículo" /></label></header><div class="max-h-[46vh] divide-y divide-pic-border overflow-y-auto"><div v-for="item in catalog" :key="item.sku_muliix" class="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-3 px-3 py-3"><div><p class="text-xs font-bold text-pic-text-main">{{ item.sku_nombre }}</p><p class="font-mono text-[10px] text-pic-text-muted">{{ item.sku_muliix }} · múltiplo {{ quantityStep(item) }}</p><p v-if="item.antecedentes.length" class="mt-1 text-[10px] font-bold text-pic-warning">Ya solicitado en {{ item.antecedentes.map(row => row.num_pedido).join(', ') }}</p></div><input :value="quantities[item.sku_muliix] || ''" type="number" min="0" :step="quantityStep(item)" class="h-9 rounded-lg border border-pic-border bg-pic-surface px-2 text-right font-mono text-xs font-bold outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border" @input="setQuantity(item, $event)" /></div></div></section><section class="space-y-4"><div class="rounded-xl border border-pic-border bg-pic-surface p-4"><label class="block text-[10px] font-black uppercase tracking-[0.14em] text-pic-text-muted">Fecha de envío</label><input v-model="shipDate" :min="today" type="date" class="mt-2 h-10 w-full rounded-lg border border-pic-border bg-pic-surface px-3 text-sm font-semibold outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border" /><label class="mt-4 block text-[10px] font-black uppercase tracking-[0.14em] text-pic-text-muted">Motivo</label><select v-model="reason" class="mt-2 h-10 w-full rounded-lg border border-pic-border bg-pic-surface px-3 text-sm font-semibold outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border"><option value="">Selecciona un motivo</option><option v-for="(label, value) in Z8_REASON_LABELS" :key="value" :value="value">{{ label }}</option></select><textarea v-if="reason === 'otro'" v-model="reasonDetail" class="mt-2 min-h-24 w-full rounded-lg border border-pic-border bg-pic-surface p-3 text-sm outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border" placeholder="Explica el motivo" /></div><StdAlert v-if="duplicates.length" tone="warning" title="Hay artículos ya solicitados" description="Al guardar tendrás que confirmar que deben volver a incluirse." /><StdButton class="w-full" variant="primary" :disabled="!canSave || manager.saving" :icon="manager.saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-floppy-disk'" @click="save">{{ manager.saving ? 'Guardando…' : `Crear ${typeLabel(type)} ${currentSeries?.siguiente_letra || ''}` }}</StdButton></section></div>
      </section>
    </main>
  </aside>
  <ModalDialog v-model="duplicateDialog" title="Artículos ya solicitados" size="xl"><div class="space-y-3"><p class="text-sm text-pic-text-muted">Confirma que deben volver a incluirse, aunque ya tengan cantidad positiva en un pedido previo.</p><div v-for="item in duplicates" :key="item.sku_muliix" class="rounded-lg border border-pic-border bg-pic-muted-surface p-3"><p class="text-sm font-bold text-pic-text-main">{{ item.sku_nombre }}</p><p v-for="prior in item.antecedentes" :key="prior.num_pedido" class="mt-1 font-mono text-xs text-pic-text-muted">{{ prior.num_pedido }} · {{ prior.cantidad_efectiva }} pzas · {{ prior.estado }}</p></div><div class="flex justify-end gap-2"><StdButton variant="secondary" @click="duplicateDialog = false">Volver a editar</StdButton><StdButton variant="primary" icon="fa-solid fa-check" @click="confirmDuplicates">Confirmar y guardar</StdButton></div></div></ModalDialog>
  <ModalDialog v-model="deleteDialog" title="Eliminar extraordinario" size="md"><div class="space-y-4"><StdAlert tone="danger" title="Se eliminarán las líneas editables" description="La letra queda reservada y no puede reutilizarse." /><div class="flex justify-end gap-2"><StdButton variant="secondary" @click="deleteDialog = false">Cancelar</StdButton><StdButton variant="danger" :disabled="manager.deleting" icon="fa-solid fa-trash" @click="remove">{{ manager.deleting ? 'Eliminando…' : 'Eliminar pedido' }}</StdButton></div></div></ModalDialog>
  <ModalDialog v-model="legacyDeleteDialog" title="Limpiar borradores Z8" size="md"><div class="space-y-4"><StdAlert tone="danger" title="Eliminar borradores tradicionales" :description="`Borrará cascarones editables de la semana ${manager.context.week}/${manager.context.year} para el día ${cpfr.filters.dia}. Los originales con extraordinarios vigentes quedan protegidos.`" /><div class="flex justify-end gap-2"><StdButton variant="secondary" @click="legacyDeleteDialog = false">Cancelar</StdButton><StdButton variant="danger" :disabled="legacyDeleting" icon="fa-solid fa-trash" @click="removeLegacyDrafts">{{ legacyDeleting ? 'Eliminando…' : 'Eliminar borradores' }}</StdButton></div></div></ModalDialog>
</template>
