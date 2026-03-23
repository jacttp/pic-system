<script setup lang="ts">
// src/modules/CPFR/components/CpfrUploadModal.vue
// Modal para subir OC .xls de Soriana — POST /api/cpfr/upload-oc
import { ref } from 'vue'
import { cpfrApi } from '../services/cpfrApi'
import type { CpfrUploadOCResponse } from '../types/cpfrTypes'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'uploaded'): void
}>()

const fileInput  = ref<HTMLInputElement | null>(null)
const file       = ref<File | null>(null)
const loading    = ref(false)
const result     = ref<CpfrUploadOCResponse | null>(null)
const errorMsg   = ref('')
const nomCadena  = ref('soriana')

function onFileChange(e: Event) {
  const el = e.target as HTMLInputElement
  file.value = el.files?.[0] ?? null
  result.value = null
  errorMsg.value = ''
}

function clearFile() {
  file.value = null
  result.value = null
  errorMsg.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function upload() {
  if (!file.value) { errorMsg.value = 'Selecciona un archivo .xls'; return }
  loading.value = true
  errorMsg.value = ''
  result.value = null
  try {
    result.value = await cpfrApi.uploadOC(file.value, nomCadena.value)
    emit('uploaded')
  } catch (e: any) {
    if (e?.response?.status === 404) {
      errorMsg.value = 'La tienda no tiene configuración en config_pedidos (404).'
    } else {
      errorMsg.value = e?.response?.data?.message ?? 'Error al subir el archivo.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <!-- Modal card -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-file-arrow-up text-indigo-500"></i>
          <h2 class="text-sm font-bold text-slate-800">Subir OC Soriana (.xls)</h2>
        </div>
        <button class="text-slate-300 hover:text-slate-500 transition-colors" @click="emit('close')">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-4">

        <!-- Drop zone / file pick -->
        <div
          class="relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors"
          :class="file ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30'"
          @click="fileInput?.click()"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".xls,.xlsx"
            class="hidden"
            @change="onFileChange"
          />

          <template v-if="!file">
            <i class="fa-solid fa-file-excel text-3xl text-slate-300"></i>
            <p class="text-sm font-medium text-slate-500">Haz clic para seleccionar el archivo .xls</p>
            <p class="text-[11px] text-slate-300">Un archivo = una tienda</p>
          </template>

          <template v-else>
            <i class="fa-solid fa-file-excel text-3xl text-emerald-400"></i>
            <p class="text-sm font-semibold text-slate-700 text-center break-all">{{ file.name }}</p>
            <p class="text-[11px] text-slate-400">{{ (file.size / 1024).toFixed(1) }} KB</p>
            <button
              class="absolute top-2 right-2 text-slate-300 hover:text-slate-500 transition-colors"
              @click.stop="clearFile"
            >
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </template>
        </div>

        <!-- Cadena selector -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-600">Cadena</label>
          <select
            v-model="nomCadena"
            class="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="soriana">Soriana</option>
          </select>
        </div>

        <!-- Nota informativa -->
        <p class="text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
          <i class="fa-solid fa-circle-info mr-1 text-indigo-300"></i>
          Las OC previas <strong>pendientes</strong> de esa tienda se marcarán como
          <span class="font-semibold text-amber-600">reemplazado</span> automáticamente.
          Las filas con <code class="bg-slate-200 px-1 rounded text-[10px]">Cant. Pedida = 0</code> serán omitidas.
        </p>

        <!-- Error -->
        <div v-if="errorMsg" class="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
          <i class="fa-solid fa-circle-exclamation text-rose-500 mt-0.5 shrink-0"></i>
          <p class="text-xs text-rose-600">{{ errorMsg }}</p>
        </div>

        <!-- Resultado OK -->
        <div v-if="result" class="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 space-y-2">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-circle-check text-emerald-500"></i>
            <p class="text-sm font-semibold text-emerald-700">Carga exitosa</p>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-1">
            <div class="bg-white rounded px-2.5 py-1.5 border border-slate-100">
              <p class="text-[10px] uppercase tracking-widest text-slate-400">Filas insertadas</p>
              <p class="font-bold text-emerald-600 text-lg">{{ result.inserted }}</p>
            </div>
            <div class="bg-white rounded px-2.5 py-1.5 border border-slate-100">
              <p class="text-[10px] uppercase tracking-widest text-slate-400">Filas omitidas</p>
              <p class="font-bold text-slate-700 text-lg">{{ result.skipped }}</p>
            </div>
          </div>
          <div class="text-[11px] text-slate-500">
            <span class="font-medium">Cliente:</span> {{ result.id_cliente }} ·
            <span class="font-medium">Pedido:</span> {{ result.num_pedido }} ·
            <span class="font-medium">Fecha:</span> {{ result.fec_pedido_cadena }}
          </div>
          <!-- Skipped detail -->
          <div v-if="result.skipped_detail.length" class="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
            <p class="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">Filas omitidas</p>
            <ul class="space-y-0.5">
              <li v-for="(s, i) in result.skipped_detail" :key="i" class="text-[11px] text-amber-700 flex items-start gap-1.5">
                <i class="fa-solid fa-minus text-[8px] text-amber-400 mt-1 shrink-0"></i>
                <span>
                  Fila {{ s.row }}<template v-if="s.sku_cadena"> · <code class="bg-amber-100 px-0.5 rounded text-[10px]">{{ s.sku_cadena }}</code></template> · {{ s.reason }}
                </span>
              </li>
            </ul>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100">
        <button
          class="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          @click="emit('close')"
        >
          {{ result ? 'Cerrar' : 'Cancelar' }}
        </button>
        <button
          v-if="!result"
          class="px-5 py-2 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2"
          :class="loading || !file ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'"
          :disabled="loading || !file"
          @click="upload"
        >
          <i :class="loading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-upload'"></i>
          {{ loading ? 'Subiendo...' : 'Subir OC' }}
        </button>
      </div>

    </div>
  </div>
</template>
