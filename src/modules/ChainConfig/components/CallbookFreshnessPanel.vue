<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import StdAlert from '@/modules/Shared/components/std/StdAlert.vue'
import StdButton from '@/modules/Shared/components/std/StdButton.vue'
import { useChainConfigStore } from '../stores/chainConfigStore'
import type { ChainCallbookProductStatus, ChainCallbookStatusResponse, ChainStoreConfig } from '../types/chainConfigTypes'

interface CatalogProduct extends ChainCallbookProductStatus { nombre_producto: string }
interface ProductView extends CatalogProduct {
  freshnessStatus: Exclude<FreshnessFilter, 'TODOS'>
  reportedDisplay: string
  adjustmentDisplay: string
  effectiveDisplay: string
  lastReportedDisplay: string
  ageDisplay: string
  expirationDisplay: string
  auditDisplay: string
}
interface StoreView {
  clientId: string; storeName: string; matrix: string; manager: string; salesDay: number | null; status: FreshnessFilter
  oldestDate: string | null; oldestDateDisplay: string; products: ProductView[]; freshCount: number; expiringCount: number; staleCount: number; missingCount: number
}
type FreshnessFilter = 'TODOS' | 'FRESCO' | 'POR_VENCER' | 'VENCIDO' | 'SIN_DATOS'

