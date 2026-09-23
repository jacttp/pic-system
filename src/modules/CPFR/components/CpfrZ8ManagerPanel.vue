<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { StdAlert, StdButton } from '@/modules/Shared/components/std'
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue'
import { useCpfrZ8ManagerStore } from '../stores/cpfrZ8ManagerStore'
import type { Z8ExtraLineInput, Z8ManagerOrder, Z8OrderKey, Z8Tipo, Z8WeeklyOrder } from '../types/cpfrZ8ManagerTypes'
import CpfrZ8Calendar from './CpfrZ8Calendar.vue'
import CpfrZ8StoreList from './CpfrZ8StoreList.vue'
import CpfrZ8OrderTreeTable from './CpfrZ8OrderTreeTable.vue'
import CpfrZ8DeleteDialog from './CpfrZ8DeleteDialog.vue'
import CpfrZ8ExtraEditor from './CpfrZ8ExtraEditor.vue'

const emit = defineEmits<{ (e: 'close'): void; (e: 'created', number: string): void; (e: 'updated', number: string): void; (e: 'deleted'): void }>()
const manager = useCpfrZ8ManagerStore()
const mode = ref<'browse' | 'editor'>('browse')
const selected = ref<Z8OrderKey[]>([])
const deletionDialog = ref(false)
const quickDeleteOpen = ref(false)
const quickDeleteStage = ref<'selection' | 'preview'>('selection')
const quickDeleteSearch = ref('')
const quickDeleteSelected = ref(new Set<string>())
const quickDeletePreviewing = ref(false)
const quickDeleteError = ref('')
const pendingDeleteKeys = ref<Z8OrderKey[]>([])
const duplicateDialog = ref(false)
const discardDialog = ref(false)
const pendingLeave = ref<(() => void) | null>(null)
const editExisting = ref(false)
const editTarget = ref<Z8ManagerOrder | null>(null)
const kind = ref<Z8Tipo>('z8')
const quantities = ref<Record<string, number>>({})
const reason = ref('')
const reasonDetail = ref('')
const shipDate = ref('')
const skuSearch = ref('')
const solicitudId = ref('')
const confirmed = ref(new Set<string>())
const busyGenerating = ref(false)
const localError = ref('')
const officialDayPassed = computed(() => {
  const date = manager.selectedStore?.fecha_atencion
  return !!date && date < manager.context.today
})
const missingOriginal = computed(() => {
  const store = manager.selectedStore
  return !!store && !officialDayPassed.value && (['z8', 'z8carnes'] as const).some(type => store.series[type].aplicable && !store.series[type].original)
})
const selectedDaySummary = computed(() => manager.calendar?.dias.find(day => day.fecha === manager.selectedDay) || null)
const dirty = computed(() => mode.value === 'editor' && (Object.values(quantities.value).some(value => value > 0) || !!reason.value || !!reasonDetail.value))
const lines = computed<Z8ExtraLineInput[]>(() => manager.catalog.map(item => ({ sku_muliix: item.sku_muliix, cantidad_pz: Number(quantities.value[item.sku_muliix] || 0) })).filter(item => item.cantidad_pz > 0))
const repeated = computed(() => manager.catalog.filter(item => lines.value.some(line => line.sku_muliix === item.sku_muliix) && item.antecedentes.length))
const valid = computed(() => lines.value.length > 0 && !!shipDate.value && !!reason.value && (reason.value !== 'otro' || !!reasonDetail.value.trim()) && lines.value.every(line => { const item = manager.catalog.find(c => c.sku_muliix === line.sku_muliix); return Number.isInteger(line.cantidad_pz) && line.cantidad_pz > 0 && !!item?.pzas_bolsa && line.cantidad_pz % item.pzas_bolsa === 0 }))
const orderId = (item: Z8OrderKey) => `${item.id_cliente}|${item.num_pedido}|${item.fec_pedido_cadena}`
const quickDeleteCandidates = computed<Z8OrderKey[]>(() => {
  const calendar = manager.calendar
  if (!calendar) return []
  const candidates = new Map<string, Z8OrderKey>()
  for (const event of calendar.eventos) {
    const order = event.pedido
    if (event.tipo !== 'pedido_creado' || !order || !order.num_pedido.toLowerCase().startsWith('z8')) continue
    if (order.fec_pedido_cadena < calendar.context.today || order.fec_pedido_cadena > calendar.context.weekEnd) continue
    candidates.set(orderId(order), order)
  }
  return [...candidates.values()].sort((a, b) => b.fec_pedido_cadena.localeCompare(a.fec_pedido_cadena) || a.id_cliente.localeCompare(b.id_cliente) || a.num_pedido.localeCompare(b.num_pedido))
})
const quickDeleteVisible = computed(() => {
  const search = quickDeleteSearch.value.trim().toLowerCase()
  return search ? quickDeleteCandidates.value.filter(order => `${order.id_cliente} ${order.num_pedido}`.toLowerCase().includes(search)) : quickDeleteCandidates.value
})
const quickDeleteKeys = computed(() => quickDeleteCandidates.value.filter(order => quickDeleteSelected.value.has(orderId(order))))
function guarded(next: () => void) { if (dirty.value) { pendingLeave.value = next; discardDialog.value = true } else next() }
function leaveEditor() { mode.value = 'browse'; editTarget.value = null; confirmed.value = new Set(); localError.value = '' }
function discard() { discardDialog.value = false; const next = pendingLeave.value; pendingLeave.value = null; leaveEditor(); next?.() }
function close() { guarded(() => emit('close')) }
async function chooseDay(date: string) { guarded(async () => { manager.clearSelection(); selected.value = []; await manager.loadStores(date) }) }
function chooseStore(store: typeof manager.selectedStore) {
  if (!store) return
  guarded(() => {
    manager.selectStore(store)
    selected.value = []
  })
}
function backToStores() {
  guarded(() => {
    manager.clearSelection()
    selected.value = []
  })
}
async function expand(order: Z8WeeklyOrder) { await manager.loadOrder(order) }
function toggle(order: Z8WeeklyOrder) { selected.value = selected.value.some(item => orderId(item) === orderId(order)) ? selected.value.filter(item => orderId(item) !== orderId(order)) : [...selected.value, order] }
function openQuickDelete() {
  quickDeleteStage.value = 'selection'
  quickDeleteSearch.value = ''
  quickDeleteSelected.value = new Set()
  quickDeleteError.value = ''
  quickDeleteOpen.value = true
}
function toggleQuickDelete(order: Z8OrderKey) {
  const next = new Set(quickDeleteSelected.value)
  const id = orderId(order)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  quickDeleteSelected.value = next
}
function toggleQuickVisible() {
  const next = new Set(quickDeleteSelected.value)
  const visible = quickDeleteVisible.value.map(orderId)
  if (visible.every(id => next.has(id))) visible.forEach(id => next.delete(id))
  else visible.forEach(id => next.add(id))
  quickDeleteSelected.value = next
}
function officialDate() { const date = manager.selectedStore?.fecha_atencion; return date && date >= manager.context.today ? date : '' }
function canCreateExtra(type: Z8Tipo) {
  const series = manager.selectedStore?.series[type]
  return !!series?.siguiente_letra && (!!series.original || officialDayPassed.value)
}
async function newExtra(type: Z8Tipo) {
  const series = manager.selectedStore?.series[type]
  if (!canCreateExtra(type) || !series?.siguiente_letra) return
  editExisting.value = false; kind.value = type; quantities.value = {}; reason.value = ''; reasonDetail.value = ''; shipDate.value = officialDate(); skuSearch.value = ''; confirmed.value = new Set(); solicitudId.value = crypto.randomUUID(); localError.value = ''
  await manager.loadCatalog(type); mode.value = 'editor'
}
async function openEdit(order: Z8ManagerOrder | null = manager.detail) {
  if (!order?.capacidades?.puede_editar) return
  editTarget.value = order; editExisting.value = true; kind.value = order.tipo === 'z8carnes' ? 'z8carnes' : 'z8'; quantities.value = Object.fromEntries(order.lineas.map(line => [line.sku_muliix, Number(line.cantidad_final_uni || 0)])); reason.value = order.motivo || ''; reasonDetail.value = order.detalle_motivo || ''; shipDate.value = order.fec_envio || ''; confirmed.value = new Set(); localError.value = ''
  await manager.loadCatalog(kind.value, order.num_pedido); mode.value = 'editor'
}
async function save() {
  if (!valid.value || !manager.selectedStore || manager.saving) return
  if (repeated.value.some(item => !confirmed.value.has(item.sku_muliix))) { duplicateDialog.value = true; return }
  const target = editTarget.value
  if (editExisting.value && !target) return
  const common = { nom_cadena: 'soriana', fec_envio: shipDate.value, motivo: reason.value, detalle_motivo: reasonDetail.value || undefined, lineas: lines.value, confirmaciones_repetidos: repeated.value.filter(item => item.antecedentes_token).map(item => ({ sku_muliix: item.sku_muliix, antecedentes_token: item.antecedentes_token! })) }
  try {
    const order = editExisting.value && target
      ? await manager.updateExtra({ ...common, id_cliente: target.id_cliente, num_pedido: target.num_pedido, fec_pedido_cadena: target.fec_pedido_cadena, version: target.version })
      : await manager.createExtra({ ...common, solicitud_id: solicitudId.value, id_cliente: manager.selectedStore.id_cliente, year: manager.context.year, week: manager.context.week, tipo: kind.value })
    leaveEditor(); selected.value = []; await manager.loadStores(manager.context.today)
    const store = manager.stores.find(item => item.id_cliente === order.id_cliente); if (store && manager.selectedStore?.id_cliente !== store.id_cliente) manager.selectStore(store)
    await manager.loadOrder(order)
    if (editExisting.value) emit('updated', order.num_pedido); else emit('created', order.num_pedido)
  } catch (error: any) { localError.value = error?.response?.data?.message || 'No se pudo guardar. Conservamos la captura para que puedas corregirla.'; confirmed.value = new Set(); if (error?.response?.data?.code === 'DUPLICATE_CONFIRMATION_REQUIRED') { for (const changed of error.response.data.details || []) { const item = manager.catalog.find(row => row.sku_muliix === changed.sku_muliix); if (item) { item.antecedentes = changed.antecedentes; item.antecedentes_token = changed.antecedente_token } } duplicateDialog.value = true } }
}
async function confirmRepeated() { confirmed.value = new Set(repeated.value.map(item => item.sku_muliix)); duplicateDialog.value = false; await save() }
async function generateTraditional() {
  if (!manager.selectedStore || busyGenerating.value) return
  busyGenerating.value = true; localError.value = ''
  try { await manager.generateTraditional(manager.selectedStore); emit('created', 'tradicional') }
  catch (error: any) { localError.value = error?.response?.data?.message || error?.message || 'No se pudieron generar los tradicionales.' }
  finally { busyGenerating.value = false }
}
async function previewDelete() {
  if (!selected.value.length) return
  localError.value = ''
  try { const keys = [...selected.value]; await manager.previewDelete(keys); pendingDeleteKeys.value = keys; deletionDialog.value = true }
  catch (error: any) { localError.value = error?.response?.data?.message || 'No fue posible preparar la eliminación.' }
}
async function previewQuickDelete() {
  const keys = quickDeleteKeys.value
  if (!keys.length || quickDeletePreviewing.value) return
  quickDeletePreviewing.value = true
  quickDeleteError.value = ''
  try { await manager.previewDelete(keys); pendingDeleteKeys.value = keys; quickDeleteStage.value = 'preview' }
  catch (error: any) { quickDeleteError.value = error?.response?.data?.message || 'No fue posible preparar la eliminación.' }
  finally { quickDeletePreviewing.value = false }
}
async function remove() {
  if (!pendingDeleteKeys.value.length || manager.deleting) return
  try {
    await manager.removeOrders(pendingDeleteKeys.value)
    selected.value = []; pendingDeleteKeys.value = []; quickDeleteSelected.value = new Set()
    deletionDialog.value = false; quickDeleteOpen.value = false; emit('deleted')
  } catch (error: any) {
    const message = error?.response?.data?.message || 'La selección cambió. Solicita una vista previa nueva.'
    if (quickDeleteOpen.value) { quickDeleteStage.value = 'selection'; quickDeleteError.value = message }
    else { deletionDialog.value = false; localError.value = message }
  }
}
onMounted(() => manager.loadCalendar())
</script>

