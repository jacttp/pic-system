<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useUploadOcStore } from '../stores/uploadOcStore'

import chedrauiLogo from '@/assets/chains/chedraui.png'
import samsLogo from '@/assets/chains/sams.png'
import sorianaLogo from '@/assets/chains/soriana.png'
import walmartLogo from '@/assets/chains/walmart.png'

const store = useUploadOcStore()
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const selectedChain = ref('SORIANA')

const logos: Record<string, string> = {
  SORIANA: sorianaLogo,
  WALMART: walmartLogo,
  CHEDRAUI: chedrauiLogo,
  SAMS: samsLogo,
}

const isReadOnlyChain = computed(() => {
  const activeChain = store.filters.cadenas[0]
  return !!activeChain && !['SORIANA', 'SAMS', 'WALMART'].includes(activeChain)
})

const targetChain = computed(() => {
  const activeChain = store.filters.cadenas[0]
  if (activeChain === 'SORIANA') return activeChain
  if (activeChain && ['SAMS', 'WALMART'].includes(activeChain)) return 'GW'
  return selectedChain.value
})

const activeChainName = computed(() => {
  const chain = targetChain.value.toUpperCase()
  if (chain === 'GW') return "Walmart / Sam's"
  if (chain === 'SAMS') return "Sam's"
  return chain.charAt(0) + chain.slice(1).toLowerCase()
})

const currentLogo = computed(() => {
  const activeChain = store.filters.cadenas[0]
  if (targetChain.value === 'GW') return activeChain === 'SAMS' ? samsLogo : walmartLogo
  return logos[targetChain.value] || sorianaLogo
})

const readOnlyLogo = computed(() => logos[store.filters.cadenas[0] || 'CHEDRAUI'] || chedrauiLogo)
const acceptsInf = computed(() => targetChain.value === 'GW')
const acceptedExtensions = computed(() => acceptsInf.value ? '.inf' : '.xlsx, .xls')
const formatBadges = computed(() => acceptsInf.value ? ['INF', 'CSV'] : ['XLSX', 'XLS', 'CSV'])

const emit = defineEmits<{
  (e: 'upload-success', message: string): void
  (e: 'upload-error', error: string): void
}>()

const handleDrop = async (event: DragEvent) => {
  isDragging.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  await processFiles(files)
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  await processFiles(files)
  if (fileInput.value) fileInput.value.value = ''
}

const processFiles = async (files: File[]) => {
  const validFiles = files.filter(file => {
    const name = file.name.toLowerCase()
    return acceptsInf.value ? name.endsWith('.inf') : name.endsWith('.xlsx') || name.endsWith('.xls')
  })

  if (validFiles.length === 0) {
    emit('upload-error', acceptsInf.value ? 'Por favor, selecciona solo archivos .INF' : 'Por favor, selecciona solo archivos Excel (.xlsx, .xls)')
    return
  }

  try {
    await store.uploadBatch(validFiles, targetChain.value)
    emit('upload-success', store.uploadStats.message)
  } catch (error: any) {
    emit('upload-error', error.message || 'Error al procesar los archivos.')
  }
}
</script>

<template>
  <section class="shrink-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_35px_rgba(15,23,42,0.04)] 2xl:p-5">
    <div class="mb-3 flex items-center gap-3 text-slate-950">
      <span class="font-black">1.</span>
      <h2 class="text-base font-black">Subir archivos</h2>
    </div>

    <div
      v-if="isReadOnlyChain"
      class="flex min-h-[285px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center 2xl:min-h-[340px] 2xl:px-6"
    >
      <div class="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <img :src="readOnlyLogo" :alt="store.filters.cadenas[0]" class="h-full w-full object-contain" />
      </div>
      <h3 class="text-lg font-black text-slate-900">Carga pendiente de configurar</h3>
      <p class="mt-2 max-w-[260px] text-sm font-medium leading-relaxed text-slate-500">
        La carga manual para esta cadena todavía no está disponible en este módulo.
      </p>
      <span class="mt-5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
        Pendiente de configuración
      </span>
    </div>

    <div
      v-else
      class="group flex min-h-[285px] cursor-pointer flex-col items-center rounded-xl border border-dashed px-5 py-4 text-center transition-all duration-200 2xl:min-h-[340px] 2xl:px-6 2xl:py-5"
      :class="isDragging
        ? 'border-brand-400 bg-brand-50/70 shadow-inner'
        : 'border-brand-200 bg-white hover:border-brand-300 hover:bg-brand-50/20'"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="fileInput?.click()"
    >
      <input
        ref="fileInput"
        type="file"
        multiple
        :accept="acceptedExtensions"
        class="hidden"
        @change="handleFileSelect"
      />

      <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 transition-transform duration-200 group-hover:scale-105 2xl:h-14 2xl:w-14">
        <i class="fa-solid fa-file-arrow-up text-xl 2xl:text-2xl"></i>
      </div>

      <h3 class="text-sm font-black text-slate-950 2xl:text-base">Arrastra y suelta tus archivos aquí</h3>
      <p class="mt-1 text-sm font-medium text-slate-500">o haz clic para explorar en tu equipo</p>

      <p class="mt-3 text-sm font-semibold text-slate-500">Formatos permitidos</p>
      <div class="mt-2 flex flex-wrap justify-center gap-2 2xl:mt-3 2xl:gap-3">
        <span
          v-for="format in formatBadges"
          :key="format"
          class="inline-flex h-8 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-800 2xl:h-9 2xl:text-sm"
        >
          <i class="fa-solid fa-file-excel text-lg text-emerald-600"></i>
          {{ format }}
        </span>
      </div>

      <div class="mt-4 w-full max-w-[260px]" @click.stop>
        <label class="mb-2 block text-sm font-black text-slate-700">Cadena destino</label>
        <div class="relative">
          <img :src="currentLogo" :alt="activeChainName" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 object-contain" />
          <select
            v-if="!store.filters.cadenas[0]"
            v-model="selectedChain"
            class="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-12 pr-10 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100 2xl:h-11"
          >
            <option value="SORIANA">Soriana</option>
            <option value="GW">Walmart / Sam's</option>
          </select>
          <div
            v-else
            class="flex h-10 w-full items-center rounded-lg border border-slate-200 bg-white pl-12 pr-10 text-sm font-bold text-slate-800 shadow-sm 2xl:h-11"
          >
            {{ activeChainName }}
          </div>
          <i class="fa-solid fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500"></i>
        </div>
      </div>

      <Button
        class="mt-3 h-10 w-full max-w-[260px] rounded-lg bg-brand-500 text-sm font-black text-white shadow-[0_12px_22px_rgba(217,31,38,0.22)] hover:bg-brand-600 2xl:h-11"
        :disabled="store.isUploading"
        @click.stop="fileInput?.click()"
      >
        <span v-if="store.isUploading">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i>
          Procesando...
        </span>
        <span v-else>Seleccionar archivos</span>
      </Button>

      <p class="mt-3 text-xs font-semibold text-slate-500 2xl:text-sm">Máx. 50 MB por archivo</p>
    </div>
  </section>
</template>