const store = useChainConfigStore()
const dayLabels: Record<number, string> = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo' }
const statusMeta: Record<Exclude<FreshnessFilter, 'TODOS'>, { label: string; className: string }> = {
  FRESCO: { label: 'Fresco', className: 'border-[hsl(var(--pic-success)/0.28)] bg-[hsl(var(--pic-success)/0.08)] text-pic-success' },
  POR_VENCER: { label: 'Por vencer', className: 'border-[hsl(var(--pic-warning)/0.30)] bg-[hsl(var(--pic-warning)/0.10)] text-pic-warning' },
  VENCIDO: { label: 'Vencido', className: 'border-[hsl(var(--pic-danger)/0.28)] bg-[hsl(var(--pic-danger)/0.08)] text-pic-danger' },
  SIN_DATOS: { label: 'Sin datos', className: 'border-pic-border bg-pic-muted-surface text-pic-text-muted' },
}
const search = ref('')
const statusFilter = ref<FreshnessFilter>('TODOS')
const selectedDay = ref<number | null>(null)
const selectedStoreId = ref<string | null>(null)
const hasInitializedDay = ref(false)
const normalize = (value: string | null | undefined) => value?.trim().toUpperCase() ?? ''
const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Sin conteo'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? 'Fecha inválida' : new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
const formatQuantity = (value: number | null | undefined) => value === null || value === undefined ? '—' : new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)
const productStatus = (product: ChainCallbookProductStatus): Exclude<FreshnessFilter, 'TODOS'> => {
  if (!product.ult_fecha_reportada || product.status === 'SIN_CONTEO' || product.status === 'FECHA_FUTURA') return 'SIN_DATOS'
  if (!product.is_fresh || product.status === 'VENCIDO') return 'VENCIDO'
  return (product.days_until_expiration ?? Number.POSITIVE_INFINITY) <= 1 ? 'POR_VENCER' : 'FRESCO'
}
const operationalInventory = (product: ChainCallbookProductStatus) => {
  if (product.cantidad_efectiva !== null && product.cantidad_efectiva !== undefined) return product.cantidad_efectiva
  return product.cantidad_reportada === null || product.cantidad_reportada === undefined ? null : product.cantidad_reportada + (product.ajuste ?? 0)
}
const toProductView = (product: CatalogProduct): ProductView => ({
  ...product,
  freshnessStatus: productStatus(product),
  reportedDisplay: formatQuantity(product.cantidad_reportada),
  adjustmentDisplay: formatQuantity(product.ajuste),
  effectiveDisplay: formatQuantity(operationalInventory(product)),
  lastReportedDisplay: formatDate(product.ult_fecha_reportada),
  ageDisplay: product.age_days === null ? '—' : String(product.age_days),
  expirationDisplay: formatDate(product.expires_on),
  auditDisplay: formatDate(product.fecha_auditoria),
})
const storeViews = computed<StoreView[]>(() => {
  const storesById = new Map<string, ChainCallbookStatusResponse['stores'][number]>()
  store.callbookFreshness?.stores?.forEach((item) => storesById.set(String(item.id_cliente), item))
  return store.storeConfigs.filter((config: ChainStoreConfig) => normalize(config.Cadena) === 'SAMS').map((config) => {
    const clientId = String(config.id_cliente)
    const responseStore = storesById.get(clientId)
    const auditsBySku = new Map((responseStore?.products ?? []).map((product) => [String(product.sku), product]))
    const products: ProductView[] = store.z8Catalog
      .filter((item) => String(item.id_cliente) === clientId && normalize(item.permiso_oc) === 'Z8')
      .map((item) => {
        const audit = auditsBySku.get(String(item.sku_muliix))
        const product: CatalogProduct = audit
          ? { ...audit, nombre_producto: item.sku_nombre || 'Sin nombre en catálogo' }
          : {
              matriz: clientId, sku: String(item.sku_muliix), nombre_producto: item.sku_nombre || 'Sin nombre en catálogo',
              id_auditoria: null, cantidad_reportada: null, ajuste: null, cantidad_efectiva: null,
              ult_fecha_reportada: null, fecha_auditoria: null, status: 'SIN_CONTEO', is_fresh: false,
              age_days: null, limit_days: 0, business_date: store.callbookFreshness?.business_date ?? '',
              expires_on: null, days_until_expiration: null,
            }
        return toProductView(product)
      })
    const states = products.map((product) => product.freshnessStatus)
    const freshCount = states.filter((state) => state === 'FRESCO').length
    const expiringCount = states.filter((state) => state === 'POR_VENCER').length
    const staleCount = states.filter((state) => state === 'VENCIDO').length
    const missingCount = states.filter((state) => state === 'SIN_DATOS').length
    const dates = products.map((product) => product.ult_fecha_reportada?.slice(0, 10) ?? null).filter((date): date is string => Boolean(date)).sort()
    let status: FreshnessFilter = 'FRESCO'
    if (!products.length || missingCount === products.length) status = 'SIN_DATOS'
    else if (staleCount > 0 || missingCount > 0) status = 'VENCIDO'
    else if (expiringCount > 0) status = 'POR_VENCER'
    return {
      clientId, storeName: config.nombre_tienda || `Tienda ${clientId}`,
      matrix: clientId, manager: config.Jefatura || config.jefatura || 'Sin jefatura', salesDay: Number(config.dia_ventas) || null,
      status, oldestDate: dates[0] ?? null, oldestDateDisplay: formatDate(dates[0] ?? null), products, freshCount, expiringCount, staleCount, missingCount,
    }
  }).sort((a, b) => a.storeName.localeCompare(b.storeName, 'es'))
})
const dayOptions = computed(() => Object.entries(dayLabels).map(([value, label]) => {
  const day = Number(value)
  return { day, label, count: storeViews.value.filter((store) => store.salesDay === day).length }
}).filter((option) => option.count > 0))
const businessDay = computed(() => {
  const source = store.callbookFreshness?.business_date
  const date = source ? new Date(`${source.slice(0, 10)}T12:00:00`) : new Date()
  return date.getDay() || 7
})
const closestDay = (days: number[]) => !days.length ? null : [...days].sort((left, right) => ((left - businessDay.value + 7) % 7) - ((right - businessDay.value + 7) % 7))[0]
const filteredStores = computed(() => {
  const term = normalize(search.value)
  return storeViews.value.filter((store) => {
    const matchesStatus = statusFilter.value === 'TODOS' || store.status === statusFilter.value
    const matchesSearch = !term || [store.storeName, store.clientId, store.matrix, store.manager].some((value) => normalize(value).includes(term))
    return matchesStatus && matchesSearch
  })
})
const visibleStores = computed(() => selectedDay.value === null
  ? filteredStores.value
  : filteredStores.value.filter((store) => store.salesDay === selectedDay.value))