<template>
  <Teleport to="body">
  <div class="fixed inset-0 z-40 bg-black/35" @click="close" />
  <aside class="fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col overflow-hidden bg-pic-background font-sans shadow-2xl sm:w-[94vw] sm:border-l sm:border-pic-border lg:w-[80vw]" aria-label="Gestor Z8 de Soriana">
    <header class="flex shrink-0 items-center justify-between gap-3 border-b border-pic-border bg-pic-surface px-4 py-3 sm:px-6">
      <div class="min-w-0"><p class="text-[10px] font-bold uppercase tracking-widest text-pic-brand">CPFR / Soriana</p><h2 class="text-lg font-extrabold tracking-tight text-pic-text-main">Calendario y gestor Z8</h2></div>
      <div class="flex flex-wrap items-center gap-2">
        <p class="hidden text-xs font-medium text-pic-text-muted sm:block"><i class="fa-regular fa-calendar-days mr-1.5" />Semana {{ manager.context.week }}/{{ manager.context.year }} · {{ manager.calendar?.context.weekStart }} a {{ manager.calendar?.context.weekEnd }}</p>
        <StdButton v-if="mode === 'editor'" size="sm" variant="secondary" icon="fa-solid fa-arrow-left" @click="guarded(leaveEditor)">Regresar</StdButton>
        <button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-pic-text-muted hover:bg-pic-brand-soft focus-visible:outline-2 focus-visible:outline-pic-brand" aria-label="Cerrar gestor" @click="close"><i class="fa-solid fa-xmark" /></button>
      </div>
    </header>
    <main class="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 xl:p-5">
      <p class="mb-3 text-xs font-medium text-pic-text-muted sm:hidden">Semana {{ manager.context.week }}/{{ manager.context.year }} · {{ manager.calendar?.context.weekStart }} a {{ manager.calendar?.context.weekEnd }}</p>
      <StdAlert v-if="manager.error || localError" class="mb-4" tone="danger" title="Revisa esta operación" :description="localError || manager.error || ''" />
      <p v-if="manager.loadingCalendar" class="py-12 text-center text-sm text-pic-text-muted">Cargando calendario semanal…</p>
      <div v-else-if="mode === 'browse' && manager.calendar" class="z8-manager-container min-h-0">
        <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs text-pic-text-muted"><span class="font-bold text-pic-text-main">Eliminación rápida</span> · {{ quickDeleteCandidates.length }} Z8 creados de hoy al domingo</p>
          <StdButton size="sm" variant="danger" icon="fa-solid fa-trash" :disabled="!quickDeleteCandidates.length" class="w-full sm:w-auto" @click="openQuickDelete">Revisar Z8 recientes</StdButton>
        </div>
        <div class="z8-manager-layout grid min-h-0 items-start gap-4">
          <div class="space-y-3 lg:sticky lg:top-0 lg:self-start">
            <CpfrZ8Calendar :data="manager.calendar" :selected="manager.selectedDay" :store-id="manager.selectedStore?.id_cliente" :store-name="manager.selectedStore?.nombre_tienda" @select="chooseDay" />
            <section v-if="selectedDaySummary" class="rounded-xl border border-pic-border bg-pic-surface px-3 py-3 sm:px-4" aria-live="polite" :aria-label="`Resumen del ${manager.selectedDay}`">
              <div class="flex items-baseline justify-between gap-2"><h3 class="text-sm font-bold text-pic-text-main">{{ manager.selectedDay }}</h3><span class="text-xs text-pic-text-muted">Resumen del día</span></div>
              <dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-4">
                <div><dt class="text-pic-text-muted">Tiendas</dt><dd class="font-mono font-bold text-pic-text-main">{{ selectedDaySummary.tiendas_relacionadas }}</dd></div>
                <div><dt class="text-pic-text-muted">Pedidos creados</dt><dd class="font-mono font-bold text-pic-text-main">{{ selectedDaySummary.pedidos_creados }}</dd></div>
                <div><dt class="text-pic-text-muted">Fin de embarque</dt><dd class="font-mono font-bold text-pic-text-main">{{ selectedDaySummary.pedidos_fin_embarque }}</dd></div>
                <div><dt class="text-pic-text-muted">Atención oficial</dt><dd class="font-mono font-bold text-pic-text-main">{{ selectedDaySummary.tiendas_atencion_oficial }}</dd></div>
              </dl>
            </section>
          </div>
          <CpfrZ8StoreList :stores="manager.stores" :selected-id="manager.selectedStore?.id_cliente" :selected-date="manager.selectedDay" :loading="manager.loadingStores" @select="chooseStore" @back="backToStores">
            <template #details="{ store }">
            <div v-if="missingOriginal" class="mb-3 flex justify-end">
              <StdButton size="sm" variant="primary" icon="fa-solid fa-plus" :disabled="busyGenerating || !store.fecha_atencion" @click="generateTraditional">Generar Z8 y Z8 Carnes</StdButton>
            </div>
            <StdAlert v-if="missingOriginal" class="mb-3" tone="warning" title="Falta pedido Z8 tradicional" description="Genera ambos tipos para esta tienda antes de crear un extraordinario." />
            <CpfrZ8OrderTreeTable :key="store.id_cliente" :orders="store.pedidos" :details="manager.orderDetails" :loading-order-keys="manager.loadingOrderKeys" :selected="selected" embedded @expand="expand" @toggle="toggle" @edit="openEdit">
              <template #actions>
                <StdButton size="sm" variant="secondary" icon="fa-solid fa-plus" :disabled="!canCreateExtra('z8')" :title="!manager.selectedStore.series.z8.siguiente_letra ? 'Se agotaron las letras B–G' : !manager.selectedStore.series.z8.original && officialDayPassed ? 'El día oficial ya pasó; puedes crear el extraordinario sin original' : !manager.selectedStore.series.z8.original ? 'Primero genera el Z8 tradicional' : 'Crear Z8 extraordinario'" @click="newExtra('z8')">Z8 {{ manager.selectedStore.series.z8.siguiente_letra || 'B' }}</StdButton>
                <StdButton size="sm" variant="secondary" icon="fa-solid fa-plus" :disabled="!canCreateExtra('z8carnes')" :title="!manager.selectedStore.series.z8carnes.siguiente_letra ? 'Se agotaron las letras B–G' : !manager.selectedStore.series.z8carnes.original && officialDayPassed ? 'El día oficial ya pasó; puedes crear el extraordinario sin original' : !manager.selectedStore.series.z8carnes.original ? 'Primero genera el Z8 Carnes tradicional' : 'Crear Z8 Carnes extraordinario'" @click="newExtra('z8carnes')">Z8 Carnes {{ manager.selectedStore.series.z8carnes.siguiente_letra || 'B' }}</StdButton>
                <StdButton size="sm" variant="danger" icon="fa-solid fa-trash" :disabled="!selected.length" title="Selecciona uno o varios Z8 para revisar su eliminación" @click="previewDelete">Eliminar Z8<span v-if="selected.length"> ({{ selected.length }})</span></StdButton>
              </template>
            </CpfrZ8OrderTreeTable>
            </template>
          </CpfrZ8StoreList>
        </div>
      </div>
      <CpfrZ8ExtraEditor v-else-if="mode === 'editor' && manager.selectedStore" :store-name="manager.selectedStore.nombre_tienda" :kind="kind" :letter="manager.selectedStore.series[kind].siguiente_letra" :editing="editExisting" :past-official-day="!!manager.selectedStore.fecha_atencion && manager.selectedStore.fecha_atencion < manager.context.today" :today="manager.context.today" :week-end="manager.context.weekEnd" :catalog="manager.catalog" :quantities="quantities" :reason="reason" :reason-detail="reasonDetail" :ship-date="shipDate" :sku-search="skuSearch" :total-skus="lines.length" :total-pieces="lines.reduce((sum, line) => sum + line.cantidad_pz, 0)" :valid="valid" :saving="manager.saving" @quantity="(sku, value) => quantities[sku] = value" @update:reason="reason = $event" @update:reason-detail="reasonDetail = $event" @update:ship-date="shipDate = $event" @update:sku-search="skuSearch = $event" @save="save" />
    </main>
  </aside>
  </Teleport>
  <ModalDialog v-model="quickDeleteOpen" title="Eliminación rápida de Z8" size="2xl">
    <div class="space-y-4 font-sans">
      <p class="text-sm text-pic-text-muted">Solo se incluyen Z8 y Z8 Carnes creados desde {{ manager.context.today }} hasta {{ manager.context.weekEnd }}. El servidor comprobará estados y dependencias antes de eliminar.</p>
      <StdAlert v-if="quickDeleteError" tone="danger" title="No se pudo continuar" :description="quickDeleteError" />
      <template v-if="quickDeleteStage === 'selection'">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label class="flex-1"><span class="sr-only">Buscar tienda o número de pedido</span><input v-model="quickDeleteSearch" type="search" placeholder="Buscar tienda o número de Z8" class="h-9 w-full rounded-lg border border-pic-border bg-pic-surface px-3 text-sm outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border" /></label>
          <StdButton size="sm" variant="secondary" :disabled="!quickDeleteVisible.length || quickDeletePreviewing" @click="toggleQuickVisible">{{ quickDeleteVisible.length && quickDeleteVisible.every(order => quickDeleteSelected.has(orderId(order))) ? 'Quitar visibles' : 'Seleccionar visibles' }}</StdButton>
        </div>
        <p class="text-xs font-semibold text-pic-text-muted">{{ quickDeleteKeys.length }} seleccionados · {{ quickDeleteVisible.length }} visibles de {{ quickDeleteCandidates.length }}</p>
        <div class="max-h-[45vh] divide-y divide-pic-border overflow-y-auto rounded-lg border border-pic-border">
          <label v-for="order in quickDeleteVisible" :key="orderId(order)" class="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-pic-brand-soft/50">
            <input type="checkbox" :checked="quickDeleteSelected.has(orderId(order))" :disabled="quickDeletePreviewing" :aria-label="`Seleccionar ${order.num_pedido} de tienda ${order.id_cliente}`" @change="toggleQuickDelete(order)" />
            <span class="min-w-0"><span class="block break-all font-mono text-xs font-bold text-pic-text-main">{{ order.num_pedido }}</span><span class="block text-[11px] text-pic-text-muted">Tienda <span class="font-mono">{{ order.id_cliente }}</span> · Creado {{ order.fec_pedido_cadena }}</span></span>
          </label>
          <p v-if="!quickDeleteVisible.length" class="px-3 py-5 text-center text-xs text-pic-text-muted">No hay Z8 que coincidan con la búsqueda.</p>
        </div>
        <div class="flex flex-wrap justify-end gap-2"><StdButton variant="secondary" @click="quickDeleteOpen = false">Cancelar</StdButton><StdButton variant="danger" :disabled="!quickDeleteKeys.length || quickDeletePreviewing" @click="previewQuickDelete">{{ quickDeletePreviewing ? 'Revisando…' : `Revisar eliminación (${quickDeleteKeys.length})` }}</StdButton></div>
      </template>
      <template v-else>
        <p class="text-xs text-pic-text-muted">Revisa todos los pedidos. Una sola orden bloqueada impide eliminar la selección completa.</p>
        <div class="max-h-[45vh] divide-y divide-pic-border overflow-y-auto rounded-lg border border-pic-border">
          <div v-for="order in manager.preview?.pedidos || []" :key="orderId(order)" class="px-3 py-2.5 text-xs"><p class="font-mono font-bold text-pic-text-main">{{ order.num_pedido }}</p><p class="text-pic-text-muted">Tienda {{ order.id_cliente }} · {{ order.lineas_fuente }} líneas fuente · {{ order.lineas_persistidas }} persistidas · Estado: {{ (order.estados_persistidos.length ? order.estados_persistidos : order.estados_fuente).join(', ') }}</p><p v-if="order.bloqueo" class="mt-1 font-semibold text-pic-danger">{{ order.bloqueo }}</p></div>
        </div>
        <div class="flex flex-wrap justify-end gap-2"><StdButton variant="secondary" @click="quickDeleteStage = 'selection'">Modificar selección</StdButton><StdButton variant="danger" :disabled="!manager.preview || manager.preview.bloqueado || manager.deleting" @click="remove">{{ manager.deleting ? 'Eliminando…' : `Eliminar ${pendingDeleteKeys.length} Z8` }}</StdButton></div>
      </template>
    </div>
  </ModalDialog>
  <ModalDialog v-model="duplicateDialog" title="Artículos ya solicitados" size="xl"><div class="space-y-3"><p class="text-sm text-pic-text-muted">Confirma que estas piezas deben volver a solicitarse.</p><div v-for="item in repeated" :key="item.sku_muliix" class="border-b border-pic-border py-2"><p class="text-sm font-bold">{{ item.sku_nombre }}</p><p v-for="prior in item.antecedentes" :key="prior.num_pedido" class="font-mono text-xs text-pic-text-muted">{{ prior.num_pedido }} · {{ prior.cantidad_efectiva }} pzas · {{ prior.fec_envio || 'sin fecha' }} · {{ prior.estado }}</p></div><div class="flex justify-end gap-2"><StdButton variant="secondary" @click="duplicateDialog = false">Cancelar</StdButton><StdButton variant="primary" @click="confirmRepeated">Confirmar y guardar</StdButton></div></div></ModalDialog>
  <CpfrZ8DeleteDialog v-model="deletionDialog" :preview="manager.preview" :deleting="manager.deleting" @confirm="remove" />
  <ModalDialog v-model="discardDialog" title="Descartar captura" size="sm"><div class="space-y-4"><p class="text-sm text-pic-text-muted">Hay cambios sin guardar. Si sales, perderás la captura.</p><div class="flex justify-end gap-2"><StdButton variant="secondary" @click="discardDialog = false">Seguir editando</StdButton><StdButton variant="danger" @click="discard">Descartar</StdButton></div></div></ModalDialog>
</template>

<style scoped>
.z8-manager-container {
  container-type: inline-size;
}

@container (min-width: 60rem) {
  .z8-manager-layout {
    grid-template-columns: clamp(28rem, 48%, 40rem) minmax(0, 1fr);
  }
}
</style>
