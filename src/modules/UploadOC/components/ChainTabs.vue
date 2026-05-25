// src/modules/UploadOC/components/ChainTabs.vue
<script setup lang="ts">
import { ref } from 'vue'
import { useUploadOcStore } from '../stores/uploadOcStore'
import { Button } from '@/components/ui/button'

// Import logos from assets
import todasLogo from '@/assets/chains/todas.svg'
import samsLogo from '@/assets/chains/sams.svg'
import sorianaLogo from '@/assets/chains/soriana.svg'
import walmartLogo from '@/assets/chains/walmart.svg'
import chedrauiLogo from '@/assets/chains/chedraui.svg'

const store = useUploadOcStore()

// Cadenas disponibles. Podría venir del backend en un futuro.
const chains = ['TODAS', 'SORIANA', 'SAMS', 'WALMART', 'CHEDRAUI' ]
const activeTab = ref('TODAS')

// Mapeo de logos
const logos: Record<string, string> = {
  TODAS: todasLogo,
  SORIANA: sorianaLogo,
  SAMS: samsLogo,
  WALMART: walmartLogo,
  CHEDRAUI: chedrauiLogo
  
}

// Nombres legibles para mostrar en la interfaz
const displayNames: Record<string, string> = {
  TODAS: 'Todas',
  SORIANA: 'Soriana',
  SAMS: "Sam's",
  WALMART: 'Walmart',
  CHEDRAUI: 'Chedraui'
  
}

const selectTab = async (chain: string) => {
  activeTab.value = chain
  await store.setChainFilter(chain)
}
</script>

<template>
  <div class="flex items-center gap-2 overflow-x-auto pb-2">
    <Button
      v-for="chain in chains"
      :key="chain"
      :variant="activeTab === chain ? 'default' : 'outline'"
      size="sm"
      class="min-w-[110px] flex items-center justify-center gap-2 px-3 py-1.5 transition-all duration-200 shadow-sm"
      @click="selectTab(chain)"
    >
      <img :src="logos[chain]" :alt="chain" class="w-4 h-4 object-contain rounded-sm" />
      <span class="font-medium">{{ displayNames[chain] }}</span>
    </Button>
  </div>
</template>





