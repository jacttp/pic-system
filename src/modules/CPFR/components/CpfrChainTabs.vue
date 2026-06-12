<script setup lang="ts">
import { computed } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'

import samsLogo from '@/assets/chains/sams.png'
import sorianaLogo from '@/assets/chains/soriana.png'
import chedrauiLogo from '@/assets/chains/chedraui.png'
import walmartLogo from '@/assets/chains/walmart.png'

const store = useCpfrStore()

const chains = [
  { id: 'SORIANA', name: 'Soriana', hint: '', logo: sorianaLogo },
  { id: 'SAMS', name: "Sam's", hint: '', logo: samsLogo },
  { id: 'WALMART', name: "Walmart", hint: '', logo: walmartLogo },
  { id: 'CHEDRAUI', name: "Chedraui", hint: '', logo: chedrauiLogo },
]

const activeChain = computed(() => store.nom_cadena.toUpperCase())

function selectChain(chain: string) {
  store.setNomCadena(chain)
}
</script>

<template>
  <div class="flex w-full items-center gap-2 overflow-x-auto pb-1 lg:w-auto">
    <button
      v-for="chain in chains"
      :key="chain.id"
      class="group flex h-[54px] min-w-[132px] items-center gap-3 rounded-xl border bg-white px-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)] disabled:cursor-wait disabled:opacity-70"
      :class="activeChain === chain.id
        ? 'border-brand-200 bg-brand-50/30 shadow-[0_10px_22px_rgba(217,31,38,0.08)]'
        : 'border-slate-200 shadow-[0_8px_18px_rgba(15,23,42,0.04)]'"
      :disabled="store.loading && activeChain !== chain.id"
      @click="selectChain(chain.id)"
    >
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white p-1.5 shadow-sm">
        <img :src="chain.logo" :alt="chain.name" class="h-full w-full object-contain" />
      </span>

      <span class="min-w-0 leading-tight">
        <span class="block truncate text-[13px] font-black text-slate-900">{{ chain.name }}</span>
        <span class="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {{ chain.hint }}
        </span>
      </span>
    </button>
  </div>
</template>