const selectedStore = computed(() => visibleStores.value.find((store) => store.clientId === selectedStoreId.value) ?? visibleStores.value[0] ?? null)
const summary = computed(() => ({
  fresh: storeViews.value.filter((store) => store.status === 'FRESCO').length,
  expiring: storeViews.value.filter((store) => store.status === 'POR_VENCER').length,
  stale: storeViews.value.filter((store) => store.status === 'VENCIDO').length,
  missing: storeViews.value.filter((store) => store.status === 'SIN_DATOS').length,
}))
const lastUpdated = computed(() => {
  if (!store.callbookFreshnessUpdatedAt) return 'Sin actualizar'
  const date = new Date(store.callbookFreshnessUpdatedAt)
  return Number.isNaN(date.getTime())
    ? 'Fecha inválida'
    : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
})
const businessDateDisplay = computed(() => formatDate(store.callbookFreshness?.business_date))
const selectedDayLabel = computed(() => selectedDay.value ? dayLabels[selectedDay.value] : 'Todas las tiendas')
watch(dayOptions, (options) => {
  const days = options.map((option) => option.day)
  if (!hasInitializedDay.value && days.length) {
    selectedDay.value = closestDay(days)
    hasInitializedDay.value = true
  } else if (selectedDay.value !== null && !days.includes(selectedDay.value)) {
    selectedDay.value = closestDay(days)
  }
}, { immediate: true })
watch(visibleStores, (stores) => {
  if (!stores.some((store) => store.clientId === selectedStoreId.value)) selectedStoreId.value = stores[0]?.clientId ?? null
}, { immediate: true })
</script>

