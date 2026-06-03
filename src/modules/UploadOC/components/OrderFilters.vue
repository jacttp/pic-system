<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUploadOcStore } from '../stores/uploadOcStore'

const store = useUploadOcStore()

const activeDateType = ref<'pedido' | 'embarque' | 'captura' | 'none'>('none')

const estadoLocal = computed(() => store.filters.estado || 'todos')

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

const setEstado = (val: string) => {
  store.filters.estado = val === 'todos' ? '' : val as any
  applyFilters()
}

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
  store.filters.fecPedidoInicio = ''
  store.filters.fecPedidoFin = ''
  store.filters.fecEmbarqueInicio = ''
  store.filters.fecEmbarqueFin = ''
  store.filters.fecCapturaInicio = ''
  store.filters.fecCapturaFin = ''
  activeDateType.value = 'none'
  store.pagination.page = 1
  await store.fetchOrders()
}
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
    <div class="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div class="relative w-full lg:w-[300px]">
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <Input
          v-model="store.filters.numPedido"
          placeholder="Buscar por N° de pedido..."
          class="h-12 rounded-lg border-slate-200 bg-white pl-12 text-sm font-semibold text-slate-700 shadow-sm placeholder:text-slate-400 focus-visible:ring-brand-100"
          @keyup.enter="applyFilters"
        />
      </div>

      <div class="flex w-full flex-wrap items-center gap-2 lg:w-auto">
        <span class="mr-2 text-sm font-black text-slate-700">Mostrar estado:</span>
        <button
          class="h-9 rounded-lg border px-4 text-sm font-black transition-all"
          :class="estadoLocal === 'todos' ? 'border-brand-200 bg-brand-50 text-brand-600' : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'"
          @click="setEstado('todos')"
        >
          Todos
        </button>
        <button
          class="h-9 rounded-lg border px-4 text-sm font-black transition-all"
          :class="estadoLocal === 'pendiente' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-transparent bg-amber-50/70 text-amber-700 hover:bg-amber-100'"
          @click="setEstado('pendiente')"
        >
          Pendiente
        </button>
        <button
          class="h-9 rounded-lg border px-4 text-sm font-black transition-all"
          :class="estadoLocal === 'procesado' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-transparent bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100'"
          @click="setEstado('procesado')"
        >
          Procesado
        </button>
        <button
          class="h-9 rounded-lg border px-4 text-sm font-black transition-all"
          :class="estadoLocal === 'invalido' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-transparent bg-rose-50/70 text-rose-700 hover:bg-rose-100'"
          @click="setEstado('invalido')"
        >
          Inválido
        </button>
      </div>
    </div>

    <div class="border-t border-slate-100 px-6 py-5">
      <div class="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <span class="text-sm font-black text-slate-700">Tipo de fecha:</span>
          <div class="flex w-fit rounded-lg bg-slate-100 p-1 shadow-inner">
            <button
              class="h-9 rounded-md px-4 text-sm font-black transition"
              :class="activeDateType === 'none' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
              @click="setDateType('none')"
            >
              Ninguna
            </button>
            <button
              class="h-9 rounded-md px-4 text-sm font-bold transition"
              :class="activeDateType === 'pedido' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
              @click="setDateType('pedido')"
            >
              Pedido Cadena
            </button>
            <button
              class="h-9 rounded-md px-4 text-sm font-bold transition"
              :class="activeDateType === 'embarque' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
              @click="setDateType('embarque')"
            >
              Fin Embarque
            </button>
          </div>

          <div v-show="activeDateType !== 'none'" class="flex items-center gap-2">
            <Input v-model="dateStart" type="date" class="h-9 w-[145px] rounded-lg border-slate-200 text-xs font-semibold" />
            <span class="text-xs font-bold text-slate-400">a</span>
            <Input v-model="dateEnd" type="date" class="h-9 w-[145px] rounded-lg border-slate-200 text-xs font-semibold" />
          </div>
        </div>

        <div class="flex items-center justify-end gap-5">
          <button
            class="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-800"
            @click="clearFilters"
          >
            <i class="fa-regular fa-trash-can text-sm"></i>
            Limpiar filtros
          </button>
          <Button
            class="h-11 rounded-lg bg-brand-500 px-6 text-sm font-black text-white shadow-[0_12px_22px_rgba(217,31,38,0.22)] hover:bg-brand-600"
            @click="applyFilters"
          >
            <i class="fa-solid fa-filter mr-2 text-xs"></i>
            Filtrar
          </Button>
        </div>
      </div>
    </div>
  </section>
</template>
