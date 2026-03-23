<script setup lang="ts">
import { useUploadOcStore } from '../stores/uploadOcStore'
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'

const store = useUploadOcStore()

const handlePageChange = async (newPage: number) => {
  if (newPage < 1 || newPage > totalPages()) return
  store.pagination.page = newPage
  await store.fetchOrders()
}

const totalPages = () => Math.ceil(store.totalRecords / store.pagination.limit)

// Reactive tracking of expanded orders
const expandedOrders = ref<Set<string>>(new Set())

const toggleExpand = (num_pedido: string) => {
  if (expandedOrders.value.has(num_pedido)) {
    expandedOrders.value.delete(num_pedido)
  } else {
    expandedOrders.value.add(num_pedido)
  }
}

const isExpanded = (num_pedido: string) => expandedOrders.value.has(num_pedido)

// Group stores records
const groupedOrders = computed(() => {
  const groups: Record<string, typeof store.records> = {}
  store.records.forEach(order => {
    const key = `${order.num_pedido}_${order.id_cliente}`
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(order)
  })
  return Object.values(groups)
})

const formatDate = (dateStr?: string) => {
  if (!dateStr || dateStr.startsWith('1900-01-01')) return '--'
  return dateStr.split('T')[0]
}
</script>

<template>
  <div class="flex flex-col h-full rounded-md border bg-slate-50 relative">
    <div class="flex-1 overflow-auto p-4 space-y-4">
      <div v-if="store.isLoading" class="flex flex-col items-center justify-center py-12 text-slate-500">
        <i class="fa-solid fa-circle-notch fa-spin text-3xl mb-3"></i>
        <p class="font-medium text-slate-600">Cargando registros...</p>
      </div>
      
      <div v-else-if="groupedOrders.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
        <i class="fa-solid fa-inbox text-4xl mb-3 text-slate-300"></i>
        <p class="text-slate-500 font-medium">No hay órdenes de compra registradas.</p>
      </div>

      <div v-for="group in groupedOrders" :key="group[0]?.num_pedido + '_' + group[0]?.id_cliente" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-200 hover:shadow-md" v-else>
        <!-- Group Header -->
        <div class="px-6 py-4 cursor-pointer flex items-center justify-between hover:bg-slate-50/80 transition-colors" @click="toggleExpand(group[0]?.num_pedido)">
          <div class="flex items-center gap-8">
            <div class="flex flex-col">
              <span class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">No. Pedido</span>
              <span class="font-bold text-slate-800 text-base">{{ group[0]?.num_pedido }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Tienda</span>
              <span class="font-semibold text-slate-700 text-sm"><i class="fa-solid fa-store text-slate-400 mr-1.5"></i>{{ group[0]?.id_cliente }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Fecha Pedido</span>
              <span class="font-medium text-slate-600 text-sm"><i class="fa-regular fa-calendar text-slate-400 mr-1.5"></i>{{ formatDate(group[0]?.fec_pedido_cadena) }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Fin Embarque</span>
              <span class="font-medium text-slate-600 text-sm"><i class="fa-solid fa-truck-fast text-slate-400 mr-1.5"></i>{{ formatDate(group[0]?.fec_fin_embarque) }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Captura</span>
              <span class="font-medium text-slate-600 text-sm"><i class="fa-solid fa-clock text-slate-400 mr-1.5"></i>{{ formatDate(group[0]?.fec_captura) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-6">
            <div class="flex flex-col items-end">
              <span class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Estado</span>
              <span 
                :class="{
                  'bg-emerald-100 text-emerald-700 border border-emerald-200': group[0]?.estado === 'procesado',
                  'bg-amber-100 text-amber-700 border border-amber-200': group[0]?.estado === 'pendiente',
                  'bg-rose-100 text-rose-700 border border-rose-200': group[0]?.estado === 'caducado' || group[0]?.estado === 'invalido'
                }" 
                class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">
                {{ group[0]?.estado }}
              </span>
            </div>
            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 transition-transform duration-200" :class="{'rotate-180': isExpanded(group[0]?.num_pedido)}">
              <i class="fa-solid fa-chevron-down text-sm"></i>
            </div>
          </div>
        </div>

        <!-- Expanded Details Grid -->
        <div v-show="isExpanded(group[0]?.num_pedido)" class="border-t border-slate-100 bg-slate-50/50 p-6">
          <div class="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="text-xs text-slate-50 bg-slate-800 uppercase font-semibold">
                <tr>
                  <th scope="col" class="px-5 py-3 tracking-wide">Producto</th>
                  <th scope="col" class="px-5 py-3 tracking-wide">Código UPC</th>
                  <th scope="col" class="px-5 py-3 tracking-wide">Unidad</th>
                  <th scope="col" class="px-5 py-3 text-right tracking-wide">Cant. Solicitada</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in group" :key="item.id" class="border-b border-dashed border-slate-200 last:border-0 hover:bg-white transition-colors">
                  <td class="px-5 py-3 font-medium text-slate-700">{{ item.sku_cadena }} <span v-if="item.desc_art && item.sku_cadena !== item.desc_art" class="text-slate-400 text-xs font-normal ml-1">({{ item.desc_art }})</span></td>
                  <td class="px-5 py-3 text-slate-500 font-mono text-xs">{{ item.upc_cadena }}</td>
                  <td class="px-5 py-3 text-slate-500">{{ item.uni_com }}</td>
                  <td class="px-5 py-3 text-right">
                    <span class="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-md min-w-10">
                      {{ item.cant_pedida }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination Footer -->
    <div class="flex items-center justify-between px-6 py-4 border-t bg-white rounded-b-md">
      <div class="text-sm text-slate-500 font-medium">
        Mostrando <span class="text-slate-700 font-semibold">{{ store.records.length }}</span> de <span class="text-slate-700 font-semibold">{{ store.totalRecords }}</span> líneas
      </div>
      <div class="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          class="font-medium text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
          :disabled="store.pagination.page === 1 || store.isLoading"
          @click="handlePageChange(store.pagination.page - 1)"
        >
          <i class="fa-solid fa-chevron-left mr-1.5 text-xs"></i> Anterior
        </Button>
        <div class="flex items-center px-4 text-sm font-semibold text-slate-700 bg-slate-50 rounded-md border border-slate-100">
          {{ store.pagination.page }} / {{ totalPages() || 1 }}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          class="font-medium text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
          :disabled="store.pagination.page >= totalPages() || store.isLoading"
          @click="handlePageChange(store.pagination.page + 1)"
        >
          Siguiente <i class="fa-solid fa-chevron-right ml-1.5 text-xs"></i>
        </Button>
      </div>
    </div>
  </div>
</template>