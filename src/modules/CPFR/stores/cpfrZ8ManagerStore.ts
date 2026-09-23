import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { cpfrApi } from '../services/cpfrApi'
import type { Z8CatalogItem, Z8DeletePreview, Z8ExtraCreateInput, Z8ExtraUpdateInput, Z8ManagerCalendar, Z8ManagerOrder, Z8ManagerStore, Z8OrderKey, Z8Tipo } from '../types/cpfrZ8ManagerTypes'

export const useCpfrZ8ManagerStore = defineStore('cpfrZ8Manager', () => {
  const stores = ref<Z8ManagerStore[]>([])
  const catalog = ref<Z8CatalogItem[]>([])
  const calendar = ref<Z8ManagerCalendar | null>(null)
  const detail = ref<Z8ManagerOrder | null>(null)
  const orderDetails = ref<Record<string, Z8ManagerOrder>>({})
  const loadingOrderKeys = ref<Record<string, boolean>>({})
  const preview = ref<Z8DeletePreview | null>(null)
  const selectedDay = ref('')
  const selectedStore = ref<Z8ManagerStore | null>(null)
  const loadingCalendar = ref(false)
  const loadingStores = ref(false)
  const loadingDetail = ref(false)
  const saving = ref(false)
  const deleting = ref(false)
  const error = ref<string | null>(null)
  const context = computed(() => ({ year: calendar.value?.context.isoYear || 0, week: calendar.value?.context.isoWeek || 0, nom_cadena: 'soriana', today: calendar.value?.context.today || '', weekEnd: calendar.value?.context.weekEnd || '' }))
  const hasData = computed(() => stores.value.length > 0)
  let calendarRequest = 0, storeRequest = 0, orderGeneration = 0
  const orderId = (key: Z8OrderKey) => `${key.id_cliente}|${key.num_pedido}|${key.fec_pedido_cadena}`

  async function loadCalendar(filters?: { id_cliente?: string; jefatura?: string; nombre_tienda?: string }) {
    const seq = ++calendarRequest; loadingCalendar.value = true; error.value = null
    try {
      const result = await cpfrApi.getZ8ManagerCalendar({ nom_cadena: 'soriana', filters })
      if (seq !== calendarRequest) return
      calendar.value = result
      if (!selectedDay.value || selectedDay.value < result.context.weekStart || selectedDay.value > result.context.weekEnd) selectedDay.value = result.context.today
      await loadStores(selectedDay.value, filters)
    } catch (err: any) { if (seq === calendarRequest) error.value = err?.response?.data?.message ?? 'No fue posible cargar el calendario Z8.' }
    finally { if (seq === calendarRequest) loadingCalendar.value = false }
  }
  async function loadStores(day = selectedDay.value, filters?: { id_cliente?: string; jefatura?: string; nombre_tienda?: string }) {
    const seq = ++storeRequest; selectedDay.value = day; loadingStores.value = true; error.value = null
    try {
      const result = await cpfrApi.getZ8ManagerStores({ nom_cadena: 'soriana', fecha_seleccionada: day, filters })
      if (seq !== storeRequest) return
      stores.value = result
      if (selectedStore.value) {
        selectedStore.value = result.find(row => row.id_cliente === selectedStore.value?.id_cliente) || null
        if (!selectedStore.value) {
          ++orderGeneration; detail.value = null; orderDetails.value = {}; loadingOrderKeys.value = {}
        }
      } else { ++orderGeneration; detail.value = null; orderDetails.value = {}; loadingOrderKeys.value = {} }
    } catch (err: any) { if (seq === storeRequest) error.value = err?.response?.data?.message ?? 'No fue posible cargar las tiendas.' }
    finally { if (seq === storeRequest) loadingStores.value = false }
  }
  function selectStore(store: Z8ManagerStore) { ++orderGeneration; selectedStore.value = store; detail.value = null; orderDetails.value = {}; loadingOrderKeys.value = {} }
  function clearSelection() { ++orderGeneration; selectedStore.value = null; detail.value = null; orderDetails.value = {}; loadingOrderKeys.value = {} }
  async function loadCatalog(tipo: Z8Tipo, numPedido?: string) {
    if (!selectedStore.value) return
    loadingDetail.value = true
    try { catalog.value = await cpfrApi.getZ8ManagerCatalog({ id_cliente: selectedStore.value.id_cliente, nom_cadena: 'soriana', year: context.value.year, week: context.value.week, tipo, num_pedido: numPedido }) }
    finally { loadingDetail.value = false }
  }
  async function loadOrder(key: Z8OrderKey) {
    const id = orderId(key), generation = orderGeneration
    if (loadingOrderKeys.value[id]) return
    loadingOrderKeys.value = { ...loadingOrderKeys.value, [id]: true }
    try {
      const result = await cpfrApi.getZ8ManagerOrder(key)
      if (generation !== orderGeneration) return
      orderDetails.value = { ...orderDetails.value, [id]: result }
      detail.value = result
    } finally {
      if (generation === orderGeneration) {
        const next = { ...loadingOrderKeys.value }; delete next[id]; loadingOrderKeys.value = next
      }
    }
  }
  async function refresh() { const key = detail.value; await loadCalendar(); if (key) await loadOrder(key) }
  async function createExtra(payload: Z8ExtraCreateInput) {
    saving.value = true; error.value = null
    try { const order = await cpfrApi.createZ8Extra(payload); await loadCalendar(); return order }
    catch (err: any) { error.value = err?.response?.data?.message ?? 'No se pudo crear el extraordinario.'; throw err }
    finally { saving.value = false }
  }
  async function updateExtra(payload: Z8ExtraUpdateInput) {
    saving.value = true; error.value = null
    try { const order = await cpfrApi.updateZ8Extra(payload); const next = { ...orderDetails.value }; delete next[orderId(payload)]; orderDetails.value = next; await loadCalendar(); return order }
    catch (err: any) { error.value = err?.response?.data?.message ?? 'No se pudo editar el extraordinario.'; throw err }
    finally { saving.value = false }
  }
  async function previewDelete(keys: Z8OrderKey[]) { preview.value = await cpfrApi.previewZ8ManagedDelete(keys); return preview.value }
  async function removeOrders(keys: Z8OrderKey[]) {
    if (!preview.value) throw new Error('Primero consulta la vista previa.')
    deleting.value = true
    try { const result = await cpfrApi.deleteZ8Managed(keys, preview.value.preview_token); preview.value = null; detail.value = null; const next = { ...orderDetails.value }; for (const key of keys) delete next[orderId(key)]; orderDetails.value = next; await loadCalendar(); return result }
    finally { deleting.value = false }
  }
  async function generateTraditional(store: Z8ManagerStore) {
    if (!store.fecha_atencion) throw new Error('La tienda no tiene día oficial configurado.')
    const result = await cpfrApi.generateZ8TraditionalForStore(store.id_cliente)
    await loadCalendar(); return result
  }
  return { stores, catalog, calendar, detail, orderDetails, loadingOrderKeys, preview, selectedDay, selectedStore, context, loadingCalendar, loadingStores, loadingDetail, saving, deleting, error, hasData, loadCalendar, loadStores, selectStore, clearSelection, loadCatalog, loadOrder, refresh, createExtra, updateExtra, previewDelete, removeOrders, generateTraditional }
})
