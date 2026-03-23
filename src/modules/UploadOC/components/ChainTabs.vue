// src/modules/UploadOC/components/ChainTabs.vue
<script setup lang="ts">
import { ref } from 'vue'
import { useUploadOcStore } from '../stores/uploadOcStore'
import { Button } from '@/components/ui/button'

const store = useUploadOcStore()

// Cadenas disponibles. Podría venir del backend en un futuro.
const chains = ['TODAS', 'SORIANA', 'WALMART', 'CHEDRAUI']
const activeTab = ref('TODAS')

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
      class="min-w-[100px]"
      @click="selectTab(chain)"
    >
      {{ chain }}
    </Button>
  </div>
</template>
