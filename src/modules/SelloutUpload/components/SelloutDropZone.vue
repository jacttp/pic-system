<script setup lang="ts">
import { computed, ref } from 'vue'
import { StdButton } from '@/modules/Shared/components/std'
import sorianaLogo from '@/assets/chains/soriana.png'
import walmartLogo from '@/assets/chains/walmart.png'
import type { SelloutChain } from '../types/sellout'

interface Props {
  chain: SelloutChain
  file: File | null
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), { disabled: false })
const emit = defineEmits<{
  (event: 'change', file: File | null): void
}>()

const input = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const config = computed(() => props.chain === 'SORIANA'
  ? {
      name: 'Soriana',
      logo: sorianaLogo,
      accept: '.xls,.xlsx',
      format: 'Excel · primera hoja · columnas A:E',
      columns: 'Código Tienda · Código de Barras · Fecha · Venta · Inventario',
      accent: 'border-pic-accent-teal bg-pic-accent-teal-soft text-pic-accent-teal',
    }
  : {
      name: 'Walmart',
      logo: walmartLogo,
      accept: '.txt',
      format: 'TXT · tabulador · sin encabezados',
      columns: 'Fecha · Tienda · Artículo · vacío · Venta · Inventario',
      accent: 'border-pic-accent-blue bg-pic-accent-blue-soft text-pic-accent-blue',
    })

const fileSize = computed(() => {
  if (!props.file) return ''
  return props.file.size >= 1024 * 1024
    ? `${(props.file.size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(props.file.size / 1024)} KB`
})

const selectFile = (files: FileList | null) => {
  const file = files?.[0] || null
  if (file) emit('change', file)
  if (input.value) input.value.value = ''
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  if (!props.disabled) selectFile(event.dataTransfer?.files || null)
}
</script>

<template>
  <article class="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
    <div class="absolute inset-y-0 left-0 w-1" :class="chain === 'SORIANA' ? 'bg-pic-accent-teal' : 'bg-pic-accent-blue'"></div>
    <div class="p-4 sm:p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white p-2 shadow-sm" :class="config.accent">
            <img :src="config.logo" :alt="config.name" class="h-full w-full object-contain">
          </span>
          <div class="min-w-0">
            <p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Cadena destino</p>
            <h3 class="text-base font-black text-slate-950">{{ config.name }}</h3>
          </div>
        </div>
        <span class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-500">
          {{ chain === 'SORIANA' ? 'XLS/XLSX' : 'TXT' }}
        </span>
      </div>

      <button
        type="button"
        class="mt-4 flex min-h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-6 text-center transition"
        :class="isDragging ? config.accent : file ? 'border-pic-brand-border bg-pic-brand-soft' : 'border-slate-200 bg-slate-50/60 hover:border-pic-brand-border hover:bg-pic-brand-soft/60'"
        :disabled="disabled"
        @click="input?.click()"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <input ref="input" type="file" class="hidden" :accept="config.accept" @change="selectFile(($event.target as HTMLInputElement).files)">
        <template v-if="file">
          <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-pic-brand shadow-sm">
            <i class="fa-solid fa-file-circle-check"></i>
          </span>
          <p class="mt-3 max-w-full truncate text-sm font-black text-slate-900">{{ file.name }}</p>
          <p class="mt-1 text-xs font-semibold text-slate-500">{{ fileSize }} · listo para analizar</p>
        </template>
        <template v-else>
          <span class="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm">
            <i class="fa-solid fa-arrow-up-from-bracket"></i>
          </span>
          <p class="mt-3 text-sm font-black text-slate-900">Arrastra el archivo aquí</p>
          <p class="mt-1 text-xs font-semibold text-slate-500">o haz clic para seleccionarlo</p>
        </template>
      </button>

      <div class="mt-4 space-y-1 border-l-2 border-slate-200 pl-3">
        <p class="text-xs font-black text-slate-700">{{ config.format }}</p>
        <p class="text-[11px] font-semibold leading-4 text-slate-500">{{ config.columns }}</p>
      </div>

      <StdButton v-if="file" class="mt-4 w-full" variant="ghost" size="sm" icon="fa-solid fa-xmark" :disabled="disabled" @click="emit('change', null)">
        Quitar archivo
      </StdButton>
    </div>
  </article>
</template>
