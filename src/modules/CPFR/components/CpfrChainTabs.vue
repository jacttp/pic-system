<script setup lang="ts">
import { computed } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'

import samsLogo from '@/assets/chains/sams.png'
import sorianaLogo from '@/assets/chains/soriana.png'
import chedrauiLogo from '@/assets/chains/chedraui.png'
import walmartLogo from '@/assets/chains/walmart.png'

const store = useCpfrStore()
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

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
  <div class="flex items-center gap-2 overflow-x-auto" :class="compact ? 'w-max' : 'w-full pb-1 lg:w-auto'">
    <button
      v-for="chain in chains"
      :key="chain.id"
      class="group flex shrink-0 items-center border bg-white text-left transition-all duration-200 hover:border-brand-200 disabled:cursor-wait disabled:opacity-70"
      :class="[compact
        ? 'h-8 gap-1.5 rounded-lg px-2'
        : 'h-[54px] min-w-[132px] gap-3 rounded-xl px-3.5 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]', activeChain === chain.id
        ? 'border-brand-500 bg-brand-50/30 shadow-[0_10px_22px_rgba(217,31,38,0.08)]'
        : 'border-slate-300 shadow-[0_8px_18px_rgba(15,23,42,0.04)]']"
      :disabled="store.loading && activeChain !== chain.id"
      @click="selectChain(chain.id)"
    >
      <span class="flex shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white shadow-sm" :class="compact ? 'h-5 w-5 p-0.5' : 'h-8 w-8 p-1.5'">
        <img :src="chain.logo" :alt="chain.name" class="h-full w-full object-contain" />
      </span>

      <span class="min-w-0 leading-tight">
        <span class="block truncate font-black text-slate-900" :class="compact ? 'text-[11px]' : 'text-[13px]'">{{ chain.name }}</span>
        <span v-if="!compact" class="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {{ chain.hint }}
        </span>
      </span>
    </button>
  </div>
</template>
