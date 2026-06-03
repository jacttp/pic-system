<script setup lang="ts">
import { computed } from 'vue'
import { useUploadOcStore } from '../stores/uploadOcStore'

import chedrauiLogo from '@/assets/chains/chedraui.png'
import samsLogo from '@/assets/chains/sams.png'
import sorianaLogo from '@/assets/chains/soriana.png'
import walmartLogo from '@/assets/chains/walmart.png'

const store = useUploadOcStore()

const chains = [
  { id: 'TODAS', name: 'Todas', hint: 'Todas las cadenas', icon: 'fa-solid fa-location-dot', logo: '' },
  { id: 'SORIANA', name: 'Soriana', hint: '', icon: '', logo: sorianaLogo },
  { id: 'SAMS', name: "Sam's", hint: '', icon: '', logo: samsLogo },
  { id: 'WALMART', name: 'Walmart', hint: '', icon: '', logo: walmartLogo },
  { id: 'CHEDRAUI', name: 'Chedraui', hint: '', icon: '', logo: chedrauiLogo },
]

const activeTab = computed(() => store.filters.cadenas[0] || 'TODAS')

const selectTab = async (chain: string) => {
  await store.setChainFilter(chain)
}
</script>

<template>
  <div class="flex w-full items-center gap-3 overflow-x-auto pb-1 xl:w-auto">
    <button
      v-for="chain in chains"
      :key="chain.id"
      class="group flex h-[68px] min-w-[150px] items-center gap-3 rounded-xl border bg-white px-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]"
      :class="activeTab === chain.id
        ? 'border-brand-200 bg-brand-50/20 shadow-[0_12px_25px_rgba(217,31,38,0.08)]'
        : 'border-slate-200 shadow-[0_8px_20px_rgba(15,23,42,0.04)]'"
      @click="selectTab(chain.id)"
    >
      <span
        v-if="chain.icon"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl text-brand-500"
      >
        <i :class="chain.icon"></i>
      </span>
      <span
        v-else
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white p-1.5 shadow-sm"
      >
        <img :src="chain.logo" :alt="chain.name" class="h-full w-full object-contain" />
      </span>

      <span class="min-w-0">
        <span class="block truncate text-sm font-black text-slate-950">{{ chain.name }}</span>
        <span v-if="chain.hint" class="mt-0.5 block text-[11px] font-semibold text-slate-500">
          {{ chain.hint }}
        </span>
      </span>
    </button>
  </div>
</template>
