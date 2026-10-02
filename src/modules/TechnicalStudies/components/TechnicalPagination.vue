<script setup lang="ts">
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
withDefaults(defineProps<{ page: number; total: number; limit?: number; busy?: boolean }>(), { limit: 20 });
defineEmits<{ change: [page: number] }>();
</script>
<template>
  <div class="ts-pagination ts-actions text-sm">
    <p class="ts-muted">{{ total ? (page - 1) * limit + 1 : 0 }}–{{ Math.min(page * limit, total) }} de {{ total }} resultados</p>
    <nav class="flex items-center gap-2" aria-label="Paginación">
      <StdButton class="ts-button-secondary" size="sm" :disabled="busy || page <= 1" @click="$emit('change', page - 1)">Anterior</StdButton>
      <span class="ts-muted tabular-nums">{{ page }} / {{ Math.max(1, Math.ceil(total / limit)) }}</span>
      <StdButton class="ts-button-secondary" size="sm" :disabled="busy || page * limit >= total" @click="$emit('change', page + 1)">Siguiente</StdButton>
    </nav>
  </div>
</template>