<template>
  <section class="space-y-4 font-sans text-pic-text-main">
    <header class="relative overflow-hidden rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm shadow-slate-100 sm:p-5">
      <span class="absolute inset-y-0 left-0 w-1 bg-pic-brand"></span>
      <div class="flex flex-col gap-4 pl-1 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-brand">Cadena Sams · Control operativo</p>
          <div class="mt-1 flex items-center gap-2.5">
            <span class="flex size-9 items-center justify-center rounded-lg bg-pic-brand-soft text-pic-brand"><i class="fa-solid fa-clock-rotate-left"></i></span>
            <div>
              <h2 class="text-lg font-extrabold tracking-tight text-pic-text-main">Frescura Sellout</h2>
              <p class="text-xs font-medium text-pic-text-muted">Conteo Callbook que alimenta inventario y sellout triangulado.</p>
            </div>
          </div>
          <p class="mt-3 text-xs font-medium text-pic-text-muted">Fecha de negocio <span class="font-semibold text-pic-text-main">{{ businessDateDisplay }}</span><span class="mx-1.5 text-pic-border">·</span>Actualizado {{ lastUpdated }}</p>
        </div>
        <StdButton size="sm" icon="fa-solid fa-rotate" :disabled="store.loadingCallbookFreshness" @click="store.fetchCallbookFreshness">
          {{ store.loadingCallbookFreshness ? 'Actualizando…' : 'Actualizar' }}
        </StdButton>
      </div>
    </header>

    <StdAlert title="Indicador operativo de Callbook" description="Esta consulta no certifica el sellout semanal ni modifica pedidos. Muestra la frescura del conteo que alimenta el inventario y el sellout triangulado." tone="info" />

    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div class="border-l-2 border-[hsl(var(--pic-success))] bg-[hsl(var(--pic-success)/0.06)] px-3 py-2.5"><p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-success">Frescas</p><p class="mt-1 font-mono text-xl font-bold tabular-nums text-pic-text-main">{{ summary.fresh }}</p></div>
      <div class="border-l-2 border-[hsl(var(--pic-warning))] bg-[hsl(var(--pic-warning)/0.07)] px-3 py-2.5"><p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-warning">Por vencer</p><p class="mt-1 font-mono text-xl font-bold tabular-nums text-pic-text-main">{{ summary.expiring }}</p></div>
      <div class="border-l-2 border-[hsl(var(--pic-danger))] bg-[hsl(var(--pic-danger)/0.06)] px-3 py-2.5"><p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-danger">Vencidas</p><p class="mt-1 font-mono text-xl font-bold tabular-nums text-pic-text-main">{{ summary.stale }}</p></div>
      <div class="border-l-2 border-pic-border bg-pic-muted-surface px-3 py-2.5"><p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-text-muted">Sin datos</p><p class="mt-1 font-mono text-xl font-bold tabular-nums text-pic-text-main">{{ summary.missing }}</p></div>
    </div>

    <div class="flex flex-col gap-2 rounded-xl border border-pic-border bg-pic-surface p-3 sm:flex-row sm:items-center">
      <label class="relative min-w-0 flex-1"><i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i><input v-model="search" type="search" placeholder="Buscar tienda, matriz, jefatura o clave" class="h-10 w-full rounded-lg border border-pic-border bg-pic-surface pl-8 pr-3 text-sm font-semibold text-pic-text-main outline-none transition hover:bg-pic-muted-surface focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border"></label>
      <div class="flex gap-1 overflow-x-auto pb-0.5" aria-label="Filtrar por estado">
        <button v-for="status in (['TODOS', 'FRESCO', 'POR_VENCER', 'VENCIDO', 'SIN_DATOS'] as FreshnessFilter[])" :key="status" type="button" class="shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-bold transition" :class="statusFilter === status ? 'border-pic-brand bg-pic-brand text-white' : 'border-pic-border bg-pic-surface text-pic-text-muted hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand'" @click="statusFilter = status">{{ status === 'TODOS' ? 'Todos' : statusMeta[status].label }}</button>
      </div>
    </div>

    <StdAlert v-if="store.callbookFreshnessError" title="No fue posible consultar la frescura" :description="store.callbookFreshnessError" tone="danger" />
    <div v-else-if="store.loadingCallbookFreshness && !store.callbookFreshness" class="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-pic-border bg-pic-surface text-sm font-medium text-pic-text-muted"><i class="fa-solid fa-spinner mr-2 animate-spin text-pic-brand"></i>Consultando auditoría Callbook…</div>
    <div v-else-if="!storeViews.length" class="rounded-xl border border-dashed border-pic-border bg-pic-surface px-5 py-10 text-center"><i class="fa-solid fa-store-slash text-xl text-pic-text-muted"></i><p class="mt-2 text-sm font-bold text-pic-text-main">No hay tiendas Sams configuradas</p><p class="mt-1 text-xs font-medium text-pic-text-muted">La vista conserva visibles las tiendas Sams aunque no tengan catálogo Z8 o auditoría.</p></div>

    <template v-else>
      <nav class="flex gap-1 overflow-x-auto rounded-xl border border-pic-border bg-pic-muted-surface p-1.5" aria-label="Día de venta o pedido">
        <button v-for="option in dayOptions" :key="option.day" type="button" class="min-w-24 shrink-0 rounded-lg px-3 py-2 text-left transition" :aria-pressed="selectedDay === option.day" :class="selectedDay === option.day ? 'bg-pic-brand text-white shadow-sm' : 'text-pic-text-muted hover:bg-pic-surface hover:text-pic-brand'" @click="selectedDay = selectedDay === option.day ? null : option.day"><span class="block text-xs font-bold">{{ option.label }}</span><span class="mt-0.5 block font-mono text-[10px] tabular-nums" :class="selectedDay === option.day ? 'text-white/75' : 'text-pic-text-muted'">{{ option.count }} tienda{{ option.count === 1 ? '' : 's' }}</span></button>
      </nav>

      <div v-if="!visibleStores.length" class="rounded-xl border border-dashed border-pic-border bg-pic-surface px-5 py-10 text-center text-sm font-medium text-pic-text-muted">No hay tiendas de {{ selectedDayLabel }} con los filtros actuales.</div>
      <div v-else class="grid overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm shadow-slate-100 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,2fr)]">
        <aside class="border-b border-pic-border bg-pic-muted-surface lg:max-h-[42rem] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div class="sticky top-0 z-10 border-b border-pic-border bg-pic-muted-surface px-3 py-2.5"><p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-text-muted">{{ selectedDayLabel }} · {{ visibleStores.length }} tienda{{ visibleStores.length === 1 ? '' : 's' }}</p></div>
          <button v-for="storeView in visibleStores" :key="storeView.clientId" type="button" class="w-full border-b border-pic-border px-3 py-3 text-left transition last:border-b-0" :class="selectedStore?.clientId === storeView.clientId ? 'bg-pic-brand-soft text-pic-brand shadow-[inset_4px_0_0_0_hsl(var(--pic-brand))]' : 'text-pic-text-main hover:bg-pic-brand-soft'" @click="selectedStoreId = storeView.clientId">
            <div class="flex items-start justify-between gap-2"><div class="min-w-0"><p class="truncate text-xs font-bold">{{ storeView.storeName }}</p><p class="mt-0.5 font-mono text-[10px] text-pic-text-muted">{{ storeView.clientId }} <span v-if="storeView.matrix !== '—'">· {{ storeView.matrix }}</span></p></div><span class="shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold" :class="statusMeta[storeView.status].className">{{ statusMeta[storeView.status].label }}</span></div>
            <div class="mt-2 flex items-center justify-between gap-2 text-[10px] font-medium text-pic-text-muted"><span class="truncate">{{ storeView.manager }}</span><span class="shrink-0 font-mono">{{ storeView.oldestDateDisplay }}</span></div>
          </button>
        </aside>

        <article v-if="selectedStore" class="min-w-0 bg-pic-surface">
          <header class="border-b border-pic-border px-4 py-3 sm:px-5"><div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p class="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-pic-text-muted">{{ selectedStore.clientId }} <span v-if="selectedStore.matrix !== '—'">· {{ selectedStore.matrix }}</span></p><h3 class="mt-0.5 text-sm font-bold text-pic-text-main">{{ selectedStore.storeName }}</h3><p class="mt-1 text-xs font-medium text-pic-text-muted">{{ selectedStore.manager }} · Fecha mínima: {{ selectedStore.oldestDateDisplay }}</p></div><span class="w-fit rounded-md border px-2 py-1 text-[10px] font-bold" :class="statusMeta[selectedStore.status].className">{{ statusMeta[selectedStore.status].label }}</span></div><div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-pic-text-muted"><span><b class="font-mono text-pic-success">{{ selectedStore.freshCount }}</b> frescos</span><span><b class="font-mono text-pic-warning">{{ selectedStore.expiringCount }}</b> por vencer</span><span><b class="font-mono text-pic-danger">{{ selectedStore.staleCount }}</b> vencidos</span><span><b class="font-mono text-pic-text-main">{{ selectedStore.missingCount }}</b> sin conteo</span></div></header>
          <div v-if="!selectedStore.products.length" class="px-5 py-12 text-center"><i class="fa-solid fa-box-open text-xl text-pic-text-muted"></i><p class="mt-2 text-sm font-bold text-pic-text-main">Sin catálogo Z8 disponible</p><p class="mt-1 text-xs font-medium text-pic-text-muted">La tienda permanece visible para evidenciar que no se encontró producto resurtible.</p></div>
          <div v-else class="max-h-[34rem] overflow-auto"><table class="min-w-[940px] w-full text-left text-xs"><thead class="sticky top-0 z-10 border-b border-pic-border bg-pic-muted-surface text-[10px] font-bold uppercase tracking-[0.14em] text-pic-text-muted"><tr><th class="px-4 py-2.5">SKU / producto</th><th class="px-3 py-2.5 text-right">Reportada</th><th class="px-3 py-2.5 text-right">Ajuste</th><th class="px-3 py-2.5 text-right">Existencia</th><th class="px-3 py-2.5">Último conteo</th><th class="px-3 py-2.5 text-center">Antigüedad</th><th class="px-3 py-2.5">Caduca</th><th class="px-3 py-2.5">Auditoría</th><th class="px-3 py-2.5">Estado</th></tr></thead><tbody class="divide-y divide-pic-border"><tr v-for="product in selectedStore.products" :key="`${selectedStore.clientId}-${product.sku}`" class="transition hover:bg-pic-brand-soft"><td class="px-4 py-2.5"><p class="font-mono text-[11px] font-bold text-pic-text-main">{{ product.sku }}</p><p class="mt-0.5 max-w-56 truncate text-[11px] font-medium text-pic-text-muted" :title="product.nombre_producto">{{ product.nombre_producto }}</p></td><td class="px-3 py-2.5 text-right font-mono tabular-nums text-pic-text-main">{{ product.reportedDisplay }}</td><td class="px-3 py-2.5 text-right font-mono tabular-nums text-pic-text-main">{{ product.adjustmentDisplay }}</td><td class="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-pic-text-main">{{ product.effectiveDisplay }}</td><td class="px-3 py-2.5 whitespace-nowrap font-medium text-pic-text-muted">{{ product.lastReportedDisplay }}</td><td class="px-3 py-2.5 text-center font-mono tabular-nums text-pic-text-main">{{ product.ageDisplay }}</td><td class="px-3 py-2.5 whitespace-nowrap font-medium text-pic-text-muted">{{ product.expirationDisplay }}</td><td class="px-3 py-2.5 whitespace-nowrap font-medium text-pic-text-muted">{{ product.auditDisplay }}</td><td class="px-3 py-2.5"><span class="whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-bold" :class="statusMeta[product.freshnessStatus].className">{{ statusMeta[product.freshnessStatus].label }}</span></td></tr></tbody></table></div>
        </article>
      </div>
    </template>
  </section>
</template>
