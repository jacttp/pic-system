<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUploadOcStore } from '../stores/uploadOcStore'

import chedrauiLogo from '@/assets/chains/chedraui.png'
import samsLogo from '@/assets/chains/sams.png'
import sorianaLogo from '@/assets/chains/soriana.png'
import walmartLogo from '@/assets/chains/walmart.png'

const store = useUploadOcStore()
const expandedOrders = ref<Set<string>>(new Set())

const chainLogos: Record<string, string> = {
  CHEDRAUI: chedrauiLogo,
  SAMS: samsLogo,
  SAM: samsLogo,
  SORIANA: sorianaLogo,
  WALMART: walmartLogo,
  GW: walmartLogo,
}

const groupedOrders = computed(() => {
  const groups: Record<string, typeof store.records> = {}
  store.records.forEach(order => {
    const key = `${order.num_pedido}_${order.id_cliente}_${order.nom_cadena}`
    if (!groups[key]) groups[key] = []
    groups[key].push(order)
  })
  return Object.entries(groups).map(([key, records]) => ({ key, records }))
})

const totalPages = () => Math.ceil(store.totalRecords / store.pagination.limit)

const handlePageChange = async (newPage: number) => {
  if (newPage < 1 || newPage > totalPages()) return
  store.pagination.page = newPage
  await store.fetchOrders()
}

const toggleExpand = (key: string) => {
  if (expandedOrders.value.has(key)) expandedOrders.value.delete(key)
  else expandedOrders.value.add(key)
}

const isExpanded = (key: string) => expandedOrders.value.has(key)

