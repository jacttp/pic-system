<!-- src/modules/UploadMetas/views/UploadMetasView.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useUploadMetasStore } from '../stores/uploadMetasStore'
import { useToast } from '@/components/ui/toast/use-toast'

import MetasUploadZone from '../components/MetasUploadZone.vue'
import MetasFilters    from '../components/MetasFilters.vue'
import MetasTable      from '../components/MetasTable.vue'

const store = useUploadMetasStore()
const { toast } = useToast()

onMounted(async () => {
  await store.fetchMetas()
})

const onUploadSuccess = (message: string) => {
  toast({
    title:       'Carga exitosa',
    description: message,
    variant:     'default',
  })
}

const onUploadError = (error: string) => {
  toast({
    title:       'Error de carga',
    description: error,
    variant:     'destructive',
  })
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6 h-full bg-slate-50">

    <!-- Header -->
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-bold text-slate-900">
        <i class="fa-solid fa-bullseye text-teal-600 mr-2"></i>
        Carga de Metas
      </h1>
      <p class="text-sm text-slate-500">
        Importa archivos Excel con las metas de ventas y visualiza el histórico registrado.
      </p>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

      <!-- Left column: upload + rules -->
      <div class="lg:col-span-1 flex flex-col gap-4">
        <MetasUploadZone
          @upload-success="onUploadSuccess"
          @upload-error="onUploadError"
        />

        <!-- Info box -->
        <div class="bg-teal-50 border border-teal-100 rounded-lg p-4 mt-auto">
          <h4 class="text-sm font-semibold text-teal-800 mb-2">
            <i class="fa-solid fa-circle-info mr-1"></i> Reglas de Carga
          </h4>
          <ul class="text-xs text-teal-700 space-y-1 list-disc pl-4">
            <li>El Excel debe contener las columnas con los nombres exactos de la tabla.</li>
            <li>
              Columnas requeridas:
              <code class="font-mono bg-teal-100 px-1 rounded">ClienteMuliix, Clientesima, Fecha, Skum, Fact_Kg, Fact_$$, aaa, Meta_Kg</code>
            </li>
            <li>Se omitirán filas con la misma combinación de <strong>Fecha + ClienteMuliix + Skum</strong> (duplicados).</li>
            <li>Las fechas pueden estar como texto ISO o número serial de Excel.</li>
          </ul>
        </div>
      </div>

      <!-- Right column: filters + table -->
      <div class="lg:col-span-2 flex flex-col gap-4 min-h-0">
        <MetasFilters />
        <MetasTable class="flex-1 min-h-0" />
      </div>

    </div>
  </div>
</template>
