<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/components/ui/toast/use-toast'
import { StdAlert, StdButton, StdPageHeader, StdSection } from '@/modules/Shared/components/std'
import { useSelloutStore } from '../stores/selloutStore'
import SelloutDropZone from '../components/SelloutDropZone.vue'
import SelloutPreview from '../components/SelloutPreview.vue'
import SelloutHistory from '../components/SelloutHistory.vue'
import type { SelloutChain } from '../types/sellout'

const store = useSelloutStore()
const { files, previewData, lastCommit, isPreviewing, isCommitting, error, hasFiles } = storeToRefs(store)
const { toast } = useToast()

const selectedYear = ref(store.year)
const selectedMonth = ref(store.month)
const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

onMounted(() => store.fetchHistory())

const updatePeriod = () => store.setPeriod(Number(selectedYear.value), Number(selectedMonth.value))
const updateFile = (chain: SelloutChain, file: File | null) => store.setFile(chain, file)

const analyze = async () => {
  try {
    await store.preview()
    toast({ title: 'Archivos analizados', description: 'Revisa el manifiesto antes de confirmar el reemplazo.' })
  } catch {
    toast({ title: 'No fue posible analizar', description: store.error, variant: 'destructive' })
  }
}

const commit = async () => {
  try {
    await store.commit()
    toast({ title: 'Carga sellout completada', description: 'El periodo fue reemplazado y el historial quedó actualizado.' })
  } catch {
    toast({ title: 'Carga no aplicada', description: store.error, variant: 'destructive' })
  }
}
</script>

<template>
  <main class="min-h-full bg-slate-100 px-4 py-5 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-[1500px] space-y-5">
      <StdPageHeader
        eyebrow="Gestión / Sellout"
        title="Carga Sellout"
        description="Transforma y reemplaza el movimiento mensual reportado por Soriana y Walmart con las reglas operativas vigentes."
        icon="fa-solid fa-file-import"
        meta="Reemplazo transaccional"
      />

      <StdAlert
        v-if="error"
        tone="danger"
        title="La operación requiere atención"
        :description="error"
      />

      <StdAlert
        v-if="lastCommit"
        tone="success"
        title="Periodo actualizado correctamente"
        :description="`Lote ${lastCommit.batchId.slice(0, 8)} · ${lastCommit.chains.reduce((sum, item) => sum + item.insertedRows, 0).toLocaleString('es-MX')} registros insertados.`"
      />

      <StdSection
        eyebrow="Paso 1"
        title="Preparar carga"
        description="Selecciona el periodo que se limpiará y agrega uno o ambos archivos de cadena."
        icon="fa-solid fa-box-open"
      >
        <div class="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[180px_minmax(220px,1fr)_auto] sm:items-end">
          <label>
            <span class="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Año</span>
            <input v-model.number="selectedYear" type="number" min="2000" max="2100" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 outline-none focus:border-pic-brand-border focus:ring-2 focus:ring-pic-brand-border" @change="updatePeriod">
          </label>
          <label>
            <span class="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Mes a reemplazar</span>
            <select v-model.number="selectedMonth" class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 outline-none focus:border-pic-brand-border focus:ring-2 focus:ring-pic-brand-border" @change="updatePeriod">
              <option v-for="(month, index) in months" :key="month" :value="index + 1">{{ month }}</option>
            </select>
          </label>
          <div class="flex h-10 items-center rounded-xl bg-slate-900 px-4 text-xs font-black text-white">
            <span class="mr-2 flex h-5 w-5 items-center justify-center rounded-md bg-white/10 text-[10px]">{{ String(selectedMonth).padStart(2, '0') }}</span>
            {{ selectedYear }}
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SelloutDropZone chain="SORIANA" :file="files.SORIANA" :disabled="isPreviewing || isCommitting" @change="updateFile('SORIANA', $event)" />
          <SelloutDropZone chain="WALMART" :file="files.WALMART" :disabled="isPreviewing || isCommitting" @change="updateFile('WALMART', $event)" />
        </div>

        <div class="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs font-semibold leading-5 text-slate-500">
            Los archivos se analizan en el servidor y no se almacenan. Límite: 25 MB por archivo.
          </p>
          <StdButton variant="primary" icon="fa-solid fa-magnifying-glass-chart" :disabled="!hasFiles || isPreviewing || isCommitting" @click="analyze">
            {{ isPreviewing ? 'Analizando archivos...' : 'Analizar selección' }}
          </StdButton>
        </div>
      </StdSection>

      <SelloutPreview v-if="previewData" :preview="previewData" :committing="isCommitting" @confirm="commit" />

      <SelloutHistory />
    </div>
  </main>
</template>
