import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { cpfrApi } from '../services/cpfrApi'
import type { Z8CalendarOrder, Z8CatalogItem, Z8ExtraCreateInput, Z8ExtraUpdateInput, Z8ManagerOrder, Z8ManagerStore, Z8OrderKey, Z8Tipo } from '../types/cpfrZ8ManagerTypes'

export const useCpfrZ8ManagerStore = defineStore('cpfrZ8Manager', () => {
  const stores = ref<Z8ManagerStore[]>([])
  const catalog = ref<Z8CatalogItem[]>([])
  const calendar = ref<Z8CalendarOrder[]>([])
  const detail = ref<Z8ManagerOrder | null>(null)
  const loadingStores = ref(false)
  const loadingDetail = ref(false)
  const saving = ref(false)
  const deleting = ref(false)
  const error = ref<string | null>(null)
  const selectedStore = ref<Z8ManagerStore | null>(null)
  const context = ref<{ year: number; week: number; nom_cadena: string; dia?: number }>({ year: 0, week: 0, nom_cadena: 'soriana' })
  const hasData = computed(() => stores.value.length > 0)

  async function loadStores(next: typeof context.value) {
    context.value = next; loadingStores.value = true; error.value = null
    try { stores.value = await cpfrApi.getZ8ManagerStores({ ...next, filters: { dia: next.dia } }) }
    catch (err: any) { error.value = err?.response?.data?.message ?? 'No fue posible cargar las tiendas Z8.' }
    finally { loadingStores.value = false }
  }
  async function selectStore(store: Z8ManagerStore, month = new Date().getMonth() + 1) {
    selectedStore.value = store; loadingDetail.value = true; error.value = null
    try { calendar.value = await cpfrApi.getZ8ManagerCalendar({ id_cliente: store.id_cliente, year: context.value.year, month }) }
    catch (err: any) { error.value = err?.response?.data?.message ?? 'No fue posible cargar el calendario.' }
    finally { loadingDetail.value = false }
  }
  async function loadCatalog(tipo: Z8Tipo, numPedido?: string) {
    if (!selectedStore.value) return
    loadingDetail.value = true
    try { catalog.value = await cpfrApi.getZ8ManagerCatalog({ id_cliente: selectedStore.value.id_cliente, nom_cadena: context.value.nom_cadena, year: context.value.year, week: context.value.week, tipo, num_pedido: numPedido }) }
    finally { loadingDetail.value = false }
  }
  async function loadOrder(key: Z8OrderKey) { loadingDetail.value = true; try { detail.value = await cpfrApi.getZ8ManagerOrder(key) } finally { loadingDetail.value = false } }
  async function createExtra(payload: Z8ExtraCreateInput) { saving.value = true; error.value = null; try { const order = await cpfrApi.createZ8Extra(payload); detail.value = order; await loadStores(context.value); return order } catch (err: any) { error.value = err?.response?.data?.message ?? 'No se pudo crear el extraordinario.'; throw err } finally { saving.value = false } }
  async function updateExtra(payload: Z8ExtraUpdateInput) { saving.value = true; error.value = null; try { const order = await cpfrApi.updateZ8Extra(payload); detail.value = order; await loadStores(context.value); return order } catch (err: any) { error.value = err?.response?.data?.message ?? 'No se pudo editar el extraordinario.'; throw err } finally { saving.value = false } }
  async function removeExtra(key: Z8OrderKey) { deleting.value = true; try { const result = await cpfrApi.deleteZ8Extra(key); detail.value = null; await loadStores(context.value); if (selectedStore.value) await selectStore(selectedStore.value); return result } finally { deleting.value = false } }
  return { stores, catalog, calendar, detail, selectedStore, context, loadingStores, loadingDetail, saving, deleting, error, hasData, loadStores, selectStore, loadCatalog, loadOrder, createExtra, updateExtra, removeExtra }
})
