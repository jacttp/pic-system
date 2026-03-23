<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUploadOcStore } from '../stores/uploadOcStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const store = useUploadOcStore()

const activeDateType = ref<'pedido' | 'embarque' | 'captura' | 'none'>('none')

const setDateType = (type: 'pedido' | 'embarque' | 'captura' | 'none') => {
  activeDateType.value = type
  
  store.filters.fecPedidoInicio = ''
  store.filters.fecPedidoFin = ''
  store.filters.fecEmbarqueInicio = ''
  store.filters.fecEmbarqueFin = ''
  store.filters.fecCapturaInicio = ''
  store.filters.fecCapturaFin = ''
  
  if (type === 'none') {
    applyFilters()
  }
}

const estadoLocal = computed(() => store.filters.estado || 'todos')

const setEstado = (val: string) => {
  store.filters.estado = val === 'todos' ? '' : val as any
  applyFilters()
}

// Mapeos bidireccionales
const dateStart = computed({
  get() {
    if (activeDateType.value === 'pedido') return store.filters.fecPedidoInicio || ''
    if (activeDateType.value === 'embarque') return store.filters.fecEmbarqueInicio || ''
    if (activeDateType.value === 'captura') return store.filters.fecCapturaInicio || ''
    return ''
  },
  set(val: string) {
    if (activeDateType.value === 'pedido') store.filters.fecPedidoInicio = val
    else if (activeDateType.value === 'embarque') store.filters.fecEmbarqueInicio = val
    else if (activeDateType.value === 'captura') store.filters.fecCapturaInicio = val
  }
})

const dateEnd = computed({
  get() {
    if (activeDateType.value === 'pedido') return store.filters.fecPedidoFin || ''
    if (activeDateType.value === 'embarque') return store.filters.fecEmbarqueFin || ''
    if (activeDateType.value === 'captura') return store.filters.fecCapturaFin || ''
    return ''
  },
  set(val: string) {
    if (activeDateType.value === 'pedido') store.filters.fecPedidoFin = val
    else if (activeDateType.value === 'embarque') store.filters.fecEmbarqueFin = val
    else if (activeDateType.value === 'captura') store.filters.fecCapturaFin = val
  }
})

const applyFilters = async () => {
  store.pagination.page = 1
  await store.fetchOrders()
}

const clearFilters = async () => {
  store.filters.numPedido = ''
  store.filters.estado = ''
  setDateType('none')
  store.pagination.page = 1
  await store.fetchOrders()
}
</script>

<template>
  <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4">
    
    <!-- Row 1: Search & Status Tags -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="relative w-full md:w-72 shadow-sm rounded-full">
        <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-2.5 text-slate-400"></i>
        <Input 
          v-model="store.filters.numPedido" 
          placeholder="No. Pedido..." 
          class="pl-10 h-9 border-slate-200 bg-slate-50/80 rounded-full focus-visible:ring-blue-500 text-sm font-medium" 
          @keyup.enter="applyFilters" 
        />
      </div>

      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
        <span class="text-[10px] font-bold text-slate-400 tracking-wider uppercase mr-2"><i class="fa-solid fa-eye mr-1"></i> MOSTRAR ESTATUS:</span>
        <button @click="setEstado('todos')" :class="estadoLocal === 'todos' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'" class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200">Todos</button>
        <button @click="setEstado('pendiente')" :class="estadoLocal === 'pendiente' ? 'bg-amber-100 text-amber-700 border-amber-200 border shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'" class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200">Pendiente</button>
        <button @click="setEstado('procesado')" :class="estadoLocal === 'procesado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 border shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'" class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200">Procesado</button>
        <button @click="setEstado('invalido')" :class="estadoLocal === 'invalido' ? 'bg-rose-100 text-rose-700 border-rose-200 border shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'" class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200">Inválido</button>
      </div>
    </div>

    <!-- Separator -->
    <div class="h-px w-full bg-slate-100"></div>

    <!-- Row 2: Date Filters & Actions -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      
      <div class="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
        <div class="flex items-center gap-3">
          <span class="text-[10px] font-bold text-slate-400 tracking-wider uppercase"><i class="fa-regular fa-calendar-days text-sm mr-1"></i> TIPO FECHA:</span>
          
          <div class="flex items-center bg-slate-100/80 rounded-lg p-1 border border-slate-200/60 shadow-inner">
             <button @click="setDateType('none')" :class="activeDateType === 'none' ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'" class="px-3 py-1 rounded-md text-xs transition-all">Ninguna</button>
             <button @click="setDateType('pedido')" :class="activeDateType === 'pedido' ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'" class="px-3 py-1 rounded-md text-xs transition-all">Pedido Cadena</button>
             <button @click="setDateType('embarque')" :class="activeDateType === 'embarque' ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-indigo-700 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'" class="px-3 py-1 rounded-md text-xs transition-all">Fin Embarque</button>
          </div>
        </div>

        <div v-show="activeDateType !== 'none'" class="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300 ml-2">
          <Input type="date" v-model="dateStart" class="h-8 text-xs w-[125px] border-slate-200 bg-white font-medium shadow-sm" />
          <span class="text-xs text-slate-400 font-bold font-mono">...</span>
          <Input type="date" v-model="dateEnd" class="h-8 text-xs w-[125px] border-slate-200 bg-white font-medium shadow-sm" />
        </div>
      </div>

      <div class="flex items-center gap-3 w-full md:w-auto justify-end">
        <button class="text-[11px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors" @click="clearFilters">Limpiar Todo</button>
        <Button size="sm" class="h-9 bg-slate-800 hover:bg-slate-900 border border-slate-700 shadow-md font-bold px-5 rounded-full transition-all" @click="applyFilters">
           FILTRAR <i class="fa-solid fa-arrow-right ml-2 text-[10px]"></i>
        </Button>
      </div>

    </div>
  </div>
</template>