const formatDate = (dateStr?: string) => {
  if (!dateStr || dateStr.startsWith('1900-01-01')) return '--'
  const [date] = dateStr.split('T')
  const parts = date?.split('-')
  if (!parts || parts.length !== 3) return date || '--'
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

const chainName = (name?: string) => {
  const normalized = (name || '').toUpperCase()
  if (normalized === 'SAMS' || normalized === 'SAM') return "Sam's"
  if (normalized === 'GW') return 'Walmart'
  return normalized.charAt(0) + normalized.slice(1).toLowerCase()
}

const chainLogo = (name?: string) => chainLogos[(name || '').toUpperCase()] || sorianaLogo
const fileExtension = (name?: string) => ((name || '').toUpperCase() === 'SORIANA' ? '.xlsx' : '.inf')
const storeName = (order?: { nombre_tienda?: string | null; id_cliente?: string }) => {
  const name = order?.nombre_tienda?.trim()
  return name || 'Tienda sin nombre'
}

const statusClasses = (status?: string) => {
  if (status === 'aprobado') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  if (status === 'pendiente') return 'bg-amber-50 text-amber-700 border-amber-100'
  return 'bg-rose-50 text-rose-700 border-rose-100'
}
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
    <div v-if="store.isLoading" class="flex flex-1 flex-col items-center justify-center py-16 text-slate-500">
      <i class="fa-solid fa-circle-notch fa-spin mb-3 text-3xl text-brand-400"></i>
      <p class="font-bold text-slate-700">Cargando registros...</p>
    </div>

    <div v-else-if="groupedOrders.length === 0" class="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-3xl text-slate-300">
        <i class="fa-solid fa-inbox"></i>
      </div>
      <p class="text-base font-black text-slate-800">No hay órdenes de compra registradas.</p>
      <p class="mt-1 text-sm font-medium text-slate-500">Ajusta los filtros o carga un nuevo archivo.</p>
    </div>

    <template v-else>
      <div class="min-h-0 flex-1 overflow-auto">
        <table class="w-full min-w-[1080px] border-separate border-spacing-0 text-left">
          <thead class="sticky top-0 z-10 bg-white">
            <tr class="text-[11px] font-black uppercase text-slate-500">
              <th class="border-b border-slate-100 px-6 py-4">N° Pedido</th>
              <th class="border-b border-slate-100 px-4 py-4">Tienda</th>
              <th class="border-b border-slate-100 px-4 py-4">Cadena</th>
              <th class="border-b border-slate-100 px-4 py-4">Fecha Pedido</th>
              <th class="border-b border-slate-100 px-4 py-4">Fin Embarque</th>
              <th class="border-b border-slate-100 px-4 py-4">Captura</th>
              <th class="border-b border-slate-100 px-4 py-4">Estado</th>
              <th class="w-16 border-b border-slate-100 px-4 py-4"></th>
            </tr>
          </thead>

          <tbody>
            <template v-for="group in groupedOrders" :key="group.key">
              <tr class="group/row cursor-pointer transition-colors hover:bg-slate-50/70" @click="toggleExpand(group.key)">
                <td class="border-b border-slate-100 px-6 py-4">
                  <div class="flex items-center gap-3">
                    <span class="font-black text-slate-950">{{ group.records[0]?.num_pedido }}</span>
                    <span class="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">
                      {{ fileExtension(group.records[0]?.nom_cadena) }}
                    </span>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-4 py-4">
                  <div class="min-w-0">
                    <p class="max-w-[260px] truncate text-sm font-black text-slate-800">
                      {{ storeName(group.records[0]) }}
                    </p>
                    <p class="mt-0.5 font-mono text-[11px] font-semibold uppercase text-slate-400">
                      {{ group.records[0]?.id_cliente }}
                    </p>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-4 py-4">
                  <div class="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <span class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-100 bg-white p-1 shadow-sm">
                      <img :src="chainLogo(group.records[0]?.nom_cadena)" :alt="chainName(group.records[0]?.nom_cadena)" class="h-full w-full object-contain" />
                    </span>
                    {{ chainName(group.records[0]?.nom_cadena) }}
                  </div>
                </td>
                <td class="border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-700">
                  <i class="fa-regular fa-calendar-days mr-2 text-slate-400"></i>
                  {{ formatDate(group.records[0]?.fec_pedido_cadena) }}
                </td>
                <td class="border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-700">
                  <i class="fa-solid fa-truck-fast mr-2 text-slate-400"></i>
                  {{ formatDate(group.records[0]?.fec_fin_embarque) }}
                </td>
                <td class="border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-700">
                  <i class="fa-regular fa-clock mr-2 text-slate-400"></i>
                  {{ formatDate(group.records[0]?.fec_captura) }}
                </td>
                <td class="border-b border-slate-100 px-4 py-4">
                  <span
                    class="inline-flex rounded-lg border px-3 py-1.5 text-sm font-black capitalize"
                    :class="statusClasses(group.records[0]?.estado)"
                  >
                    {{ group.records[0]?.estado }}
                  </span>
                </td>
                <td class="border-b border-slate-100 px-4 py-4">
                  <button
                    class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all group-hover/row:border-brand-200 group-hover/row:text-brand-600"
                    :class="{ 'rotate-180': isExpanded(group.key) }"
                  >
                    <i class="fa-solid fa-chevron-down text-xs"></i>
                  </button>
                </td>
              </tr>

              <tr v-show="isExpanded(group.key)">
                <td colspan="8" class="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
                  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table class="w-full text-left text-sm">
                      <thead class="bg-slate-900 text-[11px] font-black uppercase text-white">
                        <tr>
                          <th class="px-5 py-3">Producto</th>
                          <th class="px-5 py-3">Código UPC</th>
                          <th class="px-5 py-3">Unidad</th>
                          <th class="px-5 py-3 text-right">Cant. Solicitada</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in group.records" :key="item.id || `${item.num_pedido}_${item.sku_cadena}`" class="border-b border-dashed border-slate-200 last:border-0">
                          <td class="px-5 py-3 font-bold text-slate-800">
                            {{ item.sku_cadena }}
                            <span v-if="item.desc_art && item.sku_cadena !== item.desc_art" class="ml-1 text-xs font-semibold text-slate-400">
                              ({{ item.desc_art }})
                            </span>
                          </td>
                          <td class="px-5 py-3 font-mono text-xs font-semibold text-slate-500">{{ item.upc_cadena }}</td>
                          <td class="px-5 py-3 font-semibold text-slate-500">{{ item.uni_com }}</td>
                          <td class="px-5 py-3 text-right">
                            <span class="inline-flex min-w-12 justify-center rounded-lg bg-brand-50 px-3 py-1.5 font-black text-brand-700">
                              {{ item.cant_pedida }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm font-medium text-slate-500">
          Mostrando 1 a {{ groupedOrders.length }} de {{ store.totalRecords }} resultados
        </p>
        <div class="flex items-center gap-2">
          <button
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-brand-200 hover:text-brand-600 disabled:opacity-40"
            :disabled="store.pagination.page === 1 || store.isLoading"
            @click="handlePageChange(store.pagination.page - 1)"
          >
            <i class="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <span class="flex h-9 min-w-9 items-center justify-center rounded-lg border border-brand-300 px-3 text-sm font-black text-brand-600">
            {{ store.pagination.page }}
          </span>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-brand-200 hover:text-brand-600 disabled:opacity-40"
            :disabled="store.pagination.page >= totalPages() || store.isLoading"
            @click="handlePageChange(store.pagination.page + 1)"
          >
            <i class="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
