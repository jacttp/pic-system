<script setup lang="ts">
// src/modules/CPFR/components/CpfrCriteriaPanel.vue
import { ref } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'

const store = useCpfrStore()
const activeTab = ref<'sku' | 'tienda'>('sku')

function getSkuValue(sku: string): number {
  return store.skuCriteria[sku] ?? 2.5
}

function onSkuInput(sku: string, e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(val) && val >= 0) store.setSkuCriteria(sku, val)
}

function getStoreValue(id: string): string {
  return store.storeCriteria[id] !== undefined ? String(store.storeCriteria[id]) : ''
}

function onStoreInput(id: string, e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(val) && val >= 0) {
    store.setStoreCriteria(id, val)
  } else {
    delete store.storeCriteria[id]
  }
}
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

    <!-- Header con tabs -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
      <div class="flex gap-1">
        <button
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          :class="activeTab === 'sku' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'"
          @click="activeTab = 'sku'"
        >
          <i class="fa-solid fa-box mr-1.5"></i>Por SKU
        </button>
        <button
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          :class="activeTab === 'tienda' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'"
          @click="activeTab = 'tienda'"
        >
          <i class="fa-solid fa-store mr-1.5"></i>Por Tienda
        </button>
      </div>
      <button
        class="text-[10px] text-slate-400 hover:text-rose-500 transition-colors font-medium"
        @click="store.resetCriteria()"
      >
        <i class="fa-solid fa-rotate-left mr-1"></i>Reset
      </button>
    </div>

    <!-- SKU Criteria -->
    <div v-if="activeTab === 'sku'" class="max-h-64 overflow-y-auto p-3 space-y-1.5">
      <div
        v-for="sku in store.uniqueSkus"
        :key="sku"
        class="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <span class="text-xs text-slate-600 truncate flex-1" :title="sku">{{ sku }}</span>
        <input
          type="number"
          step="0.5"
          min="0"
          :value="getSkuValue(sku)"
          class="w-16 h-7 rounded-md border border-slate-200 text-xs text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          @input="onSkuInput(sku, $event)"
        />
      </div>
    </div>

    <!-- Store Criteria -->
    <div v-if="activeTab === 'tienda'" class="max-h-64 overflow-y-auto p-3 space-y-1.5">
      <p class="text-[10px] text-slate-400 px-2 mb-2">Vacío = usa criterio global del SKU</p>
      <div
        v-for="t in store.uniqueTiendas"
        :key="t.id"
        class="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <span class="text-xs text-slate-600 truncate flex-1" :title="t.nombre">{{ t.nombre }}</span>
        <input
          type="number"
          step="0.5"
          min="0"
          placeholder="Global"
          :value="getStoreValue(t.id)"
          class="w-16 h-7 rounded-md border border-slate-200 text-xs text-center text-slate-500 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          @input="onStoreInput(t.id, $event)"
        />
      </div>
    </div>

  </div>
</template>