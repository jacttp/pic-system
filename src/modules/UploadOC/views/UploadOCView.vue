// src/modules/UploadOC/views/UploadOCView.vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useUploadOcStore } from '../stores/uploadOcStore'
// Importa toast de Shadcn (asegúrate de tener el Toaster configurado en tu App.vue)
import { useToast } from '@/components/ui/toast/use-toast' 

import UploadZone from '../components/UploadZone.vue'
import ChainTabs from '../components/ChainTabs.vue'
import OrdersTable from '../components/OrdersTable.vue'
import OrderFilters from '../components/OrderFilters.vue'

const store = useUploadOcStore()
const { toast } = useToast()

onMounted(async () => {
  await store.fetchOrders()
})

const onUploadSuccess = (message: string) => {
  toast({
    title: 'Carga exitosa',
    description: message,
    variant: 'default',
  })
}

const onUploadError = (error: string) => {
  toast({
    title: 'Error de carga',
    description: error,
    variant: 'destructive',
  })
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6 h-full bg-slate-50">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-bold text-slate-900">Carga de Órdenes de Compra</h1>
      <p class="text-sm text-slate-500">
        Importa archivos Excel de clientes y visualiza el historial normalizado.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
      
      <div class="lg:col-span-1 flex flex-col gap-4">
        <UploadZone 
          @upload-success="onUploadSuccess" 
          @upload-error="onUploadError" 
        />
        
        <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-auto">
          <h4 class="text-sm font-semibold text-blue-800 mb-2">
            <i class="fa-solid fa-circle-info mr-1"></i> Reglas de Carga
          </h4>
          <ul class="text-xs text-blue-700 space-y-1 list-disc pl-4">
            <li>El procesamiento se realiza en tu navegador para mayor velocidad.</li>
            <li>Se ignorarán los registros que compartan el mismo Número de Pedido, Cadena y SKU (Duplicados).</li>
          </ul>
        </div>
      </div>

      <div class="lg:col-span-2 flex flex-col gap-4 min-h-0">
        <ChainTabs />
        <OrderFilters />
        <OrdersTable />
      </div>

    </div>
  </div>
</template>